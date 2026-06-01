<script lang="ts">
import { onMount, onDestroy } from 'svelte';
import { browser } from '$app/environment';
import { stationCoordinates, routes, realStationIds } from '$lib/mapData';
import { point, multiLineString } from '@turf/helpers';
import nearestPointOnLine from '@turf/nearest-point-on-line';

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
		status: 'arrived' | 'boarding_soon' | 'upcoming';
	}

	// Timezone helper
	const getJakartaTime = () => {
		const raw = new Date();
		return new Date(raw.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
	};

	// State
	let stations: Station[] = $state([]);
	let selectedStationId: string = $state('MRI');
	let trains: Train[] = $state([]);
	let lastUpdated: Date | null = $state(null);
	let isLoading: boolean = $state(true);
	let activeTab: 'schedule' | 'map' = $state('schedule');
	let showCopyright: boolean = $state(false);

	// Dark Mode State
	let isDarkMode: boolean = $state(false);
	
	const toggleDarkMode = () => {
		isDarkMode = !isDarkMode;
		if (isDarkMode) {
			document.documentElement.classList.add('dark');
			localStorage.setItem('color-theme', 'dark');
			if (mapObj && lightLayer && darkLayer) {
				mapObj.removeLayer(lightLayer);
				darkLayer.addTo(mapObj);
			}
		} else {
			document.documentElement.classList.remove('dark');
			localStorage.setItem('color-theme', 'light');
			if (mapObj && lightLayer && darkLayer) {
				mapObj.removeLayer(darkLayer);
				lightLayer.addTo(mapObj);
			}
		}
	};

	// Active Trains State
	let activeTrains: any[] = $state([]);
	let trainMarkers: Record<string, any> = {}; // Leaflet markers

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
	let allStationCoords: Record<string, [number, number]> = {}; // Map of ID -> [lat, lng]

	let clRouteLayer: any = null;
	let mrtRouteLayer: any = null;
	let clStationMarkers: any[] = [];
	let mrtStationMarkers: any[] = [];
	let mapDataLoaded = $state(false);

	// Search Dropdown State
	let searchQuery = $state('');
	let dropdownOpen = $state(false);
	let stationFilter = $state('CL');

	let filteredStations = $derived(
		stations.filter(s => 
			(s.type === stationFilter || (!s.type && stationFilter === 'CL')) &&
			(s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.id.toLowerCase().includes(searchQuery.toLowerCase()))
		)
	);

	// Colors for lines
	const lineColors: Record<string, string> = {
		'BOGOR': 'bg-red-500 text-white',
		'CIKARANG': 'bg-blue-500 text-white',
		'RANGKASBITUNG': 'bg-green-600 text-white',
		'TANGERANG': 'bg-yellow-700 text-white',
		'MRT': 'bg-blue-800 text-white'
	};

	const fetchStations = async () => {
		try {
			const res = await fetch('/api/stations');
			const data = await res.json();
			if (data.status === 'success') {
				stations = data.data;
				const current = stations.find(s => s.id === selectedStationId);
				if (current) searchQuery = current.name;
			}
		} catch (error) {
			console.error('Failed to fetch stations:', error);
		}
	};

	const fetchTrains = async () => {
		isLoading = true;
		try {
			const res = await fetch(`/api/trains?stationId=${selectedStationId}`);
			const data = await res.json();
			if (data.status === 'success') {
				trains = data.data.trains;
				lastUpdated = new Date(data.data.last_updated);
			}
		} catch (error) {
			console.error('Failed to fetch trains:', error);
		} finally {
			isLoading = false;
		}
	};

	const fetchActiveTrains = async () => {
		try {
			const res = await fetch('/api/active-trains');
			const data = await res.json();
			if (data.status === 'success') {
				activeTrains = data.data;
				updateTrainMarkers();
			}
		} catch (error) {
			console.error('Failed to fetch active trains:', error);
		}
	};

	const updateTrainMarkers = () => {
		if (!L || (!trackMultiLineStringCL && !trackMultiLineStringMRT)) return;

		// Filter active trains based on stationFilter
		const visibleTrains = activeTrains.filter(t => stationFilter === 'MRT' ? t.line === 'MRT' : t.line !== 'MRT');
		const currentTrainIds = new Set(visibleTrains.map(t => t.id));

		// Remove old markers
		Object.keys(trainMarkers).forEach(id => {
			if (!currentTrainIds.has(id)) {
				trainMarkers[id].remove();
				delete trainMarkers[id];
			}
		});

		// Update or create markers
		visibleTrains.forEach(train => {
			const fromCoord = allStationCoords[train.fromStation];
			const toCoord = allStationCoords[train.toStation];

			if (!fromCoord || !toCoord) return;

			// 1. Straight line interpolation
			const lat = fromCoord[0] + (toCoord[0] - fromCoord[0]) * train.progress;
			const lng = fromCoord[1] + (toCoord[1] - fromCoord[1]) * train.progress;

			// 2. Snap to track line using Turf.js
			// turf uses [lng, lat] order!
			const pt = point([lng, lat]);
			let targetTrack = train.line === 'MRT' ? trackMultiLineStringMRT : trackMultiLineStringCL;
			if (!targetTrack) targetTrack = trackMultiLineStringCL || trackMultiLineStringMRT;

			const snapped = nearestPointOnLine(targetTrack, pt);
			const finalCoord: [number, number] = [snapped.geometry.coordinates[1], snapped.geometry.coordinates[0]];

			if (trainMarkers[train.id]) {
				// Update existing
				trainMarkers[train.id].setLatLng(finalCoord);
				trainMarkers[train.id].getPopup().setContent(`<b>KA ${train.id}</b><br/>Tujuan: ${train.destination}<br/>Jalur: ${train.line}<br/><i>${train.fromStation} &rarr; ${train.toStation}</i>`);
			} else {
				// Create new
				const colorClass = lineColors[train.line] || 'bg-slate-500 text-white';
				const colorHex = colorClass.includes('red') ? '#EF4444' : 
								 colorClass.includes('blue') ? '#3B82F6' :
								 colorClass.includes('green') ? '#16A34A' :
								 colorClass.includes('yellow') ? '#A16207' :
								 colorClass.includes('pink') ? '#DB2777' : '#64748b';

				const marker = L.circleMarker(finalCoord, {
					radius: 5,
					fillColor: colorHex,
					color: '#ffffff',
					weight: 2,
					opacity: 1,
					fillOpacity: 1
				})
					.addTo(L._mapInstance)
					.bindPopup(`<b>KA ${train.id}</b><br/>Tujuan: ${train.destination}<br/>Jalur: ${train.line}<br/><i>${train.fromStation} &rarr; ${train.toStation}</i>`);
				
				trainMarkers[train.id] = marker;
			}
		});
	};

	const handleStationChange = () => {
		fetchTrains();
	};

	const getCountdownText = (train: Train) => {
		if (train.status === 'arrived') return 'Tiba';
		if (train.status === 'boarding_soon') return 'Berangkat';

		const scheduled = getJakartaTime();
		const [hours, minutes] = train.scheduled_time.split(':').map(Number);
		scheduled.setHours(hours, minutes, 0, 0);

		if (scheduled < new Date(now.getTime() - 3600000)) {
			scheduled.setDate(scheduled.getDate() + 1);
		}

		const diffMs = scheduled.getTime() - now.getTime();
		
		if (diffMs <= 0) return 'Tiba';

		const diffMins = Math.floor(diffMs / 60000);
		const diffSecs = Math.floor((diffMs % 60000) / 1000);

		if (diffMins === 0) return `${diffSecs}dtk`;
		return `${diffMins}mnt ${diffSecs}dtk`;
	};

	const initMap = async () => {
		if (!browser || !mapElement) return;

		// Dynamically import Leaflet so it doesn't break SSR
		L = (await import('leaflet')).default;
		
		// Initialize the map centered roughly on Jakarta
		mapObj = L.map(mapElement).setView([-6.2088, 106.8456], 11);

		// Tile Layers
		lightLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
			maxZoom: 20,
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
		});

		darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
			maxZoom: 20,
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
		});

		if (isDarkMode) {
			darkLayer.addTo(mapObj);
		} else {
			lightLayer.addTo(mapObj);
		}

		// Fetch and Draw Real GeoJSON Routes
		fetch('/krl-routes.geojson')
			.then(res => res.json())
			.then(data => {
				// Build MultiLineString for Turf snapping
				const linesCL: any[] = [];
				const linesMRT: any[] = [];
				data.features.forEach((f: any) => {
					if (f.geometry && f.geometry.type === 'LineString') {
						if (f.properties.line === 'MRT' || f.properties.colour === '#1e40af') {
							linesMRT.push(f.geometry.coordinates);
						} else {
							linesCL.push(f.geometry.coordinates);
						}
					}
				});

				trackMultiLineStringCL = linesCL.length > 0 ? multiLineString(linesCL) : null;
				trackMultiLineStringMRT = linesMRT.length > 0 ? multiLineString(linesMRT) : null;

				clRouteLayer = L.geoJSON(data, {
					filter: (feature: any) => feature.properties.line !== 'MRT' && feature.properties.colour !== '#1e40af',
					style: (feature: any) => ({
						color: feature.properties.colour || '#3B82F6',
						weight: 4,
						opacity: 0.8
					})
				});

				mrtRouteLayer = L.geoJSON(data, {
					filter: (feature: any) => feature.properties.line === 'MRT' || feature.properties.colour === '#1e40af',
					style: (feature: any) => ({
						color: feature.properties.colour || '#1e40af',
						weight: 4,
						opacity: 0.8
					})
				});

				if (stationFilter === 'MRT') {
					mrtRouteLayer.addTo(mapObj);
				} else {
					clRouteLayer.addTo(mapObj);
				}
			})
			.catch(err => console.error('Failed to load route geometry:', err));

		// Place Main Station Markers
		Object.entries(stationCoordinates).forEach(([stationId, coords]) => {
			allStationCoords[stationId] = coords;
			
			const st = stations.find(s => s.id === stationId);
			const name = st ? st.name : stationId;
			const isMrt = st ? st.type === 'MRT' : (stationId.length === 3 && !['JAKK', 'BKS', 'BOO', 'KPB', 'PSE', 'JNG', 'THB', 'MRI', 'SUD'].includes(stationId));

			const marker = L.marker(coords, {
				icon: L.divIcon({
					className: `bg-white border-2 rounded-full w-4 h-4 shadow-sm ${isMrt ? 'border-blue-800' : 'border-slate-800'}`,
					iconSize: [16, 16],
					iconAnchor: [8, 8],
					html: `<div class="absolute w-full h-full rounded-full opacity-0 hover:opacity-100 bg-white shadow-xl flex flex-col items-center justify-center -top-10 left-1/2 transform -translate-x-1/2 px-2 py-1 text-xs whitespace-nowrap text-slate-800 z-50 transition-all border border-slate-200 pointer-events-none rounded-lg"><span class="font-bold">${name}</span><span class="text-[9px] text-slate-500 font-mono">${stationId}</span></div>`
				})
			}).bindTooltip(stationId, { 
				permanent: true, 
				direction: 'right', 
				className: 'bg-white border-none text-slate-700 font-mono text-[9px] font-bold shadow-sm p-1 ml-2 rounded' 
			});

			if (isMrt) {
				mrtStationMarkers.push(marker);
				if (stationFilter === 'MRT') marker.addTo(mapObj);
			} else {
				clStationMarkers.push(marker);
				if (stationFilter === 'CL') marker.addTo(mapObj);
			}
		});

		// Fetch and Draw All Other Stations
		fetch('/all-stations.json')
			.then(res => res.json())
			.then(data => {
				const exclude = ['Sea World', 'Dunia Fantasi', 'Marina', 'Bende', 'Beach Pool', 'Gerbang Timur', 'Bandara Soekarno-Hatta', 'Terminal 1', 'Terminal 2', 'Terminal 3', 'A', 'B', 'C', 'D', 'Pasar Seni'];
				Object.entries(data).forEach(([name, coords]) => {
					// @ts-ignore
					if (!exclude.includes(name)) {
						let genId = realStationIds[name.toLowerCase()] || realStationIds[name.replace(/ /g, '').toLowerCase()];
						if (!genId) return; // Skip non-KRL/MRT stations entirely
						
						// Skip if it is already drawn as a main station
						if (stationCoordinates[genId]) return;

						allStationCoords[genId] = coords as [number, number];

						const marker = L.circleMarker(coords as [number, number], {
							radius: 4,
							color: '#fff',
							weight: 1.5,
							fillColor: '#64748b',
							fillOpacity: 1
						}).bindPopup(`<div class="text-xs font-semibold text-slate-800">${name}<br/>ID: ${genId}</div>`)
						.bindTooltip(genId, { 
							permanent: true, 
							direction: 'right', 
							className: 'bg-transparent border-none text-slate-500 font-mono text-[9px] font-bold shadow-none p-0 ml-1' 
						});

						const isMrt = stations.find(s => s.id === genId)?.type === 'MRT';
						if (isMrt) {
							mrtStationMarkers.push(marker);
							if (stationFilter === 'MRT') marker.addTo(mapObj);
						} else {
							clStationMarkers.push(marker);
							if (stationFilter === 'CL') marker.addTo(mapObj);
						}
					}
				});
				
				mapDataLoaded = true; // Trigger reactive effect safely
			})
			.catch(err => console.error('Failed to load all stations:', err));

		// Save the map instance to L so updateTrainMarkers can use it later safely
		L._mapInstance = mapObj;
	};

	// Watch for tab change to initialize map
	$effect(() => {
		if (activeTab === 'map') {
			if (!L) {
				// Small delay to ensure the DOM element is rendered
				setTimeout(initMap, 100);
			} else if (L._mapInstance) {
				setTimeout(() => L._mapInstance.invalidateSize(), 100);
			}
		}
	});

	// Watch for stationFilter change to toggle map layers
	$effect(() => {
		if (browser && mapObj && L && mapDataLoaded) {
			const mode = stationFilter; // Track dependency explicitly
			if (mode === 'MRT') {
				if (clRouteLayer) clRouteLayer.remove();
				if (mrtRouteLayer) mrtRouteLayer.addTo(mapObj);

				clStationMarkers.forEach(m => m.remove());
				mrtStationMarkers.forEach(m => m.addTo(mapObj));
			} else {
				if (mrtRouteLayer) mrtRouteLayer.remove();
				if (clRouteLayer) clRouteLayer.addTo(mapObj);

				mrtStationMarkers.forEach(m => m.remove());
				clStationMarkers.forEach(m => m.addTo(mapObj));
			}
			updateTrainMarkers();
		}
	});

	onMount(async () => {
		// Read dark mode state from DOM
		isDarkMode = document.documentElement.classList.contains('dark');

		fetchStations().then(() => {
			fetchTrains();
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
	<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
</svelte:head>

<div class="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
	<!-- Top Navigation -->
	<header class="bg-teal-900 dark:bg-slate-900 text-white shadow-md sticky top-0 z-20 flex-shrink-0 transition-colors">
		<div class="max-w-xl mx-auto px-4 py-4 flex items-center justify-between">
			<div class="flex items-center gap-2">
				<img src="/logo.png" alt="Logo KRL Live" class="w-9 h-9 object-contain drop-shadow-sm" />
				<h1 class="text-lg font-bold tracking-tight">KRL Live</h1>
			</div>

			<button 
				onclick={toggleDarkMode}
				class="ml-auto mr-4 text-teal-200 hover:text-white dark:text-slate-400 dark:hover:text-white transition-colors"
				aria-label="Toggle Dark Mode"
			>
				{#if isDarkMode}
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
				{:else}
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
				{/if}
			</button>

			<div class="relative">
				<button 
					onclick={() => showCopyright = !showCopyright}
					onblur={() => setTimeout(() => showCopyright = false, 200)}
					class="text-[10px] font-bold text-teal-300/80 hover:text-white transition-colors bg-white/5 px-2 py-1 rounded-full border border-teal-700/50"
				>
					🄯 MRO - 2026
				</button>
				{#if showCopyright}
					<div class="absolute right-0 mt-2 w-64 bg-slate-800 text-teal-50 text-xs p-4 rounded-xl shadow-2xl border border-teal-700/50 z-50 animate-in fade-in zoom-in-95">
						Data diambil berdasarkan GAPEKA dari website <strong>kci.id</strong> yang diupdate pada Februari 2026.
					</div>
				{/if}
			</div>
		</div>
		
		<!-- Tabs -->
		<div class="max-w-xl mx-auto flex">
			<button 
				class="flex-1 py-3 text-sm font-bold border-b-4 transition-colors {activeTab === 'schedule' ? 'border-lime-400 text-lime-400' : 'border-transparent text-teal-300 hover:text-white'}"
				onclick={() => activeTab = 'schedule'}
			>
				Jadwal
			</button>
			<button 
				class="flex-1 py-3 text-sm font-bold border-b-4 transition-colors {activeTab === 'map' ? 'border-lime-400 text-lime-400' : 'border-transparent text-teal-300 hover:text-white'}"
				onclick={() => activeTab = 'map'}
			>
				Peta Jalur
			</button>
		</div>
	</header>

	<main class="flex-1 w-full max-w-xl mx-auto relative flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors">
		
		{#if activeTab === 'schedule'}
			<div class="p-4 space-y-6 pb-20 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
				<!-- Station Selector -->
				<section class="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col gap-3 transition-colors">
					<div class="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 transition-colors">
						<label for="station" class="text-xs font-bold text-slate-500 uppercase tracking-wider">
							Pilih Stasiun
						</label>
						<div class="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg transition-colors">
							<button 
								class="px-3 py-1 text-xs font-bold rounded-md transition-colors {stationFilter === 'CL' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}"
								onclick={() => { stationFilter = 'CL'; searchQuery = ''; dropdownOpen = true; }}
							>
								CL
							</button>
							<button 
								class="px-3 py-1 text-xs font-bold rounded-md transition-colors {stationFilter === 'MRT' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}"
								onclick={() => { stationFilter = 'MRT'; searchQuery = ''; dropdownOpen = true; }}
							>
								MRT
							</button>
						</div>
					</div>
					<div class="relative mt-3">
						<input 
							type="text"
							bind:value={searchQuery}
							onfocus={() => { dropdownOpen = true; searchQuery = ''; }}
							onblur={() => setTimeout(() => dropdownOpen = false, 200)}
							placeholder="Cari nama stasiun atau ID..."
							class="w-full appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-base font-semibold rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
						/>
						<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
							</svg>
						</div>
						{#if dropdownOpen}
							<div class="absolute w-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-60 overflow-y-auto z-50 animate-in fade-in slide-in-from-top-2">
								{#if filteredStations.length === 0}
									<div class="px-4 py-3 text-slate-500 text-sm">Stasiun tidak ditemukan</div>
								{/if}
								{#each filteredStations as station}
									<button 
										class="w-full text-left px-4 py-3 hover:bg-teal-50 dark:hover:bg-slate-700 focus:bg-teal-50 dark:focus:bg-slate-700 border-b border-slate-50 dark:border-slate-700 last:border-0 transition-colors flex justify-between items-center"
										onclick={() => { 
											selectedStationId = station.id; 
											searchQuery = station.name; 
											dropdownOpen = false; 
											handleStationChange(); 
										}}
									>
										<span class="text-slate-800 dark:text-slate-100 font-semibold">{station.name}</span>
										<span class="text-xs font-bold text-slate-400 dark:text-slate-500">{station.id}</span>
									</button>
								{/each}
							</div>
						{/if}
					</div>
					{#if lastUpdated}
						<div class="text-[10px] text-right font-medium text-slate-400 dark:text-slate-500 mt-2">
							Diperbarui: {lastUpdated.toLocaleTimeString('en-GB')} WIB
						</div>
					{/if}
				</section>

				<!-- States -->
				{#if isLoading}
					<section class="bg-teal-900 rounded-2xl p-10 flex flex-col items-center justify-center gap-3">
						<div class="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
						<div class="text-white/70 text-sm font-medium">Memuat jadwal...</div>
					</section>
				{:else if trains.length === 0}
					<section class="bg-slate-100 dark:bg-slate-900 rounded-2xl p-10 flex flex-col items-center justify-center gap-2 text-center border border-slate-200 dark:border-slate-800">
						<div class="text-3xl mb-2">🚉</div>
						<div class="text-slate-600 dark:text-slate-400 font-semibold">Tidak ada jadwal kereta</div>
						<div class="text-slate-400 dark:text-slate-600 text-sm">Kereta terakhir mungkin sudah berangkat.</div>
					</section>
				{/if}

				<!-- Train List -->
				<section>
					<h2 class="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
						Jadwal Kereta
					</h2>
					
					<div class="space-y-2">
						{#each trains as train (train.id)}
							<div class="bg-white dark:bg-slate-900 rounded-xl p-4 flex items-center gap-4 shadow-sm border border-slate-100 dark:border-slate-800 transition-all hover:border-teal-200 hover:shadow-md">
								<div class="w-1.5 self-stretch rounded-full flex-shrink-0 {lineColors[train.line] || 'bg-slate-400'}"></div>
								
								<div class="font-mono text-lg font-bold text-slate-800 dark:text-slate-200 min-w-[50px]">
									{train.scheduled_time}
								</div>
								
								<div class="flex-1 min-w-0">
									<div class="text-base font-bold text-slate-800 dark:text-slate-100">{train.destination}</div>
									<div class="text-xs text-slate-500 mt-0.5">
										ID: {train.id}
									</div>
								</div>
								
								<div class="flex-shrink-0">
									{#if train.status === 'arrived'}
										<span class="px-3 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800">
											Tiba
										</span>
									{:else if train.status === 'boarding_soon'}
										<span class="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
											Segera
										</span>
									{:else}
										<span class="font-mono text-sm font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-lg border border-slate-200">
											{getCountdownText(train)}
										</span>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</section>
			</div>
		{/if}

		<div class="flex-1 w-full bg-slate-200 relative" class:hidden={activeTab !== 'map'}>
			<div bind:this={mapElement} class="absolute inset-0 z-0"></div>
		</div>

	</main>
</div>
