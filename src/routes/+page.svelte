<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import { browser } from "$app/environment";
	import { PUBLIC_CARTO_API_KEY } from "$env/static/public";
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
	let isLoading: boolean = $state(false);
	let showCopyright: boolean = $state(false);

	// Category filter: Semua | KRL | MRT | LRT | Antarkota | Lokal | Whoosh | Bandara
	let selectedCategory: "Semua" | "KRL" | "MRT" | "LRT" | "Antarkota" | "Lokal" | "Whoosh" | "Bandara" = $state("Semua");

	// Drawer state (Bottom sheet on mobile, floating sidebar on desktop)
	let isDrawerOpen: boolean = $state(true);
	let drawerTab: "station" | "active" = $state("station");

	// Dark Mode & Layer State
	let isDarkMode: boolean = $state(true);
	let currentBasemap: "dark" | "light" | "satellite" = $state("satellite");
	let showRailwayOverlay: boolean = $state(true);
	let showLayerMenu: boolean = $state(false);

	// Crowdsource Live GPS State
	let isGpsSharing: boolean = $state(false);
	let gpsWatchId: number | null = null;
	let showGpsModal: boolean = $state(false);
	let selectedGpsTrainId: string = $state("");
	let gpsStatusMessage: string = $state("");
	let lastGpsPingInfo: {
		matchedTrainId?: string;
		speed?: number;
		accuracy?: number;
		timestamp?: number;
	} | null = $state(null);

	const startGpsSharing = () => {
		if (!navigator.geolocation) {
			alert("Browser Anda tidak mendukung Geolocation.");
			return;
		}

		showGpsModal = false;
		isGpsSharing = true;
		gpsStatusMessage = "Mencari sinyal GPS akurat...";

		let lastSendTime = 0;

		gpsWatchId = navigator.geolocation.watchPosition(
			async (pos) => {
				const now = Date.now();
				// Throttle pings to at most once every 3.5 seconds
				if (now - lastSendTime < 3500) return;
				lastSendTime = now;

				const lat = pos.coords.latitude;
				const lng = pos.coords.longitude;
				const speedKmH =
					pos.coords.speed !== null && pos.coords.speed !== undefined
						? Math.round(pos.coords.speed * 3.6)
						: null;
				const heading = pos.coords.heading ?? null;
				const accuracy = Math.round(pos.coords.accuracy);

				try {
					const res = await fetch("/api/gps/ping", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							lat,
							lng,
							speed: speedKmH,
							heading,
							accuracy,
							trainId: selectedGpsTrainId || undefined,
						}),
					});
					const data = await res.json();
					if (data.status === "success") {
						lastGpsPingInfo = {
							matchedTrainId: data.matchedTrainId,
							speed: speedKmH ?? undefined,
							accuracy,
							timestamp: Date.now(),
						};
						gpsStatusMessage = `Terhubung ke KA ${data.matchedTrainId} (±${accuracy}m)`;
						fetchActiveTrains();
					} else {
						gpsStatusMessage =
							data.message || "Mencari kereta terdekat...";
					}
				} catch (err) {
					console.error("Failed to send GPS ping:", err);
				}
			},
			(err) => {
				console.error("GPS Watch error:", err);
				gpsStatusMessage = `Error GPS: ${err.message}`;
				stopGpsSharing();
			},
			{
				enableHighAccuracy: true,
				maximumAge: 2000,
				timeout: 10000,
			},
		);
	};

	const stopGpsSharing = () => {
		if (gpsWatchId !== null) {
			navigator.geolocation.clearWatch(gpsWatchId);
			gpsWatchId = null;
		}
		isGpsSharing = false;
		lastGpsPingInfo = null;
		gpsStatusMessage = "";
	};

	const setBasemap = (type: "dark" | "light" | "satellite") => {
		currentBasemap = type;
		if (typeof window !== "undefined") {
			localStorage.setItem("basemap-theme", type);
		}
		if (!mapObj || !darkLayer || !lightLayer || !satelliteLayer) return;

		if (mapObj.hasLayer(darkLayer)) mapObj.removeLayer(darkLayer);
		if (mapObj.hasLayer(lightLayer)) mapObj.removeLayer(lightLayer);
		if (mapObj.hasLayer(satelliteLayer)) mapObj.removeLayer(satelliteLayer);

		if (type === "dark") {
			darkLayer.addTo(mapObj);
			if (!isDarkMode) toggleDarkMode(true);
		} else if (type === "light") {
			lightLayer.addTo(mapObj);
			if (isDarkMode) toggleDarkMode(false);
		} else if (type === "satellite") {
			satelliteLayer.addTo(mapObj);
			if (!isDarkMode) toggleDarkMode(true);
		}
	};

	const toggleRailwayOverlay = () => {
		showRailwayOverlay = !showRailwayOverlay;
		if (!mapObj || !railwayLayer) return;
		if (showRailwayOverlay) {
			railwayLayer.addTo(mapObj);
		} else {
			mapObj.removeLayer(railwayLayer);
		}
	};

	const toggleDarkMode = (forcedState?: boolean | unknown) => {
		const isForced = typeof forcedState === "boolean";
		isDarkMode = isForced ? (forcedState as boolean) : !isDarkMode;
		if (isDarkMode) {
			document.documentElement.classList.add("dark");
			localStorage.setItem("color-theme", "dark");
			if (mapObj && currentBasemap === "light") {
				setBasemap("dark");
			}
		} else {
			document.documentElement.classList.remove("dark");
			localStorage.setItem("color-theme", "light");
			if (mapObj && currentBasemap === "dark") {
				setBasemap("light");
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
	let satelliteLayer: any;
	let railwayLayer: any;
	let minorStationsLayer: any = null;
	let trackMultiLineStringCL: any = null; // For CL turf snapping
	let trackMultiLineStringMRT: any = null; // For MRT turf snapping
	let trackMultiLineStringConventional: any = null; // For National conventional KAI turf snapping
	let trackMultiLineStringWhoosh: any = null; // For Whoosh KCIC high-speed turf snapping
	let trackMultiLineStringNational: any = null; // For fallback snapping
	let allStationCoords: Record<string, [number, number]> = $state({}); // Map of ID -> [lat, lng]
	let isMapReady = $state(false);

	// Search Dropdown State
	let searchQuery = $state("");
	let dropdownOpen = $state(false);

	// Filtered stations based on search query
	let filteredStations = $derived(
		searchQuery.trim() === ""
			? stations.slice(0, 8)
			: stations.filter(
					(s) =>
						s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
						s.id.toLowerCase().includes(searchQuery.toLowerCase()),
				).slice(0, 10),
	);

	// Filter active trains matching search query
	let matchingTrainsSearch = $derived(
		searchQuery.trim() === ""
			? []
			: activeTrains.filter(
					(t) =>
						t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
						t.destination.toLowerCase().includes(searchQuery.toLowerCase()),
				).slice(0, 5),
	);

	// Filter active trains based on Category Pill
	let filteredActiveTrains = $derived(
		activeTrains.filter((train) => {
			if (selectedCategory === "Semua") return true;
			if (selectedCategory === "KRL")
				return !["MRT", "LRT", "ANTARKOTA", "LOKAL", "WHOOSH", "BANDARA"].includes(train.line);
			if (selectedCategory === "MRT") return train.line === "MRT";
			if (selectedCategory === "LRT") return train.line === "LRT";
			if (selectedCategory === "Antarkota") return train.line === "ANTARKOTA";
			if (selectedCategory === "Lokal") return train.line === "LOKAL";
			if (selectedCategory === "Whoosh") return train.line === "WHOOSH";
			if (selectedCategory === "Bandara") return train.line === "BANDARA";
			return false;
		}),
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
		TANJUNGPRIUK: "bg-pink-600 text-white",
		MRT: "bg-blue-800 text-white",
		LRT: "bg-indigo-600 text-white",
		ANTARKOTA: "bg-amber-600 text-white",
		LOKAL: "bg-teal-600 text-white",
		WHOOSH: "bg-rose-600 text-white",
		BANDARA: "bg-cyan-600 text-white",
	};

	const formatTrainId = (id: string): string => {
		if (
			id.startsWith("KA ") ||
			id.startsWith("Whoosh ") ||
			id.startsWith("LRT") ||
			id.startsWith("MRT")
		) {
			return id;
		}
		return `KA ${id}`;
	};

	const fetchStations = async () => {
		try {
			const [res, natRes] = await Promise.all([
				fetch("/api/stations").then((r) => r.json()).catch(() => ({ status: "error", data: [] })),
				fetch("/data/all-national-stations.json").then((r) => r.json()).catch(() => []),
			]);

			const scheduleStations = res.status === "success" ? res.data : [];
			const existingIds = new Set(scheduleStations.map((s: any) => s.id));
			const combined = [...scheduleStations];

			if (Array.isArray(natRes)) {
				natRes.forEach((ns: any) => {
					const id = ns.code || ns.id;
					if (!existingIds.has(id)) {
						existingIds.add(id);
						combined.push({
							id,
							name: ns.name,
							type: ns.island === "Sumatera" ? "Sumatera" : ns.type || "KAI",
						});
					}
				});
			}

			stations = combined;
			if (selectedStationId) {
				const current = stations.find((s) => s.id === selectedStationId);
				if (current && !searchQuery) searchQuery = current.name;
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

	// High-speed Whoosh intermediate waypoints (Halim -> Padalarang -> Tegalluar)
	const WHOOSH_WAYPOINTS_MAP: Record<string, [number, number]> = {
		KCIC_CKR: [-6.33313, 107.17499],
		KCIC_KRW: [-6.39119, 107.25538],
		KCIC_PWK: [-6.50161, 107.39549],
		KCIC_WLN: [-6.58383, 107.41564],
		KCIC_CKL: [-6.70103, 107.4051],
		KCIC_SKT: [-6.78619, 107.43887],
		KCIC_CMI: [-6.885, 107.545],
		KCIC_KPO: [-6.95747, 107.57503],
		KCIC_GDB: [-6.96849, 107.67813],
	};

	// Major intercity corridor waypoint breakdowns (to prevent straight-line chords cutting across mountains/lakes)
	const CORRIDOR_WAYPOINTS: Record<string, string[]> = {
		// Jakarta <-> Bandung (Priangan mountain corridor via Purwakarta & Sasaksaat)
		"GMR->BD": ["GMR", "JNG", "BKS", "CKR", "KW", "DWN", "CKP", "CBR", "PWK", "CA", "SUT", "PLD", "CD", "SKT", "CLE", "PDL", "CMI", "BD"],
		"BD->GMR": ["BD", "CMI", "PDL", "CLE", "SKT", "CD", "PLD", "SUT", "CA", "PWK", "CBR", "CKP", "DWN", "KW", "CKR", "BKS", "JNG", "GMR"],
		"GMR->CMI": ["GMR", "JNG", "BKS", "CKR", "KW", "DWN", "CKP", "CBR", "PWK", "CA", "SUT", "PLD", "CD", "SKT", "CLE", "PDL", "CMI"],
		"CMI->GMR": ["CMI", "PDL", "CLE", "SKT", "CD", "PLD", "SUT", "CA", "PWK", "CBR", "CKP", "DWN", "KW", "CKR", "BKS", "JNG", "GMR"],
		"PSE->BD": ["PSE", "JNG", "BKS", "CKR", "KW", "DWN", "CKP", "CBR", "PWK", "CA", "SUT", "PLD", "CD", "SKT", "CLE", "PDL", "CMI", "BD"],
		"BD->PSE": ["BD", "CMI", "PDL", "CLE", "SKT", "CD", "PLD", "SUT", "CA", "PWK", "CBR", "CKP", "DWN", "KW", "CKR", "BKS", "JNG", "PSE"],
		"PSE->CMI": ["PSE", "JNG", "BKS", "CKR", "KW", "DWN", "CKP", "CBR", "PWK", "CA", "SUT", "PLD", "CD", "SKT", "CLE", "PDL", "CMI"],
		"CMI->PSE": ["CMI", "PDL", "CLE", "SKT", "CD", "PLD", "SUT", "CA", "PWK", "CBR", "CKP", "DWN", "KW", "CKR", "BKS", "JNG", "PSE"],
		"PWK->CKP": ["PWK", "CBR", "CKP"],
		"CKP->PWK": ["CKP", "CBR", "PWK"],
		"PWK->CMI": ["PWK", "CA", "SUT", "PLD", "CD", "SKT", "CLE", "PDL", "CMI"],
		"CMI->PWK": ["CMI", "PDL", "CLE", "SKT", "CD", "PLD", "SUT", "CA", "PWK"],
		"PWK->BD": ["PWK", "CA", "SUT", "PLD", "CD", "SKT", "CLE", "PDL", "CMI", "BD"],
		"BD->PWK": ["BD", "CMI", "PDL", "CLE", "SKT", "CD", "PLD", "SUT", "CA", "PWK"],
		"PWK->PDL": ["PWK", "CA", "SUT", "PLD", "CD", "SKT", "CLE", "PDL"],
		"PDL->PWK": ["PDL", "CLE", "SKT", "CD", "PLD", "SUT", "CA", "PWK"],
		"CKP->CMI": ["CKP", "CBR", "PWK", "CA", "SUT", "PLD", "CD", "SKT", "CLE", "PDL", "CMI"],
		"CMI->CKP": ["CMI", "PDL", "CLE", "SKT", "CD", "PLD", "SUT", "CA", "PWK", "CBR", "CKP"],
		"CKP->BD": ["CKP", "CBR", "PWK", "CA", "SUT", "PLD", "CD", "SKT", "CLE", "PDL", "CMI", "BD"],
		"BD->CKP": ["BD", "CMI", "PDL", "CLE", "SKT", "CD", "PLD", "SUT", "CA", "PWK", "CBR", "CKP"],
		"JNG->CMI": ["JNG", "BKS", "CKR", "KW", "DWN", "CKP", "CBR", "PWK", "CA", "SUT", "PLD", "CD", "SKT", "CLE", "PDL", "CMI"],
		"CMI->JNG": ["CMI", "PDL", "CLE", "SKT", "CD", "PLD", "SUT", "CA", "PWK", "CBR", "CKP", "DWN", "KW", "CKR", "BKS", "JNG"],
		"PSE->PWK": ["PSE", "JNG", "BKS", "CKR", "KW", "DWN", "CKP", "CBR", "PWK"],
		"PWK->PSE": ["PWK", "CBR", "CKP", "DWN", "KW", "CKR", "BKS", "JNG", "PSE"],

		// Cikampek <-> Karawang & Cikarang
		"KW->CKP": ["KW", "KOS", "DWN", "CKP"],
		"CKP->KW": ["KW", "DWN", "KOS", "KW"],
		"CKR->CKP": ["CKR", "KW", "DWN", "CKP"],
		"CKP->CKR": ["CKP", "DWN", "KW", "CKR"],

		// Jakarta <-> Cirebon (Pantura flat double-track corridor)
		"GMR->CN": ["GMR", "JNG", "BKS", "CKR", "KW", "CKP", "PAB", "HGL", "JTB", "CN"],
		"CN->GMR": ["CN", "JTB", "HGL", "PAB", "CKP", "KW", "CKR", "BKS", "JNG", "GMR"],
		"PSE->CN": ["PSE", "JNG", "BKS", "CKR", "KW", "CKP", "PAB", "HGL", "JTB", "CN"],
		"CN->PSE": ["CN", "JTB", "HGL", "PAB", "CKP", "KW", "CKR", "BKS", "JNG", "PSE"],
		"BKS->CN": ["BKS", "CKR", "KW", "CKP", "PAB", "HGL", "JTB", "CN"],
		"CN->BKS": ["CN", "JTB", "HGL", "PAB", "CKP", "KW", "CKR", "BKS"],
		"JNG->CN": ["JNG", "BKS", "CKR", "KW", "CKP", "PAB", "HGL", "JTB", "CN"],
		"CN->JNG": ["CN", "JTB", "HGL", "PAB", "CKP", "KW", "CKR", "BKS", "JNG"],
		"GMR->CNP": ["GMR", "JNG", "BKS", "CKR", "KW", "CKP", "PAB", "HGL", "JTB", "CNP"],
		"CNP->GMR": ["CNP", "JTB", "HGL", "PAB", "CKP", "KW", "CKR", "BKS", "JNG", "GMR"],
		"PSE->CNP": ["PSE", "JNG", "BKS", "CKR", "KW", "CKP", "PAB", "HGL", "JTB", "CNP"],
		"CNP->PSE": ["CNP", "JTB", "HGL", "PAB", "CKP", "KW", "CKR", "BKS", "JNG", "PSE"],
		"BKS->CNP": ["BKS", "CKR", "KW", "CKP", "PAB", "HGL", "JTB", "CNP"],
		"CNP->BKS": ["CNP", "JTB", "HGL", "PAB", "CKP", "KW", "CKR", "BKS"],
		"CKR->CNP": ["CKR", "KW", "CKP", "PAB", "HGL", "JTB", "CNP"],
		"CNP->CKR": ["CNP", "JTB", "HGL", "PAB", "CKP", "KW", "CKR"],
		"CKP->CN": ["CKP", "PAB", "HGL", "JTB", "CN"],
		"CN->CKP": ["CN", "JTB", "HGL", "PAB", "CKP"],
		"CKP->CNP": ["CKP", "PAB", "HGL", "JTB", "CNP"],
		"CNP->CKP": ["CNP", "JTB", "HGL", "PAB", "CKP"],

		// Cirebon <-> Purwokerto (Bumiayu mountain pass)
		"CN->PWT": ["CN", "CLD", "KGG", "SGG", "PPK", "BMA", "KRT", "KRR", "PWT"],
		"PWT->CN": ["PWT", "KRR", "KRT", "BMA", "PPK", "SGG", "KGG", "CLD", "CN"],
		"CNP->PWT": ["CNP", "CLD", "KGG", "SGG", "PPK", "BMA", "KRT", "KRR", "PWT"],
		"PWT->CNP": ["PWT", "KRR", "KRT", "BMA", "PPK", "SGG", "KGG", "CLD", "CNP"],

		// Semarang <-> Cepu
		"SMT->CU": ["SMT", "BBG", "NBO", "RBG", "CU"],
		"CU->SMT": ["CU", "RBG", "NBO", "BBG", "SMT"],
		"SMC->CU": ["SMC", "BBG", "NBO", "RBG", "CU"],
		"CU->SMC": ["CU", "RBG", "NBO", "BBG", "SMC"],

		// Whoosh (Halim <-> Padalarang <-> Tegalluar)
		"HLM->TGLR": ["HLM", "KCIC_CKR", "KCIC_KRW", "KCIC_PWK", "KCIC_WLN", "KCIC_CKL", "KCIC_SKT", "PDL", "KCIC_CMI", "KCIC_KPO", "KCIC_GDB", "TGLR"],
		"TGLR->HLM": ["TGLR", "KCIC_GDB", "KCIC_KPO", "KCIC_CMI", "PDL", "KCIC_SKT", "KCIC_CKL", "KCIC_WLN", "KCIC_PWK", "KCIC_KRW", "KCIC_CKR", "HLM"],
		"HLM->PDL": ["HLM", "KCIC_CKR", "KCIC_KRW", "KCIC_PWK", "KCIC_WLN", "KCIC_CKL", "KCIC_SKT", "PDL"],
		"PDL->HLM": ["PDL", "KCIC_SKT", "KCIC_CKL", "KCIC_WLN", "KCIC_PWK", "KCIC_KRW", "KCIC_CKR", "HLM"],
		"PDL->TGLR": ["PDL", "KCIC_CMI", "KCIC_KPO", "KCIC_GDB", "TGLR"],
		"TGLR->PDL": ["TGLR", "KCIC_GDB", "KCIC_KPO", "KCIC_CMI", "PDL"],
	};

	// Master Rail Spines for continuous corridor breakdowns
	const SPINES = [
		['GMR', 'PSE', 'JNG', 'BKS', 'CKR', 'KW', 'DWN', 'CKP', 'PAB', 'HGL', 'JTB', 'CN', 'CNP', 'WDW', 'BBK', 'LOS', 'TGN', 'BB', 'TG', 'LR', 'PML', 'PTN', 'CO', 'SRI', 'PK', 'BTG', 'UJN', 'KNS', 'PLB', 'KRN', 'WLR', 'KBD', 'SMC', 'SMT', 'BBG', 'NBO', 'RBG', 'CU', 'KPS', 'BJ', 'BBT', 'LMG', 'SBI'],
		['CN', 'CNP', 'CLD', 'KGG', 'SGG', 'PPK', 'BMA', 'KRT', 'KRR', 'PWT', 'NTG', 'RDN', 'KYA'],
		['CKP', 'CBR', 'PWK', 'CA', 'SUT', 'PLD', 'CD', 'SKT', 'CLE', 'PDL', 'CMI', 'BD', 'CTH', 'KAC'],
		['BD', 'KAC', 'RCK', 'CCL', 'NG', 'LL', 'CB', 'WB', 'CPD', 'CAW', 'RJP', 'TSM', 'AW', 'MNJ', 'CI', 'BJG', 'KNP', 'BJR', 'LN', 'MLW', 'SDR', 'GDM', 'KWG', 'JRL', 'KBS', 'KYA'],
		['CCL', 'NG', 'LL', 'CB', 'PASIR', 'WNR', 'GRT'],
		['CP', 'GM', 'KKD', 'LBG', 'KH', 'MA', 'SKP', 'KYA'],
		['KYA', 'SPH', 'TB', 'IJ', 'GB', 'SRW', 'KM', 'WNS', 'KTA', 'JN', 'WT', 'RWL', 'YK', 'LPN', 'MGW', 'KT', 'PWS', 'SLO'],
		['SLO', 'PWS', 'PL', 'SR', 'WK', 'KG', 'NGW', 'BBD', 'MN', 'CRB', 'SN', 'BGR', 'NJ', 'SKM', 'BRN', 'KTS', 'PTR', 'SMB', 'JG', 'SBO', 'MR', 'TRK', 'KDN', 'KRN', 'BH', 'SPJ', 'WO', 'SGU', 'SBI'],
		['SLO', 'SK', 'GDM', 'BBG', 'SMT', 'SMC'],
		['KTS', 'KD', 'TA', 'BL', 'GRM', 'TAL', 'WG', 'KSB', 'PGJ', 'SBP', 'NB', 'KPN', 'PSI', 'MLK', 'ML', 'LW', 'BG', 'SDA', 'WO', 'SGU'],
		['BG', 'PS', 'RO', 'GI', 'BYM', 'PB', 'LEC', 'RN', 'KK', 'RDA', 'JTR', 'TGL', 'BSS', 'RBP', 'MI', 'JR', 'AJ', 'KLT', 'GRN', 'MRW', 'KBR', 'GLM', 'SWD', 'KSL', 'TGR', 'RGP', 'BWI', 'AGO', 'KTG'],
		['THB', 'PLM', 'KBY', 'PDJ', 'JMU', 'SDM', 'RU', 'SRP', 'CSK', 'CC', 'PRP', 'CJT', 'DAR', 'TEJ', 'TGS', 'CKY', 'MJ', 'CTR', 'RK', 'SG', 'KRA', 'TOJB', 'CLG', 'KEN', 'MER'],
		['CTA', 'PDRG', 'CBN', 'NMO'],
		['HLM', 'KCIC_CKR', 'KCIC_KRW', 'KCIC_PWK', 'KCIC_WLN', 'KCIC_CKL', 'KCIC_SKT', 'PDL', 'KCIC_CMI', 'KCIC_KPO', 'KCIC_GDB', 'TGLR'],
		['MRI', 'SUD', 'BNC', 'DU', 'PSG', 'RW', 'KDS', 'PI', 'BPR', 'BST'],
		['WT', 'YIA'],
		['MDN', 'KNM', 'LBP', 'TBI', 'SIR', 'KIS', 'TNB', 'PBA', 'MBM', 'RAP'],
		['MDN', 'BIJ'],
		['BIM', 'DUK', 'PD', 'ATR', 'TAB', 'LBY', 'PMN', 'NRS'],
		['LLG', 'LT', 'ME', 'PBM', 'KPT'],
		['PBM', 'BTA', 'KB', 'TNK']
	];

	const findSpinePath = (from: string, to: string): string[] | null => {
		for (const spine of SPINES) {
			const i1 = spine.indexOf(from);
			const i2 = spine.indexOf(to);
			if (i1 !== -1 && i2 !== -1) {
				if (i1 <= i2) return spine.slice(i1, i2 + 1);
				else return spine.slice(i2, i1 + 1).reverse();
			}
		}
		return null;
	};

	// Station pair sampled track paths cache (loaded from /data/precalculated-track-paths.json)
	let stationPairPaths: Record<string, [number, number][]> = {};

	const getTrackPathBetween = (
		fromId: string,
		toId: string,
		line: string,
	): [number, number][] => {
		const cacheKey = `${line}:${fromId}->${toId}`;
		if (stationPairPaths[cacheKey]) return stationPairPaths[cacheKey];
		const plainKey = `${fromId}->${toId}`;
		if (stationPairPaths[plainKey]) return stationPairPaths[plainKey];

		const fromCoord = allStationCoords[fromId] || WHOOSH_WAYPOINTS_MAP[fromId];
		const toCoord = allStationCoords[toId] || WHOOSH_WAYPOINTS_MAP[toId];
		if (!fromCoord || !toCoord) return [];

		// Predefined corridor waypoints or spine breakdown fallback if not yet loaded in stationPairPaths
		const corridor = CORRIDOR_WAYPOINTS[plainKey] || findSpinePath(fromId, toId);
		if (corridor && corridor.length >= 2) {
			const corridorSamples: [number, number][] = [];
			for (const cid of corridor) {
				const pt = allStationCoords[cid] || WHOOSH_WAYPOINTS_MAP[cid];
				if (pt) corridorSamples.push(pt);
			}
			if (corridorSamples.length >= 2) {
				stationPairPaths[cacheKey] = corridorSamples;
				return corridorSamples;
			}
		}

		// Direct linear interpolation fallback
		const fallback: [number, number][] = [fromCoord, toCoord];
		stationPairPaths[cacheKey] = fallback;
		return fallback;
	};

	const interpolatePath = (
		samples: [number, number][],
		progress: number,
	): [number, number] => {
		if (samples.length === 0) return [0, 0];
		if (samples.length === 1 || progress <= 0) return samples[0];
		if (progress >= 1) return samples[samples.length - 1];

		const scaled = progress * (samples.length - 1);
		const idx = Math.floor(scaled);
		const subProgress = scaled - idx;

		if (idx >= samples.length - 1) return samples[samples.length - 1];

		const p1 = samples[idx];
		const p2 = samples[idx + 1];

		return [
			p1[0] + (p2[0] - p1[0]) * subProgress,
			p1[1] + (p2[1] - p1[1]) * subProgress,
		];
	};

	const haversineKm = (
		lat1: number,
		lon1: number,
		lat2: number,
		lon2: number,
	): number => {
		const R = 6371; // Earth radius in km
		const dLat = ((lat2 - lat1) * Math.PI) / 180;
		const dLon = ((lon2 - lon1) * Math.PI) / 180;
		const a =
			Math.sin(dLat / 2) * Math.sin(dLat / 2) +
			Math.cos((lat1 * Math.PI) / 180) *
				Math.cos((lat2 * Math.PI) / 180) *
				Math.sin(dLon / 2) *
				Math.sin(dLon / 2);
		return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	};

	const getJakartaMinutes = (): number => {
		const d = new Date();
		const utc = d.getTime() + d.getTimezoneOffset() * 60000;
		const jkt = new Date(utc + 3600000 * 7);
		return (
			jkt.getHours() * 60 +
			jkt.getMinutes() +
			jkt.getSeconds() / 60 +
			jkt.getMilliseconds() / 3600000
		);
	};

	let serverClockOffset = 0;
	let animFrameId: number | null = null;

	const getPathDistanceKm = (samples: [number, number][]): number => {
		if ((samples as any)._distKm !== undefined) {
			return (samples as any)._distKm;
		}
		let total = 0;
		for (let i = 0; i < samples.length - 1; i++) {
			total += haversineKm(
				samples[i][0],
				samples[i][1],
				samples[i + 1][0],
				samples[i + 1][1],
			);
		}
		(samples as any)._distKm = total;
		return total;
	};

	function calculateTrainPosition(train: any, currentMinutes: number) {
		// 1. If train has active LIVE GPS ping from a passenger
		if (
			train.isLiveGps &&
			typeof train.liveLat === "number" &&
			typeof train.liveLng === "number"
		) {
			let lat = train.liveLat;
			let lng = train.liveLng;

			let targetTrack: any = null;
			if (train.line === "WHOOSH") {
				targetTrack = trackMultiLineStringWhoosh;
			} else if (train.line === "MRT") {
				targetTrack = trackMultiLineStringMRT;
			} else {
				// Conventional tracks only (official OpenRailwayMap dataset)
				targetTrack = trackMultiLineStringConventional;
			}

			if (targetTrack) {
				try {
					const snapped = nearestPointOnLine(
						targetTrack,
						point([lng, lat]),
					);
					const distKm = snapped.properties?.dist ?? 0;
					if (distKm <= 3.5) {
						lat = snapped.geometry.coordinates[1];
						lng = snapped.geometry.coordinates[0];
					}
				} catch {}
			}

			const liveSpeed =
				typeof train.speed === "number" && train.speed >= 0
					? Math.round(train.speed)
					: 0;
			const isStopped = liveSpeed < 4;
			return {
				lat,
				lng,
				status: isStopped ? ("stopped" as const) : ("moving" as const),
				progress: train.progress ?? 0.5,
				speed: isStopped ? 0 : liveSpeed,
			};
		}

		// 2. Timetable schedule interpolation
		let progress = train.progress ?? 0;
		let duration = 0;
		if (
			train.departMinutes !== undefined &&
			train.arrivMinutes !== undefined &&
			train.arrivMinutes > train.departMinutes
		) {
			let nowMins = currentMinutes;
			if (nowMins < 180 && train.arrivMinutes >= 1440) nowMins += 1440;
			duration = train.arrivMinutes - train.departMinutes;
			const elapsed = nowMins - train.departMinutes;
			progress = Math.max(0, Math.min(1, elapsed / duration));
		}

		const samples = getTrackPathBetween(
			train.fromStation,
			train.toStation,
			train.line,
		);
		if (!samples || samples.length === 0) return null;

		let status: "stopped" | "moving" = "moving";
		if (progress <= 0.03 || progress >= 0.97) {
			status = "stopped";
		}

		const coord = interpolatePath(samples, progress);

		let speed = 0;
		if (status === "moving") {
			// Approximate track distance in km
			const pathDistanceKm = getPathDistanceKm(samples);

			let avgSpeed = 60;
			if (pathDistanceKm > 0.5 && duration > 0) {
				avgSpeed = pathDistanceKm / (duration / 60);
			} else {
				if (train.line === "WHOOSH") avgSpeed = 280;
				else if (train.line === "ANTARKOTA") avgSpeed = 85;
				else if (train.line === "BANDARA") avgSpeed = 70;
				else if (train.line === "MRT") avgSpeed = 65;
				else if (train.line === "LRT") avgSpeed = 55;
				else if (train.line === "LOKAL") avgSpeed = 60;
				else avgSpeed = 65;
			}

			// Realistic physics: smooth sinusoidal acceleration and deceleration
			let curveFactor = 1.0;
			if (progress < 0.15) {
				curveFactor = Math.sin((progress / 0.15) * (Math.PI / 2));
			} else if (progress > 0.85) {
				curveFactor = Math.sin(((1 - progress) / 0.15) * (Math.PI / 2));
			} else {
				// Micro-variations in cruise speed to look realistic
				const wave = Math.sin(progress * 25) * 0.03;
				curveFactor = 1.05 + wave;
			}

			speed = Math.round(avgSpeed * curveFactor);

			// Clamp to realistic physics ceilings per line category
			const maxCeiling =
				train.line === "WHOOSH"
					? 350
					: train.line === "ANTARKOTA"
						? 120
						: train.line === "BANDARA"
							? 85
							: train.line === "MRT" || train.line === "LRT"
								? 80
								: 90;

			speed = Math.max(5, Math.min(maxCeiling, speed));
		}

		return {
			lat: coord[0],
			lng: coord[1],
			status,
			progress,
			speed,
		};
	}

	const createTrainIcon = (
		train: any,
		pos: { status: string; progress: number },
	) => {
		const isStopped = pos.status === "stopped";
		const isLiveGps = !!train.isLiveGps;

		// Line colors mapping
		const colorClass = lineColors[train.line] || "bg-slate-500 text-white";
		const bgColorHex = colorClass.includes("rose")
			? "#E11D48"
			: colorClass.includes("amber")
				? "#D97706"
				: colorClass.includes("teal")
					? "#0D9488"
					: colorClass.includes("cyan")
						? "#0891B2"
						: colorClass.includes("red")
							? "#EF4444"
							: colorClass.includes("blue-800")
								? "#1E40AF"
								: colorClass.includes("blue")
									? "#2563EB"
									: colorClass.includes("green")
										? "#16A34A"
										: colorClass.includes("yellow")
											? "#B45309"
											: colorClass.includes("pink")
												? "#DB2777"
												: "#475569";

		// Pulsing ring if stopped at station, otherwise sleek subtle shadow
		const pulseGlow = isStopped
			? "ring-4 ring-amber-400 ring-offset-1 animate-pulse"
			: "shadow-md";

		// Live GPS badge vs standard GAPEKA badge
		const gpsBadge = isLiveGps
			? `<span class="bg-emerald-500 text-[8px] px-1 py-0.2 rounded font-black text-white flex items-center gap-0.5 shadow-xs"><span class="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>LIVE</span>`
			: "";

		const statusIcon = isStopped
			? "⏸️"
			: train.line === "WHOOSH"
				? "🚅"
				: train.line === "BANDARA"
					? "✈️"
					: train.line === "LRT"
						? "🚊"
						: "🚄";

		const cleanTrainId = formatTrainId(train.id);

		return L.divIcon({
			className: "custom-train-marker !bg-transparent !border-0",
			html: `
				<div class="flex items-center gap-1.5 cursor-pointer select-none filter drop-shadow hover:scale-105 active:scale-95 transition-transform duration-150">
					<div class="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-white text-[11px] font-bold ${pulseGlow}" style="background-color: ${bgColorHex};">
						<span>${statusIcon}</span>
					</div>
					<div class="bg-slate-900/90 dark:bg-slate-950/90 text-white text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shadow backdrop-blur-xs flex items-center gap-1 border border-white/20 whitespace-nowrap">
						<span>${cleanTrainId}</span>
						${gpsBadge}
					</div>
				</div>
			`,
			iconSize: [85, 26],
			iconAnchor: [12, 13],
			popupAnchor: [0, -14],
		});
	};

	const getPopupHtml = (
		train: any,
		pos: { status: string; progress: number; speed?: number },
	) => {
		const isStopped = pos.status === "stopped";
		const currentSpeed = pos.speed ?? 0;

		const statusBadge = isStopped
			? '<span class="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500 text-white">BERHENTI</span>'
			: '<span class="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-500 text-white">BERGERAK</span>';

		const gpsBadge = train.isLiveGps
			? '<span class="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-500 text-white flex items-center gap-1">📡 LIVE GPS</span>'
			: '<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-200 text-slate-700">⏱️ GAPEKA</span>';

		const speedBadge = isStopped
			? '<span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-500">0 km/jam</span>'
			: train.isLiveGps
				? `<span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-black bg-emerald-50 text-emerald-700 border border-emerald-200">⚡ ${currentSpeed} km/jam</span>`
				: `<span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">⚡ ~${currentSpeed} km/jam</span>`;

		const stationInfo = isStopped
			? `Berhenti di stasiun <b>${train.fromStation}</b>`
			: `Menuju <b>${train.toStation}</b> (${Math.round(pos.progress * 100)}%)`;

		const cleanTrainId = formatTrainId(train.id);

		const headerIcon =
			train.line === "WHOOSH"
				? "🚅"
				: train.line === "BANDARA"
					? "✈️"
					: train.line === "LRT"
						? "🚊"
						: "🚄";

		const originStation =
			train.origin ||
			stations.find((s) => s.id === train.fromStation)?.name ||
			train.fromStation;

		return `<div class="p-1 font-sans text-xs">
			<div class="font-black text-sm text-slate-900 mb-1.5 flex items-center justify-between gap-2">
				<div class="flex items-center gap-1.5">
					<span>${headerIcon}</span><span>${cleanTrainId}</span>
				</div>
				<div class="flex items-center gap-1">
					${statusBadge}
					${gpsBadge}
				</div>
			</div>
			<div class="text-slate-600 mb-0.5"><b>Tujuan:</b> ${train.destination}</div>
			<div class="text-slate-600 mb-1.5 flex items-center justify-between">
				<div><b>Asal:</b> <span class="font-bold text-teal-600">${originStation}</span></div>
				<div>${speedBadge}</div>
			</div>
			<div class="bg-slate-100 rounded-lg p-1.5 text-[10px] text-slate-700 font-mono flex items-center justify-between">
				<span>${stationInfo}</span>
				<span class="font-bold text-teal-600">${train.fromStation} &rarr; ${train.toStation}</span>
			</div>
		</div>`;
	};

	const fetchActiveTrains = async () => {
		try {
			const res = await fetch("/api/active-trains");
			const data = await res.json();
			if (data.status === "success") {
				activeTrains = data.data;
				if (typeof data.serverTimeMinutes === "number") {
					serverClockOffset =
						data.serverTimeMinutes - getJakartaMinutes();
				}
			}
		} catch (error) {
			console.error("Failed to fetch active trains:", error);
		}
	};

	const updateTrainMarkers = () => {
		if (
			!L ||
			!L._mapInstance ||
			(!trackMultiLineStringCL &&
				!trackMultiLineStringMRT &&
				!trackMultiLineStringNational &&
				Object.keys(allStationCoords).length === 0)
		)
			return;

		const nowMins = getJakartaMinutes() + serverClockOffset;
		const currentTrainIds = new Set(filteredActiveTrains.map((t) => t.id));

		// Viewport culling bounds with 25% padding for smooth edge entry
		const mapBounds = mapObj ? mapObj.getBounds().pad(0.25) : null;

		// Remove old markers or filtered out markers
		Object.keys(trainMarkers).forEach((id) => {
			if (!currentTrainIds.has(id)) {
				trainMarkers[id].remove();
				delete trainMarkers[id];
			}
		});

		// Update or create markers
		filteredActiveTrains.forEach((train) => {
			const pos = calculateTrainPosition(train, nowMins);
			if (!pos) return;

			if (train._currentSpeed !== pos.speed) {
				train._currentSpeed = pos.speed;
			}

			const isVisible = !mapBounds || mapBounds.contains([pos.lat, pos.lng]);

			if (trainMarkers[train.id]) {
				// If marker is outside visible map bounds, detach from map to eliminate DOM layout calculations
				if (!isVisible) {
					if (trainMarkers[train.id]._isOnMap) {
						trainMarkers[train.id].remove();
						trainMarkers[train.id]._isOnMap = false;
					}
					// Still update internal coordinates so position is accurate when panning into view
					trainMarkers[train.id].setLatLng([pos.lat, pos.lng]);
					return;
				} else if (!trainMarkers[train.id]._isOnMap) {
					trainMarkers[train.id].addTo(L._mapInstance);
					trainMarkers[train.id]._isOnMap = true;
				}

				// Smoothly update marker position
				trainMarkers[train.id].setLatLng([pos.lat, pos.lng]);

				// Only update the icon HTML if the status or live GPS state changes
				const statusKey = `${pos.status}_${!!train.isLiveGps}`;
				if (trainMarkers[train.id]._lastStatusKey !== statusKey) {
					trainMarkers[train.id].setIcon(createTrainIcon(train, pos));
					trainMarkers[train.id]._lastStatusKey = statusKey;
				}

				if (trainMarkers[train.id].isPopupOpen?.()) {
					const popupHtml = getPopupHtml(train, pos);
					if (trainMarkers[train.id]._lastPopupHtml !== popupHtml) {
						trainMarkers[train.id]
							.getPopup()
							.setContent(popupHtml);
						trainMarkers[train.id]._lastPopupHtml = popupHtml;
					}
				}
			} else if (isVisible) {
				const popupHtml = getPopupHtml(train, pos);
				// Create new radar-style train marker only when in or near viewport
				const marker = L.marker([pos.lat, pos.lng], {
					icon: createTrainIcon(train, pos),
					riseOnHover: true,
				})
					.addTo(L._mapInstance)
					.bindPopup(popupHtml);

				marker._lastStatusKey = `${pos.status}_${!!train.isLiveGps}`;
				marker._lastPopupHtml = popupHtml;
				marker._isOnMap = true;

				// Clicking marker opens detail
				marker.on("click", () => {
					drawerTab = "active";
					isDrawerOpen = true;
				});

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
			if (!marker._isOnMap) {
				marker.addTo(L._mapInstance);
				marker._isOnMap = true;
			}
			L._mapInstance.invalidateSize();
			L._mapInstance.flyTo(marker.getLatLng(), 15, {
				animate: true,
				duration: 1.2,
			});
			marker.openPopup();
			pendingFlyToTrainId = null;
		}
	};

	let lastAnimTime = 0;
	const animateLoop = (timestamp: number) => {
		if (!browser) return;
		// Throttle animation to ~20 FPS (every 50ms) and pause completely when browser tab is hidden
		if (!document.hidden && timestamp - lastAnimTime >= 50) {
			lastAnimTime = timestamp;
			updateTrainMarkers();
		}
		animFrameId = requestAnimationFrame(animateLoop);
	};

	const selectStation = (stationId: string) => {
		selectedStationId = stationId;
		drawerTab = "station";
		isDrawerOpen = true;
		dropdownOpen = false;

		const st = stations.find((s) => s.id === stationId);
		if (st) searchQuery = st.name;

		fetchTrains();

		if (allStationCoords[stationId] && mapObj) {
			mapObj.flyTo(allStationCoords[stationId], 15, {
				animate: true,
				duration: 1.2,
			});
		}
	};

	const flyToTrain = (trainId: string) => {
		pendingFlyToTrainId = trainId;
		skipStationFly = true;

		if (L && L._mapInstance && trainMarkers[trainId]) {
			setTimeout(() => {
				L._mapInstance.invalidateSize();
				L._mapInstance.flyTo(trainMarkers[trainId].getLatLng(), 15, {
					animate: true,
					duration: 1.2,
				});
				trainMarkers[trainId].openPopup();
			}, 100);
			pendingFlyToTrainId = null;
		} else {
			fetchActiveTrains().then(() => {
				if (L && L._mapInstance && trainMarkers[trainId]) {
					setTimeout(() => {
						L._mapInstance.invalidateSize();
						L._mapInstance.flyTo(
							trainMarkers[trainId].getLatLng(),
							15,
							{ animate: true, duration: 1.2 },
						);
						trainMarkers[trainId].openPopup();
					}, 100);
					pendingFlyToTrainId = null;
				}
			});
		}
	};

	const detectUserLocation = () => {
		if (!navigator.geolocation) return;
		navigator.geolocation.getCurrentPosition(
			async (pos) => {
				try {
					let closestId = null;
					let minDist = Infinity;
					const lat = pos.coords.latitude;
					const lng = pos.coords.longitude;

					Object.entries(allStationCoords).forEach(
						([id, coords]) => {
							const dx = coords[0] - lat;
							const dy = coords[1] - lng;
							const dist = dx * dx + dy * dy;
							if (dist < minDist) {
								minDist = dist;
								closestId = id;
							}
						},
					);

					if (closestId) {
						selectStation(closestId);
					} else if (mapObj) {
						mapObj.flyTo([lat, lng], 14, { animate: true, duration: 1.2 });
					}
				} catch (e) {
					console.error("Failed to detect location", e);
				}
			},
			(err) => {
				console.warn("Geolocation denied or unavailable:", err);
			},
		);
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

		// Initialize map centered on Jakarta with GPU Canvas rendering
		mapObj = L.map(mapElement, {
			zoomControl: false,
			preferCanvas: true,
		}).setView([-6.2088, 106.8456], 12);

		isMapReady = true;

		// Create Custom Pane for Railway Overlay (so it always stays above basemap, but below routes and markers)
		mapObj.createPane("railwayOverlay");
		const railwayPane = mapObj.getPane("railwayOverlay");
		if (railwayPane) {
			railwayPane.style.zIndex = "250";
		}

		// Tile Layers with Carto API Key
		const cartoKeyParam = PUBLIC_CARTO_API_KEY ? `?key=${PUBLIC_CARTO_API_KEY}` : "";
		lightLayer = L.tileLayer(
			`https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png${cartoKeyParam}`,
			{
				maxZoom: 20,
				attribution:
					'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
			},
		);

		darkLayer = L.tileLayer(
			`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png${cartoKeyParam}`,
			{
				maxZoom: 20,
				attribution:
					'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
			},
		);

		satelliteLayer = L.tileLayer(
			"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
			{
				maxZoom: 19,
				attribution:
					'&copy; <a href="https://www.esri.com/">ESRI</a>, Maxar, Earthstar Geographics',
			},
		);

		railwayLayer = L.tileLayer(
			"https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png",
			{
				maxZoom: 19,
				opacity: 0.85,
				attribution:
					'&copy; <a href="https://www.openrailwaymap.org/">OpenRailwayMap</a> contributors',
				pane: "railwayOverlay",
			},
		);

		if (currentBasemap === "satellite") {
			satelliteLayer.addTo(mapObj);
		} else if (currentBasemap === "dark" || isDarkMode) {
			darkLayer.addTo(mapObj);
		} else {
			lightLayer.addTo(mapObj);
		}

		if (showRailwayOverlay) {
			railwayLayer.addTo(mapObj);
		}

		const vectorCanvasRenderer = L.canvas({ padding: 0.5 });

		// Fetch and Draw Real GeoJSON Routes with GPU Canvas renderer
		const p1 = fetch("/krl-routes.geojson")
			.then((res) => res.json())
			.then((data) => {
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

				// Draw only dedicated MRT Jakarta underground/elevated route; conventional tracks are beautifully handled by official OpenRailwayMap
				if (linesMRT.length > 0) {
					L.geoJSON(
						{
							type: "FeatureCollection",
							features: data.features.filter(
								(f: any) =>
									f.properties.line === "MRT" ||
									f.properties.colour === "#1e40af",
							),
						},
						{
							renderer: vectorCanvasRenderer,
							style: {
								color: "#1E40AF",
								weight: 4,
								opacity: 0.85,
							},
						},
					).addTo(mapObj);
				}
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

			const marker = L.marker(coords, {
				icon: L.divIcon({
					className: `bg-white border-2 rounded-full w-4 h-4 shadow-sm cursor-pointer ${isMrt ? "border-blue-800" : "border-slate-800"}`,
					iconSize: [16, 16],
					iconAnchor: [8, 8],
					html: `<div class="absolute w-full h-full rounded-full opacity-0 hover:opacity-100 bg-white shadow-xl flex flex-col items-center justify-center -top-10 left-1/2 transform -translate-x-1/2 px-2 py-1 text-xs whitespace-nowrap text-slate-800 z-50 transition-all border border-slate-200 pointer-events-none rounded-lg"><span class="font-bold">${name}</span><span class="text-[9px] text-slate-500 font-mono">${stationId}</span></div>`,
				}),
			})
				.addTo(mapObj)
				.bindTooltip(stationId, {
					direction: "right",
					className:
						"bg-white/90 border-none text-slate-700 font-mono text-[9px] font-bold shadow-sm p-1 ml-2 rounded backdrop-blur-xs",
				});

			// Clicking station marker opens drawer and fetches schedule
			marker.on("click", () => {
				selectStation(stationId);
			});
		});

		// LayerGroup for minor stations with Level-of-Detail zoom control
		minorStationsLayer = L.layerGroup();
		const stationCanvasRenderer = L.canvas({ padding: 0.5 });

		// Fetch and Draw All National Stations (Java & Sumatra)
		const p2 = fetch("/data/all-national-stations.json")
			.then((res) => res.json())
			.then((nationalStations: any[]) => {
				nationalStations.forEach((st) => {
					const id = st.code || st.id || st.name;
					allStationCoords[id] = st.coords;
					allStationCoords[st.name] = st.coords;
					if (st.code) {
						allStationCoords[st.code] = st.coords;
					}

					// Skip duplicating main stations already rendered
					if (stationCoordinates[id]) return;

					const isSumatera = st.island === "Sumatera";
					const isWhoosh = st.type === "Whoosh";
					const isMrt = st.type === "MRT";
					const isLrt = st.type === "LRT";

					const fillColor = isWhoosh
						? "#DC2626"
						: isMrt
							? "#1E40AF"
							: isLrt
								? "#4F46E5"
								: isSumatera
									? "#0EA5E9"
									: "#6366F1";

					const minorMarker = L.circleMarker(st.coords, {
						renderer: stationCanvasRenderer,
						radius: 3.5,
						color: "#ffffff",
						weight: 1.2,
						fillColor,
						fillOpacity: 0.9,
					})
						.bindTooltip(`${st.name}${st.code ? ` (${st.code})` : ""}`, {
							direction: "top",
							className:
								"bg-slate-900/90 text-white border-none font-mono text-[9px] font-bold shadow-md px-1.5 py-0.5 rounded backdrop-blur-xs",
						})
						.bindPopup(
							`<div class="p-1 font-sans text-xs">
								<div class="font-black text-sm text-slate-900 mb-1 flex items-center gap-1.5">
									<span>🚉</span><span>Stasiun ${st.name}</span>
								</div>
								<div class="text-slate-600 mb-0.5"><b>Kode:</b> <span class="font-mono font-bold text-teal-600">${st.code || st.id}</span></div>
								<div class="text-slate-600 mb-0.5"><b>Wilayah:</b> Pulau ${st.island}</div>
								<div class="text-slate-600 mb-1"><b>Layanan:</b> ${st.network || st.type}</div>
								<div class="bg-slate-100 rounded px-1.5 py-1 text-[10px] text-slate-500 font-mono">
									${st.coords[0].toFixed(5)}, ${st.coords[1].toFixed(5)}
								</div>
							</div>`,
						);

					minorMarker.on("click", () => {
						selectStation(id);
					});

					minorStationsLayer.addLayer(minorMarker);
				});

				// Common KCI schedule code aliases
				const kciAliases: Record<string, [number, number]> = {
					POC: [-6.3690593, 106.8320844], // Pondok Cina (PCN)
					KAT: [-6.2009538, 106.8167704], // Karet (KRT)
					THI: [-6.1751701, 106.6467095], // Tanah Tinggi (TTI)
					JTK: [-6.288582, 106.7291463],  // Jurangmangu (JMU)
					TOJB: [-6.0312959, 106.1214599] // Tonjong Baru (TOJ) in Merak line
				};
				Object.assign(allStationCoords, kciAliases);

				// Only show minor stations when zoomed into regional/city level (zoom >= 10)
				if (mapObj.getZoom() >= 10) {
					mapObj.addLayer(minorStationsLayer);
				}

				mapObj.on("zoomend", () => {
					if (!minorStationsLayer) return;
					const currentZoom = mapObj.getZoom();
					if (currentZoom >= 10 && !mapObj.hasLayer(minorStationsLayer)) {
						mapObj.addLayer(minorStationsLayer);
					} else if (currentZoom < 10 && mapObj.hasLayer(minorStationsLayer)) {
						mapObj.removeLayer(minorStationsLayer);
					}
				});
			})
			.catch((err) =>
				console.error("Failed to load all national stations:", err),
			);

		// Fetch Precalculated Physical Railway Paths (instant 200 KB load, zero main-thread Turf lockup)
		const pPaths = fetch("/data/precalculated-track-paths.json")
			.then((res) => res.json())
			.then((data) => {
				Object.assign(stationPairPaths, data);
				updateTrainMarkers();
			})
			.catch((err) =>
				console.error("Failed to load precalculated track paths:", err),
			);

		L._mapInstance = mapObj;

		Promise.all([p1, p2, pPaths]).then(() => {
			updateTrainMarkers();
		});

		// Background idle-load of national track geometry for custom live GPS pings only (non-blocking)
		if (typeof window !== "undefined" && "requestIdleCallback" in window) {
			window.requestIdleCallback(() => {
				fetch("/data/indonesia-railway.geojson")
					.then((res) => res.json())
					.then((data) => {
						const linesConv: any[] = [];
						const linesWhoosh: any[] = [];
						data.features.forEach((f: any) => {
							const p = f.properties || {};
							const isWhoosh =
								p.highspeed === "yes" ||
								p.gauge === "1435" ||
								(p.operator && p.operator.includes("Kereta Cepat")) ||
								(p.name && p.name.includes("Kereta Cepat"));

							if (f.geometry && f.geometry.type === "LineString") {
								if (isWhoosh) linesWhoosh.push(f.geometry.coordinates);
								else linesConv.push(f.geometry.coordinates);
							} else if (f.geometry && f.geometry.type === "MultiLineString") {
								if (isWhoosh) f.geometry.coordinates.forEach((c: any) => linesWhoosh.push(c));
								else f.geometry.coordinates.forEach((c: any) => linesConv.push(c));
							}
						});
						if (linesConv.length > 0) {
							trackMultiLineStringConventional = multiLineString(linesConv);
						}
						if (linesWhoosh.length > 0) {
							trackMultiLineStringWhoosh = multiLineString(linesWhoosh);
						}
						trackMultiLineStringNational = trackMultiLineStringConventional;
					})
					.catch(() => {});
			});
		}
	};

	// Map zoom helper
	const zoomIn = () => mapObj?.zoomIn();
	const zoomOut = () => mapObj?.zoomOut();
	const resetMap = () => mapObj?.setView([-6.2088, 106.8456], 12);

	onMount(async () => {
		isDarkMode = document.documentElement.classList.contains("dark");
		const savedBasemap = localStorage.getItem("basemap-theme") as "dark" | "light" | "satellite" | null;
		currentBasemap = savedBasemap || "satellite";

		// Initialize map immediately in fullscreen
		setTimeout(initMap, 50);

		// Start smooth 60 FPS animation loop
		animFrameId = requestAnimationFrame(animateLoop);

		fetchStations().then(() => {
			if (!selectedStationId && navigator.geolocation) {
				navigator.geolocation.getCurrentPosition(
					async (pos) => {
						try {
							let closestId: string | null = null;
							let minDist = Infinity;
							const lat = pos.coords.latitude;
							const lng = pos.coords.longitude;

							Object.entries(allStationCoords).forEach(([id, coords]) => {
								const dx = coords[0] - lat;
								const dy = coords[1] - lng;
								const dist = dx * dx + dy * dy;
								if (dist < minDist) {
									minDist = dist;
									closestId = id;
								}
							});

							if (closestId) {
								selectStation(closestId);
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

		fetchTimer = setInterval(() => {
			if (!document.hidden && selectedStationId) {
				fetchTrains();
			}
		}, 30000);

		activeTrainsTimer = setInterval(() => {
			if (!document.hidden) {
				fetchActiveTrains();
			}
		}, 8000);

		countdownTimer = setInterval(() => {
			if (!document.hidden) {
				now = getJakartaTime();
			}
		}, 1000);
	});

	onDestroy(() => {
		clearInterval(fetchTimer);
		clearInterval(activeTrainsTimer);
		clearInterval(countdownTimer);
		if (animFrameId) cancelAnimationFrame(animFrameId);
		if (gpsWatchId !== null) navigator.geolocation.clearWatch(gpsWatchId);
	});
</script>

<svelte:head>
	<title>TrackRL • Live Train Radar</title>
	<link
		rel="stylesheet"
		href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
	/>
</svelte:head>

<!-- FULLSCREEN MAP HERO CANVAS -->
<div class="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
	<!-- LEAFLET MAP ELEMENT (Always 100vw x 100vh) -->
	<div bind:this={mapElement} class="absolute inset-0 z-0 h-full w-full"></div>

	<!-- TOP FLOATING DECK (Branding, Search Bar & Category Filters) -->
	<div class="absolute top-3 left-3 right-3 md:left-4 md:right-auto md:w-[420px] z-20 flex flex-col gap-2.5 pointer-events-none">
		<!-- Main Floating Bar -->
		<div class="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-2.5 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800/80 pointer-events-auto transition-colors flex flex-col gap-2">
			<!-- Header Row -->
			<div class="flex items-center justify-between px-1">
				<div class="flex items-center gap-2">
					<img
						src="/logo.png"
						alt="TrackRL Logo"
						class="w-7 h-7 object-contain drop-shadow"
					/>
					<div class="flex items-center gap-1.5">
						<span class="font-black text-sm tracking-tight text-slate-900 dark:text-white">
							TrackRL
						</span>
						<span class="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
							<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
							Live
						</span>
					</div>
				</div>

				<!-- Action Buttons -->
				<div class="flex items-center gap-1">
					<button
						onclick={() => (showGpsModal = true)}
						title="Lagi di Kereta? Bagikan Sinyal GPS (Crowdsource Anonim)"
						class="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all {isGpsSharing
							? 'bg-red-500 hover:bg-red-600 text-white animate-pulse shadow-sm'
							: 'bg-emerald-500/10 hover:bg-emerald-500 text-emerald-700 dark:text-emerald-300 hover:text-white'}"
					>
						<span>📡</span>
						<span class="hidden sm:inline">{isGpsSharing ? "GPS Aktif" : "Bagi GPS"}</span>
					</button>

					<button
						onclick={detectUserLocation}
						title="Stasiun Terdekat Saya"
						class="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
						aria-label="Cari Stasiun Terdekat"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
						</svg>
					</button>

					<button
						onclick={() => toggleDarkMode()}
						title="Ganti Tema Gelap/Terang"
						class="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
						aria-label="Toggle Dark Mode"
					>
						{#if isDarkMode}
							<svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
							</svg>
						{:else}
							<svg class="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
							</svg>
						{/if}
					</button>

					<button
						onclick={() => (showCopyright = !showCopyright)}
						title="Informasi Data"
						class="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
						aria-label="Info"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</button>
				</div>
			</div>

			<!-- Search Bar -->
			<div class="relative">
				<div class="relative flex items-center">
					<input
						id="station-search"
						type="text"
						bind:value={searchQuery}
						onfocus={() => (dropdownOpen = true)}
						placeholder="Cari stasiun atau nomor kereta..."
						class="w-full bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-semibold rounded-xl pl-8 pr-8 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white dark:focus:bg-slate-800 transition-all shadow-inner"
					/>
					<div class="pointer-events-none absolute left-2.5 flex items-center text-slate-400">
						<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
						</svg>
					</div>

					{#if searchQuery.trim() !== ""}
						<button
							onclick={() => {
								searchQuery = "";
								dropdownOpen = false;
							}}
							aria-label="Hapus pencarian"
							class="absolute right-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
						>
							<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					{/if}
				</div>

				<!-- Search Dropdown Results -->
				{#if dropdownOpen}
					<div class="absolute left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-h-72 overflow-y-auto z-50 animate-in fade-in slide-in-from-top-1">
						<!-- Matching Active Trains -->
						{#if matchingTrainsSearch.length > 0}
							<div class="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-800/50">
								Kereta Sedang Berjalan
							</div>
							{#each matchingTrainsSearch as train}
								<button
									class="w-full text-left px-3 py-2 hover:bg-teal-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800 flex items-center justify-between"
									onmousedown={(e) => {
										e.preventDefault();
										flyToTrain(train.id);
										dropdownOpen = false;
									}}
								>
									<div class="flex items-center gap-2">
										<span class="text-sm">🚄</span>
										<div>
											<div class="font-bold text-xs text-slate-800 dark:text-slate-100">
												{formatTrainId(train.id)} &bull; Tujuan {train.destination}
											</div>
											<div class="text-[10px] text-slate-500">
												{train.fromStation} &rarr; {train.toStation}
											</div>
										</div>
									</div>
									<span class="text-[9px] px-2 py-0.5 rounded font-black uppercase {lineColors[train.line] || 'bg-slate-500 text-white'}">
										{train.line}
									</span>
								</button>
							{/each}
						{/if}

						<!-- Matching Stations -->
						<div class="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-800/50">
							Stasiun
						</div>
						{#if filteredStations.length === 0 && matchingTrainsSearch.length === 0}
							<div class="px-3 py-3 text-center text-xs text-slate-400">
								Tidak ada stasiun atau kereta yang cocok
							</div>
						{/if}
						{#each filteredStations as station}
							<button
								class="w-full text-left px-3 py-2 hover:bg-teal-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800/50 last:border-0 flex items-center justify-between"
								onmousedown={(e) => {
									e.preventDefault();
									selectStation(station.id);
								}}
							>
								<div class="flex items-center gap-2">
									<span class="text-sm">🚉</span>
									<span class="text-xs font-semibold text-slate-800 dark:text-slate-100">
										{station.name}
									</span>
								</div>
								<span class="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500">
									{station.id}
								</span>
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<!-- CATEGORY PILL FILTERS -->
			<div class="flex items-center gap-1.5 overflow-x-auto pt-0.5 pb-1 no-scrollbar">
				{#each ["Semua", "KRL", "MRT", "LRT", "Antarkota", "Lokal", "Whoosh", "Bandara"] as cat}
					<button
						onclick={() => (selectedCategory = cat as any)}
						class="flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all {selectedCategory === cat
							? 'bg-slate-900 text-white dark:bg-teal-400 dark:text-slate-950 shadow-sm'
							: 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:bg-slate-800'}"
					>
						{cat}
					</button>
				{/each}
			</div>
		</div>

		<!-- Info Modal Popup -->
		{#if showCopyright}
			<div class="bg-slate-900/95 text-teal-50 text-xs p-3.5 rounded-xl shadow-2xl border border-teal-700/50 pointer-events-auto animate-in fade-in zoom-in-95 backdrop-blur-md">
				<div class="flex items-center justify-between mb-1">
					<strong class="font-bold text-teal-300">TrackRL • GAPEKA Live</strong>
					<button onclick={() => (showCopyright = false)} class="text-teal-400 hover:text-white">✕</button>
				</div>
				<p class="text-[11px] text-slate-300">
					Data jadwal diolah berdasarkan GAPEKA KAI, KCI, KCIC Whoosh, LRT Jabodebek/Jakarta/Sumsel, & MRT Jakarta (Pembaruan 2026).
				</p>
			</div>
		{/if}
	</div>

	<!-- FLOATING MAP CONTROLS (Right side: Layers, Location, Zoom, Reset) -->
	<div class="absolute right-3 bottom-24 md:bottom-6 z-20 flex flex-col gap-2">
		<!-- LAYER SWITCHER BUTTON & MENU -->
		<div class="relative">
			<button
				onclick={() => (showLayerMenu = !showLayerMenu)}
				title="Pilihan Peta & Layer"
				class="w-10 h-10 rounded-xl bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 backdrop-blur-md shadow-lg border border-slate-200/80 dark:border-slate-800 flex items-center justify-center hover:scale-105 active:scale-95 transition-all {showLayerMenu ? 'ring-2 ring-teal-500 text-teal-600 dark:text-teal-400' : ''}"
				aria-label="Pilihan Peta dan Layer"
			>
				<svg class="w-5 h-5 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
				</svg>
			</button>

			<!-- LAYER SWITCHER POPUP MENU -->
			{#if showLayerMenu}
				<div class="absolute right-12 bottom-0 w-64 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 z-50 animate-in fade-in slide-in-from-right-2">
					<div class="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
						<span class="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Peta & Layer</span>
						<button
							onclick={() => (showLayerMenu = false)}
							class="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
							aria-label="Tutup Menu Layer"
						>
							✕
						</button>
					</div>

					<!-- Basemaps Selection -->
					<div class="space-y-1 mb-3">
						<span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1">Basemap</span>

						<button
							onclick={() => setBasemap("satellite")}
							class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all {currentBasemap === 'satellite' ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/30 font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}"
						>
							<span class="flex items-center gap-2">
								<span class="text-sm">🛰️</span> ESRI Satelit
							</span>
							{#if currentBasemap === "satellite"}
								<span class="text-teal-500 font-bold">✓</span>
							{/if}
						</button>

						<button
							onclick={() => setBasemap("dark")}
							class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all {currentBasemap === 'dark' ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/30 font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}"
						>
							<span class="flex items-center gap-2">
								<span class="text-sm">🌑</span> Carto Dark
							</span>
							{#if currentBasemap === "dark"}
								<span class="text-teal-500 font-bold">✓</span>
							{/if}
						</button>

						<button
							onclick={() => setBasemap("light")}
							class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all {currentBasemap === 'light' ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/30 font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}"
						>
							<span class="flex items-center gap-2">
								<span class="text-sm">☀️</span> Carto Light
							</span>
							{#if currentBasemap === "light"}
								<span class="text-teal-500 font-bold">✓</span>
							{/if}
						</button>
					</div>

					<!-- Overlay Toggle -->
					<div class="pt-2 border-t border-slate-100 dark:border-slate-800">
						<span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1 mb-1.5">Overlay Rel Kereta</span>
						<button
							onclick={toggleRailwayOverlay}
							class="w-full flex items-center justify-between p-2 rounded-xl text-left bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 transition-colors border border-slate-200/50 dark:border-slate-700/50"
						>
							<div class="flex items-center gap-2">
								<span class="text-sm">🛤️</span>
								<div>
									<div class="text-xs font-bold text-slate-800 dark:text-slate-200">OpenRailwayMap</div>
									<div class="text-[10px] text-slate-500 dark:text-slate-400">Jalur rel & sinyal dunia</div>
								</div>
							</div>
							<div class="w-8 h-4 rounded-full transition-colors relative flex items-center {showRailwayOverlay ? 'bg-teal-500' : 'bg-slate-300 dark:bg-slate-600'}">
								<div class="w-3.5 h-3.5 rounded-full bg-white transition-transform {showRailwayOverlay ? 'translate-x-4' : 'translate-x-0.5'}"></div>
							</div>
						</button>
					</div>
				</div>
			{/if}
		</div>

		<!-- CROWDSOURCE GPS BUTTON -->
		<button
			onclick={() => (showGpsModal = true)}
			title="Lagi di Kereta? Bagikan Sinyal GPS (Anonim)"
			class="w-10 h-10 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-lg border border-slate-200/80 dark:border-slate-800 flex items-center justify-center hover:scale-105 active:scale-95 transition-all text-sm {isGpsSharing
				? 'ring-2 ring-emerald-500 text-emerald-500 animate-pulse'
				: 'text-slate-700 dark:text-slate-200'}"
			aria-label="Bagi Lokasi GPS Kereta"
		>
			📡
		</button>

		<button
			onclick={detectUserLocation}
			title="Stasiun Terdekat"
			class="w-10 h-10 rounded-xl bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 backdrop-blur-md shadow-lg border border-slate-200/80 dark:border-slate-800 flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
			aria-label="Lokasi Saya"
		>
			<svg class="w-5 h-5 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
			</svg>
		</button>

		<button
			onclick={zoomIn}
			title="Perbesar Peta"
			class="w-10 h-10 rounded-xl bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 backdrop-blur-md shadow-lg border border-slate-200/80 dark:border-slate-800 flex items-center justify-center hover:scale-105 active:scale-95 transition-all font-bold text-lg"
			aria-label="Zoom In"
		>
			+
		</button>

		<button
			onclick={zoomOut}
			title="Perkecil Peta"
			class="w-10 h-10 rounded-xl bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 backdrop-blur-md shadow-lg border border-slate-200/80 dark:border-slate-800 flex items-center justify-center hover:scale-105 active:scale-95 transition-all font-bold text-lg"
			aria-label="Zoom Out"
		>
			&minus;
		</button>

		<button
			onclick={resetMap}
			title="Pusatkan Peta (Jakarta)"
			class="w-10 h-10 rounded-xl bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 backdrop-blur-md shadow-lg border border-slate-200/80 dark:border-slate-800 flex items-center justify-center hover:scale-105 active:scale-95 transition-all text-sm"
			aria-label="Reset View"
		>
			🎯
		</button>
	</div>

	<!-- BOTTOM SHEET (MOBILE) / FLOATING SIDEBAR DRAWER (DESKTOP) -->
	{#if isDrawerOpen}
		<aside
			class="fixed inset-x-0 bottom-0 max-h-[75vh] md:max-h-[calc(100vh-190px)] md:inset-auto md:top-[168px] md:left-4 md:bottom-4 md:w-[420px] z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-t-3xl md:rounded-2xl shadow-2xl border-t md:border border-slate-200/80 dark:border-slate-800/80 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300 transition-colors"
		>
			<!-- Mobile Drag Bar -->
			<div class="md:hidden pt-2.5 pb-1 flex justify-center">
				<div class="w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full"></div>
			</div>

			<!-- Drawer Header & Mode Tabs -->
			<div class="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
				<!-- Drawer Tabs -->
				<div class="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
					<button
						onclick={() => (drawerTab = "station")}
						class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all {drawerTab === 'station'
							? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
							: 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}"
					>
						🚉 {selectedStationId ? `Stasiun ${selectedStationId}` : "Pilih Stasiun"}
					</button>

					<button
						onclick={() => (drawerTab = "active")}
						class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 {drawerTab === 'active'
							? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
							: 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}"
					>
						<span>🚄 Kereta Aktif</span>
						<span class="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500 text-white font-mono">
							{filteredActiveTrains.length}
						</span>
					</button>
				</div>

				<!-- Close / Minimize Button -->
				<button
					onclick={() => (isDrawerOpen = false)}
					class="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
					title="Tutup Panel"
					aria-label="Tutup"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<!-- Drawer Scrollable Content -->
			<div class="flex-1 overflow-y-auto p-4 space-y-4">
				{#if drawerTab === "station"}
					{#if !selectedStationId}
						<div class="py-10 flex flex-col items-center justify-center text-center text-slate-400">
							<div class="text-3xl mb-2">🗺️</div>
							<div class="font-bold text-sm text-slate-700 dark:text-slate-300">
								Pilih Stasiun di Peta
							</div>
							<div class="text-xs text-slate-400 max-w-xs mt-1">
								Klik marker stasiun di peta atau cari pada kolom pencarian di atas untuk melihat jadwal keberangkatan.
							</div>
						</div>
					{:else}
						<!-- Station Info Bar -->
						<div class="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
							<div>
								<div class="text-sm font-black text-slate-900 dark:text-white">
									{stations.find((s) => s.id === selectedStationId)?.name || selectedStationId}
								</div>
								<div class="text-[10px] text-slate-500 font-mono mt-0.5">
									Kode: <span class="font-bold">{selectedStationId}</span> &bull; {stations.find((s) => s.id === selectedStationId)?.type || "KRL"}
								</div>
							</div>

							{#if lastUpdated}
								<div class="text-[9px] text-right text-slate-400">
									<div>Diperbarui</div>
									<div class="font-mono font-bold text-slate-600 dark:text-slate-300">
										{lastUpdated.toLocaleTimeString("en-GB")} WIB
									</div>
								</div>
							{/if}
						</div>

						<!-- Train Departures Feed -->
						{#if isLoading}
							<div class="py-12 flex flex-col items-center justify-center gap-2">
								<div class="w-6 h-6 border-2 border-teal-500/20 border-t-teal-500 rounded-full animate-spin"></div>
								<div class="text-xs text-slate-400">Memuat jadwal stasiun...</div>
							</div>
						{:else if filteredTrainsList.length === 0}
							<div class="py-8 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4">
								<div class="text-2xl mb-1">🚉</div>
								<div class="text-xs font-semibold text-slate-600 dark:text-slate-300">
									Tidak ada jadwal kereta terdekat
								</div>
								<div class="text-[10px] text-slate-400 mt-0.5">
									Kereta terakhir mungkin sudah berangkat atau belum aktif.
								</div>
							</div>
						{:else}
							<div class="space-y-2">
								{#each filteredTrainsList as train (train.id)}
									<div class="bg-slate-50 dark:bg-slate-800/70 rounded-xl p-3 flex items-center gap-3 border border-slate-100 dark:border-slate-800 hover:border-teal-500/30 transition-all">
										<div class="w-1 self-stretch rounded-full flex-shrink-0 {lineColors[train.line] || 'bg-slate-400'}"></div>

										<div class="font-mono text-base font-bold text-slate-900 dark:text-slate-100 min-w-[44px]">
											{train.scheduled_time}
										</div>

										<div class="flex-1 min-w-0">
											<div class="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase truncate">
												{train.destination}
											</div>
											<div class="text-[10px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-1">
												<span class="font-mono">{formatTrainId(train.id)}</span>
												{#if train.status === "arrived"}
													<span class="text-emerald-600 dark:text-emerald-400 font-semibold">&bull; Sudah Tiba</span>
												{:else if activeTrains.find((t) => t.id === train.id)}
													{@const activeInfo = activeTrains.find((t) => t.id === train.id)}
													<span class="text-purple-600 dark:text-purple-400 font-medium">
														&bull; dari {stations.find((s) => s.id === activeInfo?.fromStation)?.name || activeInfo?.fromStation}
													</span>
												{/if}
											</div>
										</div>

										<div class="flex flex-col items-end gap-1.5 flex-shrink-0">
											{#if train.status === "arrived"}
												<span class="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-500 text-white">
													Tiba
												</span>
											{:else if train.status === "boarding_soon"}
												<span class="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-amber-400 text-slate-950">
													Segera
												</span>
											{:else}
												<span class="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
													{getCountdownText(train)}
												</span>
											{/if}

											<button
												onclick={() => flyToTrain(train.id)}
												class="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-teal-500/10 hover:bg-teal-500 text-teal-700 dark:text-teal-300 hover:text-white transition-colors"
											>
												View ➔
											</button>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					{/if}
				{:else}
					<!-- ACTIVE TRAINS LIST TAB -->
					<div class="space-y-2">
						<div class="flex items-center justify-between text-xs text-slate-500 px-1 mb-1">
							<span>Kereta Berjalan Real-Time</span>
							<span class="font-mono font-bold text-slate-700 dark:text-slate-300">
								{filteredActiveTrains.length} Armada
							</span>
						</div>

						{#if filteredActiveTrains.length === 0}
							<div class="py-10 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4">
								<div class="text-2xl mb-1">🚄</div>
								<div class="text-xs font-semibold text-slate-600 dark:text-slate-300">
									Tidak ada kereta aktif pada kategori ini
								</div>
								<div class="text-[10px] text-slate-400 mt-0.5">
									Coba pilih kategori "Semua" pada pill filter di atas.
								</div>
							</div>
						{:else}
							{#each filteredActiveTrains as train (train.id)}
								<div class="bg-slate-50 dark:bg-slate-800/70 rounded-xl p-3 flex items-center justify-between gap-3 border border-slate-100 dark:border-slate-800 hover:border-teal-500/30 transition-all">
									<div class="flex items-center gap-3 min-w-0">
										<div class="w-1 self-stretch rounded-full flex-shrink-0 {lineColors[train.line] || 'bg-slate-400'}"></div>
										<div class="min-w-0">
											<div class="flex items-center gap-1.5">
												<span class="font-mono font-bold text-xs text-slate-900 dark:text-slate-100">
													{formatTrainId(train.id)}
												</span>
												<span class="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase {lineColors[train.line] || 'bg-slate-500 text-white'}">
													{train.line}
												</span>
											</div>
											<div class="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate mt-0.5">
												{#if train.origin}
													{train.origin} &rarr; {train.destination}
												{:else}
													Tujuan {train.destination}
												{/if}
											</div>
											<div class="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1.5 flex-wrap">
												<span>{train.fromStation} &rarr; {train.toStation} ({Math.round(train.progress * 100)}%)</span>
												{#if train._currentSpeed !== undefined}
													<span class="text-slate-300 dark:text-slate-600">&bull;</span>
													<span class="font-bold {train._currentSpeed > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}">
														⚡ {train._currentSpeed > 0 ? `~${train._currentSpeed} km/j` : '0 km/j'}
													</span>
												{/if}
											</div>
										</div>
									</div>

									<button
										onclick={() => flyToTrain(train.id)}
										class="px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-500/10 hover:bg-teal-500 text-teal-700 dark:text-teal-300 hover:text-white transition-all flex items-center gap-1 flex-shrink-0"
									>
										<span>Lacak</span>
										<span>➔</span>
									</button>
								</div>
							{/each}
						{/if}
					</div>
				{/if}
			</div>
		</aside>
	{:else}
		<!-- Floating Button to Re-Open Drawer -->
		<button
			onclick={() => (isDrawerOpen = true)}
			class="absolute left-3 bottom-6 md:left-4 z-20 bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-white backdrop-blur-md px-3.5 py-2.5 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all text-xs font-bold"
		>
			<span>🚉</span>
			<span>{selectedStationId ? `Stasiun ${selectedStationId}` : "Buka Panel Jadwal"}</span>
			<span class="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500 text-white font-mono">
				{filteredActiveTrains.length} KA
			</span>
		</button>
	{/if}

	<!-- FLOATING LIVE GPS BROADCAST BANNER -->
	{#if isGpsSharing}
		<div class="fixed top-20 right-3 z-30 bg-slate-950/90 text-white backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-2xl border border-emerald-500/40 flex items-center gap-3 animate-in slide-in-from-top-2">
			<span class="relative flex h-2.5 w-2.5 flex-shrink-0">
				<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
				<span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
			</span>
			<div class="text-[11px]">
				<div class="font-bold flex items-center gap-1.5 text-white">
					<span>LIVE GPS BROADCAST</span>
					{#if lastGpsPingInfo?.speed !== undefined}
						<span class="text-emerald-400 font-mono text-[10px] font-black">{lastGpsPingInfo.speed} km/h</span>
					{/if}
				</div>
				<div class="text-[10px] text-slate-300">
					{gpsStatusMessage}
				</div>
			</div>
			<button
				onclick={stopGpsSharing}
				class="ml-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-red-500/20 text-red-300 hover:bg-red-500 hover:text-white transition-colors"
			>
				Stop
			</button>
		</div>
	{/if}

	<!-- MODAL: BAGI LOKASI KERETA (CROWDSOURCING ANONIM) -->
	{#if showGpsModal}
		<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
			<div class="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 flex flex-col gap-4">
				<div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
					<div class="flex items-center gap-2">
						<span class="text-xl">📡</span>
						<div>
							<h3 class="font-black text-sm">Bagi Lokasi Kereta</h3>
							<p class="text-[10px] text-slate-500 dark:text-slate-400">Crowdsourcing GPS Anonim 100% Gratis</p>
						</div>
					</div>
					<button onclick={() => (showGpsModal = false)} class="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm">✕</button>
				</div>

				<p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
					Sedang berada di dalam kereta? Aktifkan sinyal GPS untuk memvalidasi posisi kereta real-time di radar peta bagi seluruh pengguna.
				</p>

				<div class="space-y-1.5">
					<label for="gps-train-select" class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Kereta</label>
					<select
						id="gps-train-select"
						bind:value={selectedGpsTrainId}
						class="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs rounded-xl p-2.5 text-slate-800 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
					>
						<option value="">🎯 Deteksi Otomatis Kereta Terdekat</option>
						{#each activeTrains as t}
							<option value={t.id}>🚄 KA {t.id} - Tujuan {t.destination} ({t.line})</option>
						{/each}
					</select>
				</div>

				<div class="bg-teal-50 dark:bg-teal-950/40 border border-teal-500/20 rounded-xl p-2.5 text-[11px] text-teal-800 dark:text-teal-200 flex items-start gap-2">
					<span class="text-sm">🔒</span>
					<span><b>Privasi Anonim:</b> Tanpa registrasi, koordinat Anda hanya tersimpan dalam memori aktif selama 60 detik dan tidak disimpan permanen.</span>
				</div>

				<div class="flex items-center gap-2 pt-1">
					{#if isGpsSharing}
						<button
							onclick={stopGpsSharing}
							class="w-full py-2.5 rounded-xl font-bold text-xs bg-red-600 hover:bg-red-700 text-white transition-all shadow-md flex items-center justify-center gap-2"
						>
							<span>Hentikan Berbagi Lokasi</span>
							<span>⏹️</span>
						</button>
					{:else}
						<button
							onclick={startGpsSharing}
							class="w-full py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-md flex items-center justify-center gap-2"
						>
							<span>Mulai Bagikan Sinyal GPS</span>
							<span>🚀</span>
						</button>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	/* Hide standard scrollbar in pill filters */
	.no-scrollbar::-webkit-scrollbar {
		display: none;
	}
	.no-scrollbar {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
	/* Radar train marker styling (override Leaflet default divIcon square border/bg) */
	:global(.custom-train-marker) {
		background: transparent !important;
		border: none !important;
		transition: transform 0.08s linear !important;
		will-change: transform !important;
	}
</style>
