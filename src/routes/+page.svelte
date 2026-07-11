<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import { browser } from "$app/environment";
	import { stationCoordinates, routes, realStationIds } from "$lib/mapData";
	import { point, multiLineString } from "@turf/helpers";
	import nearestPointOnLine from "@turf/nearest-point-on-line";

	// Types
	interface Station {
		id: string;
		name: string;
		type: string;
	}

	interface Train {
		id: string;
		line: string;
		destination: string;
		scheduled_time: string; // HH:mm
		estimated_minutes: number;
		status: "arrived" | "boarding_soon" | "upcoming";
	}

	// Timezone helper
	const getJakartaTime = () => {
		const raw = new Date();
		return new Date(
			raw.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
		);
	};

	// State
	let stations: Station[] = $state([]);
	let selectedStationId: string | null = $state(null);
	let trains: Train[] = $state([]);
	let lastUpdated: Date | null = $state(null);
	let isLoading: boolean = $state(true);
	let activeTab: "schedule" | "map" = $state("schedule");
	let showCopyright: boolean = $state(false);

	// Dark Mode State
	let isDarkMode: boolean = $state(false);

	const toggleDarkMode = () => {
		isDarkMode = !isDarkMode;
		if (isDarkMode) {
			document.documentElement.classList.add("dark");
			localStorage.setItem("color-theme", "dark");
			if (mapObj && lightLayer && darkLayer) {
				mapObj.removeLayer(lightLayer);
				darkLayer.addTo(mapObj);
			}
		} else {
			document.documentElement.classList.remove("dark");
			localStorage.setItem("color-theme", "light");
			if (mapObj && lightLayer && darkLayer) {
				mapObj.removeLayer(darkLayer);
				lightLayer.addTo(mapObj);
			}
		}
	};

	// Active Trains State
	let activeTrains: any[] = $state([]);
	let trainMarkers: Record<string, any> = {}; // Leaflet markers
	let pendingFlyToTrainId: string | null = null;
	let skipStationFly = false;

	// Timers
	let fetchTimer: ReturnType<typeof setInterval>;
	let countdownTimer: ReturnType<typeof setInterval>;
	let activeTrainsTimer: ReturnType<typeof setInterval>;
	let now = $state(getJakartaTime());

	// Map State
	let mapElement: HTMLElement;
	let L: any;
	let mapObj: any;
	let lightLayer: any;
	let darkLayer: any;
	let trackMultiLineStringCL: any = null; // For CL turf snapping
	let trackMultiLineStringMRT: any = null; // For MRT turf snapping
	let allStationCoords: Record<string, [number, number]> = $state({}); // Map of ID -> [lat, lng]
	let isMapReady = $state(false);

	// Search Dropdown State
	let searchQuery = $state("");
	let dropdownOpen = $state(false);

	let filteredStations = $derived(
		stations.filter(
			(s) =>
				s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				s.id.toLowerCase().includes(searchQuery.toLowerCase()),
		),
	);

	let filteredTrainsList = $derived(
		trains.filter(
			(train) =>
				train.status === "arrived" ||
				activeTrains.some((t) => t.id === train.id),
		),
	);

	// Colors for lines
	const lineColors: Record<string, string> = {
		BOGOR: "bg-red-500 text-white",
		CIKARANG: "bg-blue-500 text-white",
		RANGKASBITUNG: "bg-green-600 text-white",
		TANGERANG: "bg-yellow-700 text-white",
		MRT: "bg-blue-800 text-white",
	};

	const fetchStations = async () => {
		try {
			const res = await fetch("/api/stations");
			const data = await res.json();
			if (data.status === "success") {
				stations = data.data;
				const current = stations.find(
					(s) => s.id === selectedStationId,
				);
				if (current) searchQuery = current.name;
			}
		} catch (error) {
			console.error("Failed to fetch stations:", error);
		}
	};

	const fetchTrains = async () => {
		if (!selectedStationId) return;
		isLoading = true;
		try {
			const res = await fetch(
				`/api/trains?stationId=${selectedStationId}`,
			);
			const data = await res.json();
			if (data.status === "success") {
				trains = data.data.trains;
				lastUpdated = new Date(data.data.last_updated);
			}
		} catch (error) {
			console.error("Failed to fetch trains:", error);
		} finally {
			isLoading = false;
		}
	};

	const fetchActiveTrains = async () => {
		try {
			const res = await fetch("/api/active-trains");
			const data = await res.json();
			if (data.status === "success") {
				activeTrains = data.data;
				updateTrainMarkers();
			}
		} catch (error) {
			console.error("Failed to fetch active trains:", error);
		}
	};

	const updateTrainMarkers = () => {
		if (!L || (!trackMultiLineStringCL && !trackMultiLineStringMRT)) return;

		const currentTrainIds = new Set(activeTrains.map((t) => t.id));

		// Remove old markers
		Object.keys(trainMarkers).forEach((id) => {
			if (!currentTrainIds.has(id)) {
				trainMarkers[id].remove();
				delete trainMarkers[id];
			}
		});

		// Update or create markers
		activeTrains.forEach((train) => {
			const fromCoord = allStationCoords[train.fromStation];
			const toCoord = allStationCoords[train.toStation];

			if (!fromCoord || !toCoord) return;

			// 1. Straight line interpolation
			const lat =
				fromCoord[0] + (toCoord[0] - fromCoord[0]) * train.progress;
			const lng =
				fromCoord[1] + (toCoord[1] - fromCoord[1]) * train.progress;

			// 2. Snap to track line using Turf.js
			// turf uses [lng, lat] order!
			const pt = point([lng, lat]);
			let targetTrack =
				train.line === "MRT"
					? trackMultiLineStringMRT
					: trackMultiLineStringCL;
			if (!targetTrack)
				targetTrack = trackMultiLineStringCL || trackMultiLineStringMRT;

			const snapped = nearestPointOnLine(targetTrack, pt);
			const finalCoord: [number, number] = [
				snapped.geometry.coordinates[1],
				snapped.geometry.coordinates[0],
			];

			if (trainMarkers[train.id]) {
				// Update existing
				trainMarkers[train.id].setLatLng(finalCoord);
				trainMarkers[train.id]
					.getPopup()
					.setContent(
						`<b>KA ${train.id}</b><br/>Tujuan: ${train.destination}<br/>Jalur: ${train.line}<br/><i>${train.fromStation} &rarr; ${train.toStation}</i>`,
					);
			} else {
				// Create new
				const colorClass =
					lineColors[train.line] || "bg-slate-500 text-white";
				const colorHex = colorClass.includes("red")
					? "#EF4444"
					: colorClass.includes("blue")
						? "#3B82F6"
						: colorClass.includes("green")
							? "#16A34A"
							: colorClass.includes("yellow")
								? "#A16207"
								: colorClass.includes("pink")
									? "#DB2777"
									: "#64748b";

				const marker = L.circleMarker(finalCoord, {
					radius: 5,
					fillColor: colorHex,
					color: "#ffffff",
					weight: 2,
					opacity: 1,
					fillOpacity: 1,
				})
					.addTo(L._mapInstance)
					.bindPopup(
						`<b>KA ${train.id}</b><br/>Tujuan: ${train.destination}<br/>Jalur: ${train.line}<br/><i>${train.fromStation} &rarr; ${train.toStation}</i>`,
					);

				trainMarkers[train.id] = marker;
			}
		});

		if (
			pendingFlyToTrainId &&
			trainMarkers[pendingFlyToTrainId] &&
			L &&
			L._mapInstance
		) {
			const marker = trainMarkers[pendingFlyToTrainId];
			setTimeout(() => {
				L._mapInstance.invalidateSize();
				L._mapInstance.flyTo(marker.getLatLng(), 16, {
					animate: true,
					duration: 1.5,
				});
				marker.openPopup();
			}, 200);
			pendingFlyToTrainId = null;
		}
	};

	const handleStationChange = () => {
		fetchTrains();
	};

	const getCountdownText = (train: Train) => {
		if (train.status === "arrived") return "Tiba";
		if (train.status === "boarding_soon") return "Berangkat";

		const scheduled = getJakartaTime();
		const [hours, minutes] = train.scheduled_time.split(":").map(Number);
		scheduled.setHours(hours, minutes, 0, 0);

		if (scheduled < new Date(now.getTime() - 3600000)) {
			scheduled.setDate(scheduled.getDate() + 1);
		}

		const diffMs = scheduled.getTime() - now.getTime();

		if (diffMs <= 0) return "Tiba";

		const diffMins = Math.floor(diffMs / 60000);
		const diffSecs = Math.floor((diffMs % 60000) / 1000);

		if (diffMins === 0) return `${diffSecs}dtk`;
		return `${diffMins}mnt ${diffSecs}dtk`;
	};

	const initMap = async () => {
		if (!browser || !mapElement) return;

		// Dynamically import Leaflet so it doesn't break SSR
		L = (await import("leaflet")).default;

		// Initialize the map centered roughly on Jakarta
		mapObj = L.map(mapElement, {
			zoomControl: false,
		}).setView([-6.2088, 106.8456], 12);

		isMapReady = true;

		// Tile Layers
		lightLayer = L.tileLayer(
			"https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
			{
				maxZoom: 20,
				attribution:
					'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
			},
		);

		darkLayer = L.tileLayer(
			"https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
			{
				maxZoom: 20,
				attribution:
					'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
			},
		);

		if (isDarkMode) {
			darkLayer.addTo(mapObj);
		} else {
			lightLayer.addTo(mapObj);
		}

		// Fetch and Draw Real GeoJSON Routes
		const p1 = fetch("/krl-routes.geojson")
			.then((res) => res.json())
			.then((data) => {
				// Build MultiLineString for Turf snapping
				const linesCL: any[] = [];
				const linesMRT: any[] = [];
				data.features.forEach((f: any) => {
					if (f.geometry && f.geometry.type === "LineString") {
						if (
							f.properties.line === "MRT" ||
							f.properties.colour === "#1e40af"
						) {
							linesMRT.push(f.geometry.coordinates);
						} else {
							linesCL.push(f.geometry.coordinates);
						}
					}
				});

				trackMultiLineStringCL =
					linesCL.length > 0 ? multiLineString(linesCL) : null;
				trackMultiLineStringMRT =
					linesMRT.length > 0 ? multiLineString(linesMRT) : null;

				L.geoJSON(data, {
					style: (feature: any) => {
						return {
							color: feature.properties.colour || "#3B82F6",
							weight: 4,
							opacity: 0.8,
						};
					},
				}).addTo(mapObj);
			})
			.catch((err) =>
				console.error("Failed to load route geometry:", err),
			);

		// Place Main Station Markers
		Object.entries(stationCoordinates).forEach(([stationId, coords]) => {
			allStationCoords[stationId] = coords;

			const st = stations.find((s) => s.id === stationId);
			const name = st ? st.name : stationId;
			const isMrt = st
				? st.type === "MRT"
				: stationId.length === 3 &&
					![
						"JAKK",
						"BKS",
						"BOO",
						"KPB",
						"PSE",
						"JNG",
						"THB",
						"MRI",
						"SUD",
					].includes(stationId);

			L.marker(coords, {
				icon: L.divIcon({
					className: `bg-white border-2 rounded-full w-4 h-4 shadow-sm ${isMrt ? "border-blue-800" : "border-slate-800"}`,
					iconSize: [16, 16],
					iconAnchor: [8, 8],
					html: `<div class="absolute w-full h-full rounded-full opacity-0 hover:opacity-100 bg-white shadow-xl flex flex-col items-center justify-center -top-10 left-1/2 transform -translate-x-1/2 px-2 py-1 text-xs whitespace-nowrap text-slate-800 z-50 transition-all border border-slate-200 pointer-events-none rounded-lg"><span class="font-bold">${name}</span><span class="text-[9px] text-slate-500 font-mono">${stationId}</span></div>`,
				}),
			})
				.addTo(mapObj)
				.bindTooltip(stationId, {
					permanent: true,
					direction: "right",
					className:
						"bg-white border-none text-slate-700 font-mono text-[9px] font-bold shadow-sm p-1 ml-2 rounded",
				});
		});

		// Fetch and Draw All Other Stations
		const p2 = fetch("/all-stations.json")
			.then((res) => res.json())
			.then((data) => {
				const exclude = [
					"Sea World",
					"Dunia Fantasi",
					"Marina",
					"Bende",
					"Beach Pool",
					"Gerbang Timur",
					"Bandara Soekarno-Hatta",
					"Terminal 1",
					"Terminal 2",
					"Terminal 3",
					"A",
					"B",
					"C",
					"D",
					"Pasar Seni",
				];
				Object.entries(data).forEach(([name, coords]) => {
					// @ts-ignore
					if (!exclude.includes(name)) {
						let genId =
							realStationIds[name.toLowerCase()] ||
							realStationIds[
								name.replace(/ /g, "").toLowerCase()
							];
						if (!genId) return; // Skip non-KRL/MRT stations entirely

						// Skip if it is already drawn as a main station
						if (stationCoordinates[genId]) return;

						allStationCoords[genId] = coords as [number, number];

						L.circleMarker(coords as [number, number], {
							radius: 4,
							color: "#fff",
							weight: 1.5,
							fillColor: "#64748b",
							fillOpacity: 1,
						})
							.addTo(mapObj)
							.bindPopup(
								`<div class="text-xs font-semibold text-slate-800">${name}<br/>ID: ${genId}</div>`,
							)
							.bindTooltip(genId, {
								permanent: true,
								direction: "right",
								className:
									"bg-transparent border-none text-slate-500 font-mono text-[9px] font-bold shadow-none p-0 ml-1",
							});
					}
				});
			})
			.catch((err) => console.error("Failed to load all stations:", err));

		// Save the map instance to L so updateTrainMarkers can use it later safely
		L._mapInstance = mapObj;

		Promise.all([p1, p2]).then(() => {
			updateTrainMarkers();
		});
	};

	// Watch for tab change to initialize map
	$effect(() => {
		if (activeTab === "map") {
			if (!L) {
				// Small delay to ensure the DOM element is rendered
				setTimeout(initMap, 100);
			} else if (L._mapInstance) {
				setTimeout(() => L._mapInstance.invalidateSize(), 100);
			}
		}
	});

	// Watch for selectedStationId change to fly map to station
	$effect(() => {
		const tab = activeTab; // Read unconditionally so Svelte tracks this dependency
		const ready = isMapReady; // Ensure map is initialized

		if (browser && ready && mapObj && L && selectedStationId) {
			const coords = allStationCoords[selectedStationId];
			if (coords && tab === "map") {
				if (skipStationFly) {
					skipStationFly = false;
					return;
				}
				// Add a slight delay to ensure the map container is fully rendered if switching tabs
				setTimeout(() => {
					mapObj.invalidateSize();
					mapObj.flyTo(coords, 16, { animate: true, duration: 1.5 });
				}, 100);
			}
		}
	});

	const flyToTrain = (trainId: string) => {
		pendingFlyToTrainId = trainId;
		skipStationFly = true;
		activeTab = "map";

		if (L && L._mapInstance && trainMarkers[trainId]) {
			setTimeout(() => {
				L._mapInstance.invalidateSize();
				L._mapInstance.flyTo(trainMarkers[trainId].getLatLng(), 16, {
					animate: true,
					duration: 1.5,
				});
				trainMarkers[trainId].openPopup();
			}, 200);
			pendingFlyToTrainId = null;
		} else {
			// Trigger immediate active trains fetch to see if we can get the marker
			fetchActiveTrains().then(() => {
				if (L && L._mapInstance && trainMarkers[trainId]) {
					setTimeout(() => {
						L._mapInstance.invalidateSize();
						L._mapInstance.flyTo(
							trainMarkers[trainId].getLatLng(),
							16,
							{ animate: true, duration: 1.5 },
						);
						trainMarkers[trainId].openPopup();
					}, 200);
					pendingFlyToTrainId = null;
				} else {
					// Fallback to station if not active or marker not found
					const isActive = activeTrains.some((t) => t.id === trainId);
					if (!isActive) {
						if (selectedStationId) {
							const coords = allStationCoords[selectedStationId];
							if (coords) {
								setTimeout(() => {
									if (L && L._mapInstance) {
										L._mapInstance.invalidateSize();
										L._mapInstance.flyTo(coords, 16, {
											animate: true,
											duration: 1.5,
										});
									}
								}, 200);
							}
						}
						pendingFlyToTrainId = null;
					}
				}
			});
		}
	};

	onMount(async () => {
		// Read dark mode state from DOM
		isDarkMode = document.documentElement.classList.contains("dark");

		fetchStations().then(() => {
			// Auto-detect closest station if none selected
			if (!selectedStationId && navigator.geolocation) {
				navigator.geolocation.getCurrentPosition(
					async (pos) => {
						try {
							const res = await fetch("/all-stations.json");
							const allCoords = await res.json();

							let closestId: string | null = null;
							let minDist = Infinity;
							const lat = pos.coords.latitude;
							const lng = pos.coords.longitude;

							Object.entries(allCoords).forEach(
								([name, coords]) => {
									const dx =
										(coords as [number, number])[0] - lat;
									const dy =
										(coords as [number, number])[1] - lng;
									const dist = dx * dx + dy * dy;
									if (dist < minDist) {
										minDist = dist;
										const genId =
											realStationIds[
												name.toLowerCase()
											] ||
											realStationIds[
												name
													.replace(/ /g, "")
													.toLowerCase()
											];
										if (genId) closestId = genId;
									}
								},
							);

							if (closestId) {
								selectedStationId = closestId;
								const st = stations.find(
									(s) => s.id === closestId,
								);
								if (st) searchQuery = st.name;
								fetchTrains();
							}
						} catch (e) {
							console.error("Failed to auto-detect location", e);
						}
					},
					(err) => {
						console.warn("Geolocation denied or unavailable:", err);
					},
				);
			}

			if (selectedStationId) {
				fetchTrains();
			}
			fetchActiveTrains();
		});

		fetchTimer = setInterval(fetchTrains, 30000);
		activeTrainsTimer = setInterval(fetchActiveTrains, 5000); // Fetch every 5s for smooth updates

		countdownTimer = setInterval(() => {
			now = getJakartaTime();
		}, 1000);
	});

	onDestroy(() => {
		clearInterval(fetchTimer);
		clearInterval(activeTrainsTimer);
		clearInterval(countdownTimer);
	});
