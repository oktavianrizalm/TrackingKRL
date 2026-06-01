const fs = require('fs');

// Read the new detailed coords
const mrtCoords = JSON.parse(fs.readFileSync('d:/side/Commuter Tracking/static/mrt-detailed-route.json', 'utf8'));

// Read existing krl-routes
const krlPath = 'd:/side/Commuter Tracking/static/krl-routes.geojson';
const krlData = JSON.parse(fs.readFileSync(krlPath, 'utf8'));

// Remove any existing MRT lines
krlData.features = krlData.features.filter(f => f.properties.line !== 'MRT');

// Add the detailed MRT line
krlData.features.push({
    type: 'Feature',
    properties: { colour: '#1e40af', line: 'MRT' },
    geometry: { type: 'LineString', coordinates: mrtCoords }
});

fs.writeFileSync(krlPath, JSON.stringify(krlData, null, 2));
console.log("Injected detailed MRT track into krl-routes.geojson!");
