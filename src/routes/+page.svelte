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
	let trackMultiLineString: any = null; // For turf snapping
	let allStationCoords: Record<string, [number, number]> = {}; // Map of ID -> [lat, lng]

	// Search Dropdown State
	let searchQuery = $state('');
	let dropdownOpen = $state(false);

	let filteredStations = $derived(
		stations.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.id.toLowerCase().includes(searchQuery.toLowerCase()))
	);

	// Colors for lines
	const lineColors: Record<string, string> = {
		'BOGOR': 'bg-red-500 text-white',
		'CIKARANG': 'bg-blue-500 text-white',
		'RANGKASBITUNG': 'bg-green-600 text-white',
		'TANGERANG': 'bg-yellow-700 text-white'
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
		if (!L || !trackMultiLineString) return;

		const currentTrainIds = new Set(activeTrains.map(t => t.id));

		// Remove old markers
		Object.keys(trainMarkers).forEach(id => {
			if (!currentTrainIds.has(id)) {
				trainMarkers[id].remove();
				delete trainMarkers[id];
			}
		});

		// Update or create markers
		activeTrains.forEach(train => {
			const fromCoord = allStationCoords[train.fromStation];
			const toCoord = allStationCoords[train.toStation];

			if (!fromCoord || !toCoord) return;

			// 1. Straight line interpolation
			const lat = fromCoord[0] + (toCoord[0] - fromCoord[0]) * train.progress;
			const lng = fromCoord[1] + (toCoord[1] - fromCoord[1]) * train.progress;

			// 2. Snap to track line using Turf.js
			// turf uses [lng, lat] order!
			const pt = point([lng, lat]);
			const snapped = nearestPointOnLine(trackMultiLineString, pt);
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
		const map = L.map(mapElement).setView([-6.2088, 106.8456], 11);

		// Add OpenStreetMap tiles
		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '© OpenStreetMap contributors'
		}).addTo(map);

		// Custom icon for stations
		const stationIcon = L.divIcon({
			className: 'bg-teal-900 border-2 border-white rounded-full w-3 h-3 shadow-md',
			iconSize: [12, 12],
			iconAnchor: [6, 6]
		});

		// Fetch and Draw Real GeoJSON Routes
		fetch('/krl-routes.geojson')
			.then(res => res.json())
			.then(data => {
				// Build MultiLineString for Turf snapping
				const lines: any[] = [];
				data.features.forEach((f: any) => {
					if (f.geometry && f.geometry.type === 'LineString') {
						lines.push(f.geometry.coordinates);
					}
				});
				trackMultiLineString = multiLineString(lines);

				L.geoJSON(data, {
					style: (feature: any) => {
						return {
							color: feature.properties.colour || '#3B82F6',
							weight: 4,
							opacity: 0.8
						};
					}
				}).addTo(map);
			})
			.catch(err => console.error('Failed to load route geometry:', err));

		// Helper to generate a fake ID for minor stations
		const generateId = (name: string) => {
			const clean = name.replace(/[^a-zA-Z]/g, '').toUpperCase();
			if (clean.length <= 3) return clean;
			const words = name.split(' ');
			if (words.length >= 3) return words[0][0].toUpperCase() + words[1][0].toUpperCase() + words[2][0].toUpperCase();
			if (words.length === 2) return words[0][0].toUpperCase() + words[1].substring(0, 2).toUpperCase();
			return clean.substring(0, 3);
		};

		// Place Main Station Markers
		Object.entries(stationCoordinates).forEach(([id, coords]) => {
			allStationCoords[id] = coords;
			const st = stations.find(s => s.id === id);
			const name = st ? st.name : id;
			
			L.marker(coords, { icon: stationIcon })
				.addTo(map)
				.bindPopup(`<b>${name}</b><br/>ID: ${id}`)
				.bindTooltip(id, { 
					permanent: true, 
					direction: 'right', 
					className: 'bg-white/80 backdrop-blur-sm border border-slate-200 text-slate-800 font-mono text-[10px] font-bold px-1 py-0.5 rounded shadow-sm' 
				});
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
						if (!genId) {
							// Fallback if not found in list
							genId = name.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase();
						}
						
						// Skip if it is already drawn as a main station
						if (stationCoordinates[genId]) return;

						allStationCoords[genId] = coords as [number, number];

						L.circleMarker(coords as [number, number], {
							radius: 4,
							color: '#fff',
							weight: 1.5,
							fillColor: '#64748b',
							fillOpacity: 1
						}).addTo(map)
						.bindPopup(`<div class="text-xs font-semibold text-slate-800">${name}<br/>ID: ${genId}</div>`)
						.bindTooltip(genId, { 
							permanent: true, 
							direction: 'right', 
							className: 'bg-transparent border-none text-slate-500 font-mono text-[9px] font-bold shadow-none p-0 ml-1' 
						});
					}
				});
			})
			.catch(err => console.error('Failed to load all stations:', err));

		// Save the map instance to L so updateTrainMarkers can use it later safely
		L._mapInstance = map;
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

	onMount(() => {
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
	<header class="bg-teal-900 text-white shadow-md sticky top-0 z-20 flex-shrink-0">
		<div class="max-w-xl mx-auto px-4 py-4 flex items-center justify-between">
			<div class="flex items-center gap-2">
				<div class="w-8 h-8 bg-teal-700 rounded-lg flex items-center justify-center font-bold">
					K
				</div>
				<h1 class="text-lg font-bold tracking-tight">KRL Live</h1>
			</div>

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

	<main class="flex-1 w-full max-w-xl mx-auto relative flex flex-col">
		
		{#if activeTab === 'schedule'}
			<div class="p-4 space-y-6 pb-20 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
				<!-- Station Selector -->
				<section class="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-2">
					<label for="station" class="text-xs font-bold text-slate-500 uppercase tracking-wider">
						Pilih Stasiun
					</label>
					<div class="relative">
						<input 
							type="text"
							bind:value={searchQuery}
							onfocus={() => { dropdownOpen = true; searchQuery = ''; }}
							onblur={() => setTimeout(() => dropdownOpen = false, 200)}
							placeholder="Cari nama stasiun atau ID..."
							class="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-800 text-base font-semibold rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
						/>
						<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
							</svg>
						</div>
						{#if dropdownOpen}
							<div class="absolute w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto z-50 animate-in fade-in slide-in-from-top-2">
								{#if filteredStations.length === 0}
									<div class="px-4 py-3 text-slate-500 text-sm">Stasiun tidak ditemukan</div>
								{/if}
								{#each filteredStations as station}
									<button 
										class="w-full text-left px-4 py-3 hover:bg-teal-50 focus:bg-teal-50 border-b border-slate-50 last:border-0 transition-colors flex justify-between items-center"
										onclick={() => { 
											selectedStationId = station.id; 
											searchQuery = station.name; 
											dropdownOpen = false; 
											handleStationChange(); 
										}}
									>
										<span class="font-semibold text-slate-800">{station.name}</span>
										<span class="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded">{station.id}</span>
									</button>
								{/each}
							</div>
						{/if}
					</div>
					{#if lastUpdated}
						<div class="text-[11px] text-slate-400 text-right mt-1">
							Diperbarui: {lastUpdated.toLocaleTimeString('id-ID')}
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
					<section class="bg-slate-100 rounded-2xl p-10 flex flex-col items-center justify-center gap-2 text-center border border-slate-200">
						<div class="text-3xl mb-2">🚉</div>
						<div class="text-slate-600 font-semibold">Tidak ada jadwal kereta</div>
						<div class="text-slate-400 text-sm">Kereta terakhir mungkin sudah berangkat.</div>
					</section>
				{/if}

				<!-- Train List -->
				<section>
					<h2 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
						Jadwal Kereta
					</h2>
					
					<div class="space-y-2">
						{#each trains as train (train.id)}
							<div class="bg-white rounded-xl p-4 flex items-center gap-4 shadow-sm border border-slate-100 transition-all hover:border-teal-200 hover:shadow-md">
								<div class="w-1.5 self-stretch rounded-full flex-shrink-0 {lineColors[train.line] || 'bg-slate-400'}"></div>
								
								<div class="font-mono text-lg font-bold text-slate-800 min-w-[50px]">
									{train.scheduled_time}
								</div>
								
								<div class="flex-1 min-w-0">
									<div class="text-base font-bold text-slate-900 truncate">
										{train.destination}
									</div>
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
