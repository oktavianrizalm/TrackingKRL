const fs = require('fs');
const data = JSON.parse(fs.readFileSync('overpass-result.json', 'utf8'));

let mrtRelation = null;
for (const element of data.elements) {
  if (element.type === 'relation' && element.tags && element.tags.name && element.tags.name.includes('MRT')) {
    mrtRelation = element;
    break;
  }
}

if (!mrtRelation) {
  console.log("No MRT relation found!");
} else {
  // Extract all coordinates from ways
  const allCoords = [];
  
  for (const member of mrtRelation.members) {
    if (member.type === 'way' && member.geometry) {
      // Overpass gives [{lat, lon}, ...]
      for (const node of member.geometry) {
        allCoords.push([node.lon, node.lat]);
      }
    }
  }
  
  // Create a GeoJSON Feature
  const feature = {
    type: 'Feature',
    properties: { colour: '#1e40af', line: 'MRT', name: mrtRelation.tags.name },
    geometry: { type: 'LineString', coordinates: allCoords }
  };
  
  // Read existing krl-routes.geojson and inject
  const krlRoutesPath = 'd:/side/Commuter Tracking/static/krl-routes.geojson';
  const krlRoutes = JSON.parse(fs.readFileSync(krlRoutesPath, 'utf8'));
  
  // Remove any previously injected MRT if exists
  krlRoutes.features = krlRoutes.features.filter(f => f.properties.line !== 'MRT');
  
  krlRoutes.features.push(feature);
  
  fs.writeFileSync(krlRoutesPath, JSON.stringify(krlRoutes, null, 2));
  console.log("Successfully injected MRT geometry into krl-routes.geojson!");
}
