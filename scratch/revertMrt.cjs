const fs = require('fs');

// Station coordinates
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

// Convert to GeoJSON [lon, lat] format
const straightLineCoords = stations.map(c => [c[1], c[0]]);

const krlPath = 'd:/side/Commuter Tracking/static/krl-routes.geojson';
const krlData = JSON.parse(fs.readFileSync(krlPath, 'utf8'));

// Remove the OSRM line
krlData.features = krlData.features.filter(f => f.properties.line !== 'MRT');

// Add the straight station-to-station line
krlData.features.push({
    type: 'Feature',
    properties: { colour: '#1e40af', line: 'MRT' },
    geometry: { type: 'LineString', coordinates: straightLineCoords }
});

fs.writeFileSync(krlPath, JSON.stringify(krlData, null, 2));
console.log("Reverted MRT path to perfectly straight lines!");
