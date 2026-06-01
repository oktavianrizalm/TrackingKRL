const fs = require('fs');

const stations = [
    [-6.2892744, 106.7749355],  // LBB
    [-6.2924511, 106.7924644],  // FTM
    [-6.2783596, 106.7973159],  // CPR
    [-6.2666947, 106.7973262],  // HJN
    [-6.2557793, 106.7971403],  // BLA
    [-6.2444643, 106.7981332],  // BLM
    [-6.2387737, 106.7984457],  // ASN
    [-6.2267337, 106.8024926],  // SNY
    [-6.22239, 106.8086229],    // IST
    [-6.2150263, 106.8179484],  // BNH
    [-6.2090648, 106.8216945],  // STB
    [-6.2007957, 106.822788],   // DKA
    [-6.1918644, 106.8230084]   // BHI
];

async function fetchRoute() {
    let fullCoords = [];
    
    // OSRM accepts coordinates as lon,lat
    const coordsStr = stations.map(s => `${s[1]},${s[0]}`).join(';');
    const url = `http://router.project-osrm.org/route/v1/driving/${coordsStr}?geometries=geojson&overview=full`;
    
    console.log("Fetching from OSRM...");
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        // OSRM returns [lon, lat] points in geojson coordinates
        fullCoords = data.routes[0].geometry.coordinates;
        
        // Save as JSON so SvelteKit can read it
        fs.writeFileSync('d:/side/Commuter Tracking/static/mrt-detailed-route.json', JSON.stringify(fullCoords));
        console.log(`Saved ${fullCoords.length} detailed coordinate points!`);
    } else {
        console.error("Failed to fetch route:", data);
    }
}

fetchRoute();