</script>

<svelte:head>
	<title>Live KRL Schedule & Map</title>
	<link
		rel="stylesheet"
		href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
	/>
</svelte:head>

<div class="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
	<!-- Top Navigation -->
	<header
		class="bg-teal-900 dark:bg-slate-900 text-white shadow-md sticky top-0 z-20 flex-shrink-0 transition-colors"
	>
		<div
			class="w-full px-4 md:px-8 py-4 flex items-center justify-between"
		>
			<div class="flex items-center gap-2">
				<img
					src="/logo.png"
					alt="Logo KRL Live"
					class="w-9 h-9 object-contain drop-shadow-sm"
				/>
				<h1 class="text-lg font-bold tracking-tight">
					KRL - MRT Tracking
				</h1>
			</div>

			<button
				onclick={toggleDarkMode}
				class="ml-auto mr-4 text-teal-200 hover:text-white dark:text-slate-400 dark:hover:text-white transition-colors"
				aria-label="Toggle Dark Mode"
			>
				{#if isDarkMode}
					<svg
						class="w-6 h-6"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
						/></svg
					>
				{:else}
					<svg
						class="w-5 h-5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
						/></svg
					>
				{/if}
			</button>

			<div class="relative">
				<button
					onclick={() => (showCopyright = !showCopyright)}
					onblur={() =>
						setTimeout(() => (showCopyright = false), 200)}
					class="text-[10px] font-bold text-teal-300/80 hover:text-white transition-colors bg-white/5 px-2 py-1 rounded-full border border-teal-700/50"
				>
					🄯 MRO - 2026
				</button>
				{#if showCopyright}
					<div
						class="absolute right-0 mt-2 w-64 bg-slate-800 text-teal-50 text-xs p-4 rounded-xl shadow-2xl border border-teal-700/50 z-50 animate-in fade-in zoom-in-95"
					>
						Data diambil berdasarkan GAPEKA dari website <strong
							>KCI & MRT</strong
						> yang diupdate pada Mei 2026.
					</div>
				{/if}
			</div>
		</div>

		<!-- Tabs -->
		<div class="w-full px-4 md:px-8 flex">
			<button
				class="flex-1 py-3 text-sm font-bold border-b-4 transition-colors {activeTab ===
				'schedule'
					? 'border-lime-400 text-lime-400'
					: 'border-transparent text-teal-300 hover:text-white'}"
				onclick={() => (activeTab = "schedule")}
			>
				Jadwal
			</button>
			<button
				class="flex-1 py-3 text-sm font-bold border-b-4 transition-colors {activeTab ===
				'map'
					? 'border-lime-400 text-lime-400'
					: 'border-transparent text-teal-300 hover:text-white'}"
				onclick={() => (activeTab = "map")}
			>
				Peta Jalur
			</button>
		</div>
	</header>

	<main
		class="flex-1 w-full relative flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors"
	>
		{#if activeTab === "schedule"}
			<div
				class="p-4 md:p-6 lg:p-8 w-full max-w-7xl mx-auto flex flex-col md:flex-row gap-6 pb-20 animate-in fade-in slide-in-from-bottom-2 duration-300"
			>
				<!-- Left Column: Station Selector -->
				<div class="w-full md:w-[320px] lg:w-[380px] flex-shrink-0">
					<!-- Station Selector -->
					<section
						class="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col gap-3 transition-colors md:sticky md:top-24"
					>
						<label
							for="station-search"
							class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1 block"
						>
							Pilih Stasiun
						</label>
						<div class="relative">
							<input
								id="station-search"
								type="text"
								bind:value={searchQuery}
								onfocus={() => {
									dropdownOpen = true;
									searchQuery = "";
								}}
								onblur={() =>
									setTimeout(() => (dropdownOpen = false), 200)}
								placeholder="Cari nama stasiun atau ID..."
								class="w-full appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-base font-semibold rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
							/>
							<div
								class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500"
							>
								<svg
									class="h-4 w-4"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
									/>
								</svg>
							</div>
							{#if dropdownOpen}
								<div
									class="absolute w-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-60 overflow-y-auto z-50 animate-in fade-in slide-in-from-top-2"
								>
									{#if filteredStations.length === 0}
										<div
											class="px-4 py-3 text-slate-500 text-sm"
										>
											Stasiun tidak ditemukan
										</div>
									{/if}
									<!-- Search Results -->
									<div class="max-h-60 overflow-y-auto">
										{#each filteredStations as station}
											<button
												class="w-full text-left px-4 py-3 hover:bg-slate-700 transition-colors border-b border-slate-700/50 last:border-0 {station.id ===
												'MRO'
													? 'bg-teal-900/30'
													: ''}"
												onclick={() => {
													if (station.id === "MRO") {
														const audio = new Audio(
															"/easter.mp3",
														);
														audio.play();
														searchQuery =
															"MRO - Mariotama";
													} else {
														searchQuery = station.name;
													}
													selectedStationId = station.id;
													dropdownOpen = false;
													handleStationChange();
												}}
											>
												<span
													class="text-slate-800 dark:text-slate-100 font-semibold"
													>{station.name}</span
												>
												<span
													class="text-xs font-bold text-slate-400 dark:text-slate-500"
													>{station.id}</span
												>
											</button>
										{/each}
									</div>
								</div>
							{/if}
						</div>
						{#if lastUpdated}
							<div
								class="text-[10px] text-right font-medium text-slate-400 dark:text-slate-500 mt-2"
							>
								Diperbarui: {lastUpdated.toLocaleTimeString(
									"en-GB",
								)} WIB
							</div>
						{/if}
					</section>
				</div>

				<!-- Right Column: Train Schedule / States -->
				<div class="flex-grow space-y-6 min-w-0">
					<!-- States -->
					{#if isLoading}
						<section
							class="bg-teal-900 rounded-2xl p-10 flex flex-col items-center justify-center gap-3"
						>
							<div
								class="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"
							></div>
							<div class="text-white/70 text-sm font-medium">
								Memuat jadwal...
							</div>
						</section>
					{:else if filteredTrainsList.length === 0}
						<section
							class="bg-slate-100 dark:bg-slate-900 rounded-2xl p-10 flex flex-col items-center justify-center gap-2 text-center border border-slate-200 dark:border-slate-800"
						>
							<div class="text-3xl mb-2">🚉</div>
							<div
								class="text-slate-600 dark:text-slate-400 font-semibold"
							>
								Tidak ada jadwal kereta
							</div>
							<div class="text-slate-400 dark:text-slate-600 text-sm">
								Kereta terakhir mungkin sudah berangkat.
							</div>
						</section>
					{/if}

					<!-- Train List -->
					{#if !isLoading && filteredTrainsList.length > 0}
						<section>
							<h2
								class="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4"
							>
								Jadwal Kereta
							</h2>

							<div class="space-y-2">
								{#each filteredTrainsList as train (train.id)}
									<div
										class="bg-white dark:bg-slate-900 rounded-xl p-4 flex items-center gap-4 shadow-sm border border-slate-100 dark:border-slate-800 transition-colors"
									>
										<div
											class="w-1.5 self-stretch rounded-full flex-shrink-0 {lineColors[
												train.line
											] || 'bg-slate-400'}"
										></div>

										<div
											class="font-mono text-lg font-bold text-slate-800 dark:text-slate-200 min-w-[50px]"
										>
											{train.scheduled_time}
										</div>

										<div class="flex-1 min-w-0">
											<div
												class="text-base font-bold text-slate-800 dark:text-slate-100 uppercase"
											>
												{train.destination}
											</div>
											<div
												class="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-1"
											>
												<span>ID: {train.id}</span>
												{#if train.status === "arrived"}
													<span
														class="text-fuchsia-600 dark:text-fuchsia-400 font-medium"
														>— Kereta Sudah Tiba</span
													>
												{:else if activeTrains.find((t) => t.id === train.id)}
													{@const activeInfo =
														activeTrains.find(
															(t) => t.id === train.id,
														)}
													{@const fromStaName =
														stations.find(
															(s) =>
																s.id ===
																activeInfo?.fromStation,
														)?.name ||
														activeInfo?.fromStation}
													<span
														class="text-fuchsia-600 dark:text-fuchsia-400 font-medium"
														>— Berjalan dari stasiun {fromStaName}</span
													>
												{/if}
											</div>
										</div>

										<div
											class="flex-shrink-0 flex flex-col gap-2 items-end justify-center"
										>
											{#if train.status === "arrived"}
												<span
													class="px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wider bg-cyan-400 dark:bg-cyan-400 text-slate-950 uppercase min-w-[64px] text-center"
												>
													Tiba
												</span>
											{:else if train.status === "boarding_soon"}
												<span
													class="px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wider bg-amber-400 dark:bg-amber-400 text-slate-950 uppercase min-w-[64px] text-center"
												>
													Segera
												</span>
											{:else}
												<span
													class="px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200 min-w-[64px] text-center border border-slate-200 dark:border-slate-700"
												>
													{getCountdownText(train)}
												</span>
											{/if}

											<button
												onclick={() => flyToTrain(train.id)}
												class="px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wider bg-cyan-100 hover:bg-cyan-200 dark:bg-cyan-950/60 dark:hover:bg-cyan-900/60 text-cyan-900 dark:text-cyan-200 transition-colors uppercase min-w-[64px] text-center border border-cyan-200 dark:border-cyan-900/50 shadow-sm active:scale-95 transition-transform"
											>
												View
											</button>
										</div>
									</div>
								{/each}
							</div>
						</section>
					{/if}
				</div>
			</div>
		{/if}

		<div
			class="flex-1 w-full bg-slate-200 relative"
			class:hidden={activeTab !== "map"}
		>
			<div bind:this={mapElement} class="absolute inset-0 z-0"></div>
		</div>
	</main>
</div>
