const https = require('https');
const fs = require('fs');
const path = require('path');

const query = `
[out:json][timeout:180];
(
  way["railway"="rail"]["usage"="main"](-9.0, 95.0, -5.0, 115.0);
  way["railway"="rail"]["highspeed"="yes"](-9.0, 95.0, -5.0, 115.0);
  node["railway"="station"](-9.0, 95.0, -5.0, 115.0);
);
out geom;
`;

const endpoints = [
  'overpass-api.de',
  'lz4.overpass-api.de',
  'overpass.kumi.systems'
];

async function fetchFromEndpoint(host) {
  return new Promise((resolve, reject) => {
    console.log(`Connecting to ${host}...`);
    const postData = 'data=' + encodeURIComponent(query);
    
    const options = {
      hostname: host,
      path: '/api/interpreter',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'TrackRL-Extraction/1.0 (https://github.com/oktaviandi/commuter-tracking)'
      },
      timeout: 120000
    };

    const req = https.request(options, (res) => {
      console.log(`Response status from ${host}: ${res.statusCode}`);
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
      }

      let rawData = '';
      let receivedBytes = 0;
      res.on('data', (chunk) => {
        rawData += chunk;
        receivedBytes += chunk.length;
        if (receivedBytes % (1024 * 512) < chunk.length) {
          process.stdout.write(`Downloaded ${(receivedBytes / (1024 * 1024)).toFixed(2)} MB...\r`);
        }
      });

      res.on('end', () => {
        console.log(`\nFinished downloading ${(receivedBytes / (1024 * 1024)).toFixed(2)} MB from ${host}.`);
        try {
          const parsed = JSON.parse(rawData);
          resolve(parsed);
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('timeout', () => {
      req.destroy(new Error('Request timed out'));
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

function osmToGeoJson(osmData) {
  const features = [];
  const nodesMap = new Map();

  // First pass: index nodes if geometry is separate
  for (const el of osmData.elements) {
    if (el.type === 'node') {
      nodesMap.set(el.id, [el.lon, el.lat]);
      if (el.tags && (el.tags.railway === 'station' || el.tags.name)) {
        features.push({
          type: 'Feature',
          id: `node/${el.id}`,
          properties: {
            id: el.id,
            osm_type: 'node',
            name: el.tags.name || '',
            railway: el.tags.railway,
            ...el.tags
          },
          geometry: {
            type: 'Point',
            coordinates: [el.lon, el.lat]
          }
        });
      }
    }
  }

  // Second pass: ways
  for (const el of osmData.elements) {
    if (el.type === 'way') {
      let coords = [];
      if (el.geometry && Array.isArray(el.geometry)) {
        coords = el.geometry.map(pt => [pt.lon, pt.lat]);
      } else if (el.nodes && Array.isArray(el.nodes)) {
        coords = el.nodes.map(nodeId => nodesMap.get(nodeId)).filter(Boolean);
      }

      if (coords.length >= 2) {
        features.push({
          type: 'Feature',
          id: `way/${el.id}`,
          properties: {
            id: el.id,
            osm_type: 'way',
            name: el.tags?.name || '',
            railway: el.tags?.railway || 'rail',
            usage: el.tags?.usage || '',
            highspeed: el.tags?.highspeed || '',
            ...el.tags
          },
          geometry: {
            type: 'LineString',
            coordinates: coords
          }
        });
      }
    }
  }

  return {
    type: 'FeatureCollection',
    generator: 'TrackRL Overpass Extractor',
    features
  };
}

async function main() {
  let osmData = null;
  for (const host of endpoints) {
    try {
      osmData = await fetchFromEndpoint(host);
      break;
    } catch (err) {
      console.warn(`Failed with ${host}: ${err.message}. Trying next...`);
    }
  }

  if (!osmData || !osmData.elements) {
    console.error('Could not fetch valid OSM data from any endpoint.');
    process.exit(1);
  }

  console.log(`Fetched ${osmData.elements.length} OSM elements. Converting to GeoJSON...`);
  const geojson = osmToGeoJson(osmData);
  console.log(`Generated ${geojson.features.length} GeoJSON features.`);

  const outDir = path.resolve('static/data');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outFile = path.join(outDir, 'indonesia-railway.geojson');
  fs.writeFileSync(outFile, JSON.stringify(geojson));
  const stats = fs.statSync(outFile);
  console.log(`Saved ${outFile} (${(stats.size / (1024 * 1024)).toFixed(2)} MB).`);
}

main();
