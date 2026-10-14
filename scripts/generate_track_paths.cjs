const fs = require('fs');
const turf = require('@turf/turf');

console.log('Loading datasets...');
const railway = JSON.parse(fs.readFileSync('static/data/indonesia-railway.geojson', 'utf8'));
const krlRoutes = JSON.parse(fs.readFileSync('static/krl-routes.geojson', 'utf8'));
const stations = JSON.parse(fs.readFileSync('static/data/all-national-stations.json', 'utf8'));
const natGapeka = JSON.parse(fs.readFileSync('static/data/national-gapeka.json', 'utf8'));
const krlSchedule = JSON.parse(fs.readFileSync('static/schedule.json', 'utf8'));
const mrtSchedule = JSON.parse(fs.readFileSync('static/mrt-schedule.json', 'utf8'));

// Build coordinate lookup
const allStationCoords = {};
stations.forEach(s => {
  const id = s.code || s.id || s.name;
  allStationCoords[id] = s.coords;
  allStationCoords[s.name] = s.coords;
  if (s.code) allStationCoords[s.code] = s.coords;
});

// Whoosh pseudo-waypoints
const WHOOSH_WAYPOINTS = {
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
Object.assign(allStationCoords, WHOOSH_WAYPOINTS);

// Core KRL and MRT stations
const stationCoordinates = {
  JAKK: [-6.1375828, 106.8146203],
  MRI: [-6.2101704, 106.849935],
  BOO: [-6.5942887, 106.7907695],
  DP: [-6.4048263, 106.8170842],
  BKS: [-6.2362143, 106.9987436],
  CKR: [-6.2553138, 107.1450733],
  THB: [-6.1857127, 106.8108938],
  SUD: [-6.2024081, 106.8234493],
  RU: [-6.3527788, 106.2515252],
  SRP: [-6.3201527, 106.6655836],
  TNG: [-6.1769753, 106.6320106],
  DU: [-6.1552764, 106.8012968],
  TPK: [-6.1107, 106.8812],
  KPB: [-6.1327023, 106.8284875],
  JNG: [-6.2149252, 106.8703394],
  LBB: [-6.2892744, 106.7749355],
  FTM: [-6.2924511, 106.7924644],
  CPR: [-6.2783596, 106.7973159],
  HJN: [-6.2666947, 106.7973262],
  BLA: [-6.2557793, 106.7971403],
  BLM: [-6.2444643, 106.7981332],
  ASN: [-6.2387737, 106.7984457],
  SNY: [-6.2267337, 106.8024926],
  IST: [-6.22239, 106.8086229],
  BNH: [-6.2150263, 106.8179484],
  STB: [-6.2090648, 106.8216945],
  DKA: [-6.2007957, 106.822788],
  BHI: [-6.1918644, 106.8230084]
};
Object.assign(allStationCoords, stationCoordinates);

// Common KCI schedule code aliases
const KCI_CODE_ALIASES = {
  POC: [-6.3690593, 106.8320844], // Pondok Cina (PCN)
  KAT: [-6.2009538, 106.8167704], // Karet (KRT)
  THI: [-6.1751701, 106.6467095], // Tanah Tinggi (TTI)
  JTK: [-6.288582, 106.7291463],  // Jurangmangu (JMU)
  TOJB: [-6.0312959, 106.1214599] // Tonjong Baru in Merak line (TOJ)
};
Object.assign(allStationCoords, KCI_CODE_ALIASES);

// Master Rail Spines across Java & Sumatra (ensures 100% of national express train legs are broken down to consecutive stations)
const SPINES = [
  // 1. Pantura (Jakarta - Cirebon - Tegal - Semarang - Cepu - Surabaya Pasarturi)
  ['GMR', 'PSE', 'JNG', 'BKS', 'CKR', 'KW', 'DWN', 'CKP', 'PAB', 'HGL', 'JTB', 'CN', 'CNP', 'WDW', 'BBK', 'LOS', 'TGN', 'BB', 'TG', 'LR', 'PML', 'PTN', 'CO', 'SRI', 'PK', 'BTG', 'UJN', 'KNS', 'PLB', 'KRN', 'WLR', 'KBD', 'SMC', 'SMT', 'BBG', 'NBO', 'RBG', 'CU', 'KPS', 'BJ', 'BBT', 'LMG', 'SBI'],
  
  // 2. Cirebon - Purwokerto - Kroya (Bumiayu Pass)
  ['CN', 'CNP', 'CLD', 'KGG', 'SGG', 'PPK', 'BMA', 'KRT', 'KRR', 'PWT', 'NTG', 'RDN', 'KYA'],
  
  // 3. Priangan Barat (Cikampek - Purwakarta - Sasaksaat - Bandung)
  ['CKP', 'CBR', 'PWK', 'CA', 'SUT', 'PLD', 'CD', 'SKT', 'CLE', 'PDL', 'CMI', 'BD', 'CTH', 'KAC'],
  
  // 4. Priangan Timur & Selatan (Bandung - Tasikmalaya - Banjar - Kroya)
  ['BD', 'KAC', 'RCK', 'CCL', 'NG', 'LL', 'CB', 'WB', 'CPD', 'CAW', 'RJP', 'TSM', 'AW', 'MNJ', 'CI', 'BJG', 'KNP', 'BJR', 'LN', 'MLW', 'SDR', 'GDM', 'KWG', 'JRL', 'KBS', 'KYA'],
  
  // 4b. Garut Branch
  ['CCL', 'NG', 'LL', 'CB', 'PASIR', 'WNR', 'GRT'],
  
  // 4c. Cilacap Branch
  ['CP', 'GM', 'KKD', 'LBG', 'KH', 'MA', 'SKP', 'KYA'],
  
  // 5. Kedu - Mataram (Kroya - Kutoarjo - Yogyakarta - Solo Balapan)
  ['KYA', 'SPH', 'TB', 'IJ', 'GB', 'SRW', 'KM', 'WNS', 'KTA', 'JN', 'WT', 'RWL', 'YK', 'LPN', 'MGW', 'KT', 'PWS', 'SLO'],
  
  // 6. Madiun - Surabaya (Solo - Sragen - Ngawi - Madiun - Nganjuk - Kertosono - Jombang - Mojokerto - Surabaya Gubeng - Surabaya Pasarturi)
  ['SLO', 'PWS', 'PL', 'SR', 'WK', 'KG', 'NGW', 'BBD', 'MN', 'CRB', 'SN', 'BGR', 'NJ', 'SKM', 'BRN', 'KTS', 'PTR', 'SMB', 'JG', 'SBO', 'MR', 'TRK', 'KDN', 'KRN', 'BH', 'SPJ', 'WO', 'SGU', 'SBI'],
  
  // 7. Solo - Gundih - Semarang
  ['SLO', 'SK', 'GDM', 'BBG', 'SMT', 'SMC'],
  
  // 8. Lintas Timur Jawa (Kertosono - Kediri - Tulungagung - Blitar - Wlingi - Malang - Bangil - Sidoarjo - Surabaya Gubeng)
  ['KTS', 'KD', 'TA', 'BL', 'GRM', 'TAL', 'WG', 'KSB', 'PGJ', 'SBP', 'NB', 'KPN', 'PSI', 'MLK', 'ML', 'LW', 'BG', 'SDA', 'WO', 'SGU'],
  
  // 9. Tapal Kuda (Bangil - Probolinggo - Klakah - Tanggul - Jember - Kalibaru - Rogojampi - Banyuwangi - Ketapang)
  ['BG', 'PS', 'RO', 'GI', 'BYM', 'PB', 'LEC', 'RN', 'KK', 'RDA', 'JTR', 'TGL', 'BSS', 'RBP', 'MI', 'JR', 'AJ', 'KLT', 'GRN', 'MRW', 'KBR', 'GLM', 'SWD', 'KSL', 'TGR', 'RGP', 'BWI', 'AGO', 'KTG'],
  
  // 10. Lintas Barat (Jakarta - Rangkasbitung - Serang - Cilegon - Merak)
  ['THB', 'PLM', 'KBY', 'PDJ', 'JMU', 'SDM', 'RU', 'SRP', 'CSK', 'CC', 'PRP', 'CJT', 'DAR', 'TEJ', 'TGS', 'CKY', 'MJ', 'CTR', 'RK', 'SG', 'KRA', 'TOJB', 'CLG', 'KEN', 'MER'],
  
  // 10b. Nambo Branch
  ['CTA', 'PDRG', 'CBN', 'NMO'],
  
  // 11. Whoosh Kereta Cepat Jakarta - Bandung
  ['HLM', 'KCIC_CKR', 'KCIC_KRW', 'KCIC_PWK', 'KCIC_WLN', 'KCIC_CKL', 'KCIC_SKT', 'PDL', 'KCIC_CMI', 'KCIC_KPO', 'KCIC_GDB', 'TGLR'],
  
  // 12. KA Bandara Soekarno-Hatta
  ['MRI', 'SUD', 'BNC', 'DU', 'PSG', 'RW', 'KDS', 'PI', 'BPR', 'BST'],
  
  // 13. KA Bandara YIA (Wates - Bandara YIA)
  ['WT', 'YIA'],
  
  // 14. Sumatera Utara (Medan - Tebing Tinggi - Kisaran - Rantau Prapat)
  ['MDN', 'KNM', 'LBP', 'TBI', 'SIR', 'KIS', 'TNB', 'PBA', 'MBM', 'RAP'],
  ['MDN', 'BIJ'],
  
  // 15. Sumatera Barat (Minangkabau Express & Pariaman)
  ['BIM', 'DUK', 'PD', 'ATR', 'TAB', 'LBY', 'PMN', 'NRS'],
  
  // 16. Sumatera Selatan & Lampung (Kertapati - Prabumulih - Lubuklinggau & Tanjungkarang)
  ['LLG', 'LT', 'ME', 'PBM', 'KPT'],
  ['PBM', 'BTA', 'KB', 'TNK']
];

function findSpinePath(from, to) {
  for (const spine of SPINES) {
    const i1 = spine.indexOf(from);
    const i2 = spine.indexOf(to);
    if (i1 !== -1 && i2 !== -1) {
      if (i1 <= i2) return spine.slice(i1, i2 + 1);
      else return spine.slice(i2, i1 + 1).reverse();
    }
  }
  return null;
}

// Build indexed line structures with bounding boxes for ultra-fast spatial search
function indexLines(rawFeatures, isWhooshFilter = false) {
  const indexed = [];
  rawFeatures.forEach(f => {
    if (!f.geometry || !['LineString', 'MultiLineString'].includes(f.geometry.type)) return;
    const isW = f.properties && f.properties.highspeed === 'yes';
    if (isWhooshFilter !== isW) return;

    const coordsList = f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates;
    coordsList.forEach(coords => {
      if (!coords || coords.length < 2) return;
      let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
      for (const [lng, lat] of coords) {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
      indexed.push({
        coords,
        bbox: [minLng, minLat, maxLng, maxLat]
      });
    });
  });
  return indexed;
}

console.log('Indexing railway tracks...');
const indexedConv = [
  ...indexLines(railway.features, false),
  ...indexLines(krlRoutes.features, false)
];
const indexedWhoosh = indexLines(railway.features, true);

function findNearestOnIndexedTracks(indexedTracks, lng, lat, maxDistKm = 8.0) {
  const margin = 0.15;
  const candidates = [];
  for (const item of indexedTracks) {
    const [minLng, minLat, maxLng, maxLat] = item.bbox;
    if (lng >= minLng - margin && lng <= maxLng + margin &&
        lat >= minLat - margin && lat <= maxLat + margin) {
      candidates.push(item.coords);
    }
  }

  if (candidates.length === 0) return null;

  try {
    const candidateTrack = candidates.length === 1 
      ? turf.lineString(candidates[0]) 
      : turf.multiLineString(candidates);
    const sn = turf.nearestPointOnLine(candidateTrack, turf.point([lng, lat]));
    const distKm = sn.properties?.dist ?? 0;
    if (distKm <= maxDistKm) {
      return [sn.geometry.coordinates[1], sn.geometry.coordinates[0]];
    }
  } catch (e) {}

  return null;
}

function roundCoord(c) {
  return [Math.round(c[0] * 100000) / 100000, Math.round(c[1] * 100000) / 100000];
}

function buildSingleLeg(fromCoord, toCoord, indexedTrack, steps = 8) {
  const leg = [roundCoord(fromCoord)];
  for (let i = 1; i < steps; i++) {
    const f = i / steps;
    const lat = fromCoord[0] + (toCoord[0] - fromCoord[0]) * f;
    const lng = fromCoord[1] + (toCoord[1] - fromCoord[1]) * f;
    
    if (indexedTrack) {
      const snapped = findNearestOnIndexedTracks(indexedTrack, lng, lat, 8.0);
      if (snapped) {
        leg.push(roundCoord(snapped));
        continue;
      }
    }
    leg.push(roundCoord([lat, lng]));
  }
  leg.push(roundCoord(toCoord));
  return leg;
}

function buildPath(fromId, toId, line) {
  const fromCoord = allStationCoords[fromId];
  const toCoord = allStationCoords[toId];
  if (!fromCoord || !toCoord) return null;

  const indexedTrack = line === 'WHOOSH' ? indexedWhoosh : indexedConv;
  
  // Resolve corridor breakdown from master spines
  const corridor = findSpinePath(fromId, toId);

  let full = [];
  if (corridor && corridor.length >= 2) {
    for (let i = 0; i < corridor.length - 1; i++) {
      const c1 = allStationCoords[corridor[i]];
      const c2 = allStationCoords[corridor[i + 1]];
      if (c1 && c2) {
        const sub = buildSingleLeg(c1, c2, indexedTrack, 6);
        if (full.length > 0) full.push(...sub.slice(1));
        else full.push(...sub);
      }
    }
  }

  if (full.length === 0) {
    full = buildSingleLeg(fromCoord, toCoord, indexedTrack, 8);
  }
  return full;
}

// Collect all unique station pairs
const allPairs = new Map(); // key -> line

function collect(schedules, line) {
  schedules.forEach(t => {
    const l = t.line || line;
    const keys = Object.keys(t.schedule || {});
    for (let i = 0; i < keys.length - 1; i++) {
      const p = `${keys[i]}->${keys[i + 1]}`;
      if (!allPairs.has(p)) {
        allPairs.set(p, l);
      }
    }
  });
}

collect(natGapeka, 'ANTARKOTA');
collect(Object.values(krlSchedule), 'COMMUTER');
collect(mrtSchedule, 'MRT');

console.log('Total unique pairs to precalculate:', allPairs.size);

const startTime = Date.now();
const precalculated = {};
let count = 0;
for (const [pair, line] of allPairs.entries()) {
  const [fromId, toId] = pair.split('->');
  const path = buildPath(fromId, toId, line);
  if (path) {
    precalculated[pair] = path;
    precalculated[`${line}:${pair}`] = path;
    count++;
  }
}

const outPath = 'static/data/precalculated-track-paths.json';
fs.writeFileSync(outPath, JSON.stringify(precalculated));
const stats = fs.statSync(outPath);
const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
console.log(`Successfully generated ${count} precalculated paths to ${outPath} (${(stats.size / 1024).toFixed(1)} KB) in ${elapsed}s!`);
