const https = require('https');
const fs = require('fs');
const path = require('path');

const query = `
[out:json][timeout:120];
area["ISO3166-1"="ID"]->.indonesia;
(
  node["railway"="station"](area.indonesia);
  node["railway"="halt"](area.indonesia);
  way["railway"="station"](area.indonesia);
);
out center tags;
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
        'User-Agent': 'TrackRL-Stations-Extractor/1.0'
      },
      timeout: 90000
    };

    const req = https.request(options, (res) => {
      console.log(`Response status from ${host}: ${res.statusCode}`);
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
      }

      let rawData = '';
      res.on('data', chunk => rawData += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(rawData);
          resolve(parsed);
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('timeout', () => req.destroy(new Error('Request timed out')));
    req.on('error', err => reject(err));
    req.write(postData);
    req.end();
  });
}

function cleanStationName(rawName) {
  if (!rawName) return '';
  let name = rawName.trim();
  // Strip common redundant prefixes if they exist (e.g. "Stasiun ", "Halte ")
  name = name.replace(/^Stasiun\s+(Kereta\s+Api\s+)?/i, '');
  name = name.replace(/^Halte\s+/i, '');
  return name.trim();
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
    console.error('Could not fetch station data.');
    process.exit(1);
  }

  console.log(`Fetched ${osmData.elements.length} raw elements from Overpass API.`);

  // Map of normalized station name -> Station Object
  const stationsMap = new Map();

  for (const el of osmData.elements) {
    const tags = el.tags || {};
    let rawName = tags.name || tags['name:id'] || tags['name:en'];
    if (!rawName) continue;

    // Filter out obvious non-railway or amusement park stations
    if (tags.tourism === 'theme_park' || tags.attraction || tags.aerialway) continue;

    const name = cleanStationName(rawName);
    if (!name || name.length < 2) continue;

    const lat = el.lat || el.center?.lat;
    const lon = el.lon || el.center?.lon;
    if (typeof lat !== 'number' || typeof lon !== 'number') continue;

    const code = (tags['railway:ref'] || tags.ref || '').toUpperCase();
    const operator = tags.operator || tags.network || 'KAI';
    const isHighspeed = tags.highspeed === 'yes' || tags.network?.includes('Whoosh') || name.includes('Whoosh');
    const isMrt = tags.network?.includes('MRT') || operator.includes('MRT') || name.includes('MRT');
    const isLrt = tags.network?.includes('LRT') || operator.includes('LRT') || name.includes('LRT');

    let island = '';
    // Jawa: lon ~105.7 to 114.6, lat -5.8 to -8.9
    if (lon >= 105.8 && lon <= 114.8 && lat <= -5.8 && lat >= -9.0) {
      island = 'Jawa';
    } else if (lon >= 95.0 && lon <= 106.2 && lat >= -6.0 && lat <= 6.0) {
      island = 'Sumatera';
    }

    if (!island) continue; // Only Java and Sumatra

    const key = name.toLowerCase();

    // Prefer node over way, or one with code
    if (!stationsMap.has(key) || (!stationsMap.get(key).code && code)) {
      stationsMap.set(key, {
        id: code || name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase(),
        name,
        code,
        coords: [lat, lon],
        island,
        type: isHighspeed ? 'Whoosh' : isMrt ? 'MRT' : isLrt ? 'LRT' : 'KAI',
        network: tags.network || tags.operator || ''
      });
    }
  }

  const stationList = Array.from(stationsMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  console.log(`\nSuccessfully processed ${stationList.length} unique railway stations!`);
  const jawaCount = stationList.filter(s => s.island === 'Jawa').length;
  const sumateraCount = stationList.filter(s => s.island === 'Sumatera').length;
  console.log(`- Pulau Jawa: ${jawaCount} stasiun`);
  console.log(`- Pulau Sumatera: ${sumateraCount} stasiun`);

  // 1. Output comprehensive JSON: static/data/all-national-stations.json
  const outDir = path.resolve('static/data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const outFile = path.join(outDir, 'all-national-stations.json');
  fs.writeFileSync(outFile, JSON.stringify(stationList, null, 2));
  console.log(`Saved detailed list to ${outFile}`);

  // 2. Output key-value coordinate dictionary: static/all-stations.json
  // Name -> [lat, lng] for instant map lookup
  const coordsDict = {};
  for (const s of stationList) {
    coordsDict[s.name] = s.coords;
    if (s.code) {
      coordsDict[s.code] = s.coords;
    }
  }

  // Preserve existing Jabodetabek station names to avoid breaking existing mappings
  const existingPath = path.resolve('static/all-stations.json');
  if (fs.existsSync(existingPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(existingPath, 'utf8'));
      for (const [k, v] of Object.entries(existing)) {
        if (!coordsDict[k]) coordsDict[k] = v;
      }
    } catch {}
  }

  fs.writeFileSync(existingPath, JSON.stringify(coordsDict, null, 2));
  console.log(`Updated ${existingPath} with ${Object.keys(coordsDict).length} station coordinate entries.`);
}

main();
