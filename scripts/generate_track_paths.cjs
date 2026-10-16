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
  if (s.id) allStationCoords[s.id] = s.coords;
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
  KCIC_CMI: [-6.89625, 107.53142],
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
  RU: [-6.314884, 106.6761518],  // Rawa Buntu
  RK: [-6.3527788, 106.2515252], // Rangkasbitung
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
  TOJB: [-6.0312959, 106.1214599], // Tonjong Baru in Merak line (TOJ)
  DAW: [-6.3931077, 107.4333466], // Dawuan (DWN)
  DWN: [-6.3931077, 107.4333466],
  MTM: [-6.2574741, 107.111227],  // Metland Telagamurni (TLM)
  TLM: [-6.2574741, 107.111227],
  SDI: [-7.0428, 110.8719],       // Sedadi (SDA)
  BOP: [-6.5985, 106.7915],       // Bogor Paledang
  MSG: [-6.7118, 106.8169],       // Maseng
  CCR: [-6.7903, 106.7877],       // Cicurug
  GDS: [-6.9427, 107.0097],       // Gandasoli
  CRG: [-6.9582, 107.0503],       // Cireungas
  LP: [-6.9664, 107.0989],        // Lampegan
  CBB: [-6.9472, 107.1353],       // Cibeber
  CJ: [-6.8242, 107.1417],        // Cianjur
  CRJ: [-6.8169, 107.2642],       // Ciranjang
  CPY: [-6.8161, 107.3197],       // Cipeuyeum
  CPT: [-6.8306, 107.3783],       // Cipatat
  KKD: [-7.6111, 109.0717],       // Kasugihan
  KO: [-7.4811, 110.8067],        // Kalioso
  TI: [-3.58472, 103.08139],      // Tebing Tinggi Empat Lawang
  KTP: [-4.7173, 104.7984],       // Ketapang Lampung Utara
  SB: [-7.2430228, 112.7421627]   // Surabaya Kota
};
Object.assign(allStationCoords, KCI_CODE_ALIASES);

// Explicit intermediate waypoints for ALL dedicated LRT segments
// Ensures LRT never snaps to KAI heavy rail tracks and follows true road/elevated viaduct curves
const LRT_WAYPOINTS = {
  // === 1. LRT Jakarta (Manggarai - Pegangsaan Dua) ===
  'MRI_LRT->PROKL': [
    [-6.2065, 106.8502]
  ],
  'PROKL->MTR_LRT': [
    [-6.2014, 106.8518],
    [-6.2010, 106.8532]
  ],
  'MTR_LRT->PRAMU': [
    [-6.1990, 106.8576],
    [-6.1970, 106.8615],
    [-6.1950, 106.8655],
    [-6.1932, 106.8685]
  ],
  'PRAMU->RAWAM': [
    [-6.1924, 106.8745],
    [-6.1928, 106.8785]
  ],
  'RAWAM->VELOD': [
    [-6.1930, 106.8855],
    [-6.1925, 106.8885]
  ],
  'VELOD->EQUES': [
    [-6.1895, 106.8912],
    [-6.1865, 106.8913]
  ],
  'EQUES->PULOM': [
    [-6.1812, 106.8918],
    [-6.1790, 106.8926]
  ],
  'PULOM->BOULE': [
    [-6.1755, 106.8943],
    [-6.1735, 106.8960],
    [-6.1712, 106.8980]
  ],
  'BOULE->BVU': [
    [-6.1665, 106.9015],
    [-6.1635, 106.9035],
    [-6.1610, 106.9050]
  ],
  'BVU->KPG': [
    [-6.1585, 106.9080],
    [-6.1578, 106.9110]
  ],

  // === 2. LRT Jabodebek - Cibubur Line ===
  'DUKUH->SETIA': [
    [-6.2062, 106.8275],
    [-6.2078, 106.8292]
  ],
  'SETIA->RASUN': [
    [-6.2135, 106.8309],
    [-6.2175, 106.8316]
  ],
  'RASUN->KUNIN': [
    [-6.2245, 106.8326],
    [-6.2268, 106.8330]
  ],
  'KUNIN->PANCO': [
    [-6.2330, 106.8340],
    [-6.2370, 106.8355],
    [-6.2405, 106.8372]
  ],
  'PANCO->CIKOK': [
    [-6.2426, 106.8435],
    [-6.2430, 106.8495],
    [-6.2433, 106.8540]
  ],
  'CIKOK->CILIW': [
    [-6.2435, 106.8605]
  ],
  'CILIW->CW_LRT': [
    [-6.2442, 106.8655]
  ],
  'CW_LRT->TAMAN': [
    [-6.2520, 106.8685],
    [-6.2620, 106.8715],
    [-6.2730, 106.8750],
    [-6.2840, 106.8780]
  ],
  'TAMAN->KAMPU': [
    [-6.2985, 106.8818],
    [-6.3040, 106.8832]
  ],
  'KAMPU->CIRAC': [
    [-6.3145, 106.8852],
    [-6.3195, 106.8860]
  ],
  'CIRAC->HARJA': [
    [-6.3350, 106.8885],
    [-6.3480, 106.8910],
    [-6.3620, 106.8935]
  ],

  // === 3. LRT Jabodebek - Bekasi Line ===
  'CW_LRT->HLM_LRT': [
    [-6.2458, 106.8725],
    [-6.2455, 106.8785]
  ],
  'HLM_LRT->JATIB': [
    [-6.2485, 106.8970],
    [-6.2520, 106.9100],
    [-6.2555, 106.9200]
  ],
  'JATIB->CIKUN1': [
    [-6.2575, 106.9360],
    [-6.2570, 106.9440]
  ],
  'CIKUN1->CIKUN2': [
    [-6.2558, 106.9575]
  ],
  'CIKUN2->BEKAS': [
    [-6.2538, 106.9720],
    [-6.2532, 106.9810]
  ],
  'BEKAS->JATIM': [
    [-6.2545, 107.0010],
    [-6.2580, 107.0110]
  ],

  // === 4. LRT Sumsel (Palembang) ===
  'BDR->ASH': [
    [-2.9030, 104.7085],
    [-2.9110, 104.7100]
  ],
  'ASH->PUNTI': [
    [-2.9265, 104.7155],
    [-2.9335, 104.7198]
  ],
  'PUNTI->RSUD': [
    [-2.9440, 104.7280]
  ],
  'RSUD->GARUD': [
    [-2.9520, 104.7342]
  ],
  'GARUD->DEMAN': [
    [-2.9605, 104.7358]
  ],
  'DEMAN->BUMIS': [
    [-2.9705, 104.7402]
  ],
  'BUMIS->DISHU': [
    [-2.9778, 104.7470]
  ],
  'DISHU->CINDE': [
    [-2.9796, 104.7525]
  ],
  'CINDE->AMPER': [
    [-2.9845, 104.7588]
  ],
  'AMPER->POLRE': [
    [-2.9940, 104.7650],
    [-2.9995, 104.7685]
  ],
  'POLRE->JAKAB': [
    [-3.0110, 104.7765],
    [-3.0170, 104.7805]
  ],
  'JAKAB->DJKA': [
    [-3.0275, 104.7875]
  ]
};

// Master Rail Network Topology across Java & Sumatra (ensures 100% accurate physical routing along real tracks)
const CONV_LINES = [
  // Pantura Barat (Jakarta - Cikampek)
  ['JAKK', 'GMR', 'PSE', 'KMT', 'GST', 'JNG', 'KLD', 'BUA', 'KLDB', 'CUK', 'KRI', 'BKS', 'BKST', 'TB', 'CIT', 'TLM', 'CKR', 'LMB', 'KDH', 'KW', 'KLI', 'KOS', 'DWN', 'CKP'],
  // Pantura Tengah (Cikampek - Cirebon)
  ['CKP', 'TJS', 'PAB', 'PRI', 'CKM', 'PGB', 'CRA', 'HGL', 'CLH', 'KAB', 'TIS', 'TLS', 'JTB', 'KTM', 'AWN', 'BDW', 'CNK', 'CN'],
  // Pantura Timur (Cirebon - Semarang - Surabaya)
  ['CN', 'CNP', 'BBK', 'LOS', 'TGN', 'BB', 'TG', 'LR', 'PML', 'PTA', 'CO', 'SRI', 'PK', 'BTG', 'UJN', 'KNS', 'PLB', 'KRP', 'WLR', 'KBD', 'KLW', 'MKG', 'JRK', 'SMC', 'SMT', 'ATA', 'BBG', 'TGW', 'GUB', 'KGT', 'SDI', 'NBO', 'GBN', 'JBN', 'PNL', 'KNN', 'SLR', 'DPL', 'RBG', 'WDU', 'KPA', 'CU', 'KSE', 'KIT', 'BJ', 'KPS', 'SRJ', 'BWO', 'BBT', 'GEB', 'PC', 'LMG', 'DDK', 'CME', 'BNW', 'KND', 'TES', 'SBI'],
  // Priangan Barat (Cikampek - Purwakarta - Padalarang - Bandung)
  ['CKP', 'CBR', 'PWK', 'CA', 'SUT', 'PLD', 'CD', 'RH', 'MSI', 'SKT', 'CLE', 'PDL', 'GK', 'CMI', 'CMD', 'CIR', 'BD'],
  // Priangan Timur (Bandung - Kroya)
  ['BD', 'CTH', 'KAC', 'GDB', 'CMK', 'RCK', 'HRP', 'CCL', 'NG', 'LBJ', 'LL', 'KRAI', 'CB', 'WB', 'BMW', 'CPD', 'CAA', 'CAW', 'RJP', 'IH', 'TSM', 'AW', 'MNJ', 'CI', 'BJG', 'KNP', 'BJR', 'LN', 'MLW', 'CPI', 'SDR', 'GDM', 'KWG', 'JRL', 'LBG', 'KSG', 'KH', 'MA', 'SKP', 'KYA'],
  // Garut Branch
  ['CB', 'PSJ', 'WNR', 'GRT'],
  // Bogor - Sukabumi - Cianjur - Padalarang (Pangrango & Siliwangi)
  ['BOO', 'BOP', 'BTT', 'MSG', 'CGW', 'CCR', 'PRK', 'CBD', 'CSA', 'SI', 'GDS', 'CRG', 'LP', 'CBB', 'CJ', 'CRJ', 'CPY', 'CPT', 'TAG', 'PDL'],
  // Tegal - Slawi - Prupuk
  ['TG', 'SLW', 'PPK'],
  // Cirebon - Purwokerto - Kroya
  ['CN', 'CNP', 'LWG', 'SDL', 'CLD', 'KGG', 'LR', 'SGG', 'PPK', 'LG', 'BMA', 'KRT', 'PAT', 'KRR', 'KGD', 'PWT', 'NTG', 'KBS', 'RDN', 'KYA'],
  // Kroya - Solo Balapan
  ['KYA', 'KJ', 'SPH', 'TBK', 'IJ', 'GB', 'KA', 'SRW', 'SOA', 'KM', 'WNS', 'KWN', 'PRB', 'BTH', 'KTA', 'JN', 'WJ', 'KDG', 'WT', 'STL', 'RWL', 'PTN', 'YK', 'LPN', 'MGW', 'KLS', 'BBN', 'SWT', 'KT', 'CE', 'DL', 'GW', 'PWS', 'SLO', 'SK'],
  // Solo - Madiun - Kertosono - Surabaya
  ['SLO', 'SK', 'PL', 'KMR', 'SR', 'KRO', 'MSR', 'GP', 'WK', 'KDB', 'NGW', 'GG', 'MAG', 'MN', 'BBD', 'CRB', 'SRD', 'WLG', 'BGR', 'NJ', 'SKM', 'BRN', 'KTS', 'SMB', 'JG', 'PTR', 'SBO', 'CRM', 'MR', 'TRK', 'KDN', 'KRN', 'BH', 'SPJ', 'WO', 'SGU', 'SBI'],
  // Solo - Wonogiri (Batara Kresna)
  ['PWS', 'STA', 'SKH', 'PNT', 'WNG'],
  // Solo - Gundih - Semarang & Kedungjati branch
  ['SLO', 'SK', 'SLM', 'SUM', 'GPK', 'KSO', 'GD', 'MGT', 'SDI', 'TRH', 'NBO'],
  ['GD', 'TW', 'KEJ', 'TGG', 'BBG', 'SMT'],
  // Surabaya Kota branch
  ['SGU', 'SB'],
  // Kertosono - Blitar - Malang - Bangil - Surabaya
  ['KTS', 'PWA', 'PPR', 'MGN', 'SS', 'KD', 'NDL', 'KRS', 'NJG', 'TA', 'SBL', 'NT', 'RJ', 'BL', 'GRM', 'TAL', 'WG', 'KSB', 'PGJ', 'SBP', 'NB', 'KPN', 'PSI', 'MLK', 'ML', 'BMG', 'SGS', 'LW', 'SKJ', 'BG', 'PR', 'TGA', 'SDA', 'GDG', 'WR', 'WO', 'SGU'],
  // Tapal Kuda (Bangil - Ketapang)
  ['BG', 'PS', 'RO', 'GI', 'BYM', 'PB', 'LEC', 'MLS', 'RN', 'KK', 'RDA', 'JTR', 'TGL', 'BSS', 'RBP', 'MI', 'JR', 'AJ', 'KTK', 'KLT', 'LDO', 'SPL', 'GRN', 'MRW', 'KBR', 'GLM', 'SWD', 'KKL', 'KSL', 'TGR', 'SGJ', 'RGP', 'BWI', 'AGO', 'KTG'],
  // Cilacap branch
  ['KYA', 'SKP', 'MA', 'KKD', 'KH', 'KSG', 'LBG', 'JRL', 'GM', 'CP'],
  // Lintas Barat (Jakarta - Rangkasbitung - Merak)
  ['THB', 'PLM', 'KBY', 'PDJ', 'JMU', 'SDM', 'RU', 'SRP', 'CSK', 'CC', 'PRP', 'CJT', 'DAR', 'TEJ', 'TGS', 'CKY', 'MJ', 'CTR', 'RK', 'JBU', 'CT', 'CKL', 'WLT', 'SG', 'KRA', 'TOJB', 'CLG', 'KEN', 'MER'],
  // Nambo
  ['CTA', 'PDRG', 'CBN', 'NMO'],
  // Bogor line
  ['JAKK', 'JAY', 'MGB', 'SW', 'JUA', 'GDD', 'CKI', 'MRI', 'TEB', 'CW', 'DRN', 'PSMB', 'PSM', 'TNT', 'PND', 'LNA', 'UP', 'UI', 'POC', 'DP', 'DPB', 'CTA', 'BJD', 'CLT', 'BOO'],
  // Loop line Jakarta
  ['MRI', 'MTR', 'JNG', 'POK', 'KMT', 'GST', 'PSE', 'KMO', 'RJW', 'KPB', 'AK', 'DU', 'THB', 'KAT', 'SUDB', 'SUD', 'MRI'],
  ['KPB', 'JAKK'],
  // Tangerang line
  ['DU', 'GRG', 'PSG', 'TKO', 'BOI', 'RW', 'KDS', 'PI', 'BPR', 'TTI', 'TNG'],
  // Tanjung Priuk line
  ['JAKK', 'KPB', 'AC', 'TPO', 'TPK'],
  // Bandara Soetta
  ['MRI', 'SUD', 'BNC', 'DU', 'PSG', 'RW', 'KDS', 'PI', 'BPR', 'BST'],
  // Bandara YIA
  ['WT', 'YIA'],
  // Sumatera Utara
  ['MDN', 'BAP', 'BTK', 'ARB', 'LBP', 'PBA', 'TKE', 'LDT', 'TKM', 'RPH', 'BMB', 'BAM', 'TBI', 'BDT', 'BLI', 'PRA', 'DSU', 'BLS', 'LMP', 'SBJ', 'KIS', 'TNB', 'PUR', 'TUK', 'HL', 'TND', 'MBM', 'PME', 'PHA', 'MBU', 'RAP'],
  ['MDN', 'BIJ'],
  ['ARB', 'KNM'],
  ['TBI', 'BJL', 'DMR', 'SIR'],
  // Sumatera Barat
  ['PD', 'AI', 'ATR', 'TAB', 'LBY', 'DUK', 'LA', 'PAK', 'KI', 'PMN', 'NRS'],
  ['DUK', 'BIM'],
  // Sumatera Selatan & Lampung
  ['KPT', 'KAS', 'SIG', 'PYK', 'SDN', 'GLB', 'KED', 'LEB', 'PBM'],
  ['PBM', 'BIB', 'PNG', 'PNM', 'NRU', 'BLP', 'GNM', 'UJM', 'ME', 'MLI', 'BJS', 'SCT', 'LT', 'SUA', 'SNA', 'BGM', 'TI', 'MSL', 'KOP', 'LLG'],
  ['PBM', 'PBR', 'TJR', 'ASM', 'PGG', 'MET', 'PNW', 'BLT', 'LBT', 'BTA', 'KMK', 'SPC', 'GLS', 'MP', 'WAY', 'GHM', 'BBU', 'NGN', 'TLY', 'NRR', 'KTP', 'CEP', 'KB', 'CMS', 'KAG', 'BBA', 'SLS', 'HJP', 'BKI', 'RGS', 'TGI', 'BTI', 'RJS', 'GDR', 'LAR', 'TNK']
];

const ALIAS_EDGES = [
  ['DAW', 'DWN'],
  ['MTM', 'TLM'],
  ['BOP', 'PLG'],
  ['PASIR', 'PSJ']
];

// Build graphs for strict multi-modal infrastructure isolation
const graphConv = new Map();
const graphWhoosh = new Map();
const graphMrt = new Map();
const graphLrt = new Map();

function addEdgeToGraph(g, u, v) {
  if (!g.has(u)) g.set(u, new Set());
  if (!g.has(v)) g.set(v, new Set());
  g.get(u).add(v);
  g.get(v).add(u);
}

CONV_LINES.forEach(line => {
  for (let i = 0; i < line.length - 1; i++) {
    addEdgeToGraph(graphConv, line[i], line[i + 1]);
  }
});

ALIAS_EDGES.forEach(([u, v]) => {
  addEdgeToGraph(graphConv, u, v);
});

// Whoosh graph
const WHOOSH_LINE = ['HLM', 'KRW', 'PDL', 'TGLR'];
for (let i = 0; i < WHOOSH_LINE.length - 1; i++) {
  addEdgeToGraph(graphWhoosh, WHOOSH_LINE[i], WHOOSH_LINE[i + 1]);
}

// MRT graph
const MRT_LINE = ['LBB', 'FTM', 'CPR', 'HJN', 'BLA', 'BLM', 'ASN', 'SNY', 'IST', 'BNH', 'STB', 'DKA', 'BHI'];
for (let i = 0; i < MRT_LINE.length - 1; i++) {
  addEdgeToGraph(graphMrt, MRT_LINE[i], MRT_LINE[i + 1]);
}

// LRT graph
const LRT_LINES = [
  ['MRI_LRT', 'PROKL', 'MTR_LRT', 'PRAMU', 'RAWAM', 'VELOD', 'EQUES', 'PULOM', 'BOULE', 'BVU', 'KPG'],
  ['DUKUH', 'SETIA', 'RASUN', 'KUNIN', 'PANCO', 'CIKOK', 'CILIW', 'CW_LRT', 'TAMAN', 'KAMPU', 'CIRAC', 'HARJA'],
  ['CW_LRT', 'HLM_LRT', 'JATIB', 'CIKUN1', 'CIKUN2', 'BEKAS', 'JATIM'],
  ['BDR', 'ASH', 'PUNTI', 'RSUD', 'GARUD', 'DEMAN', 'BUMIS', 'DISHU', 'CINDE', 'AMPER', 'POLRE', 'JAKAB', 'DJKA']
];
LRT_LINES.forEach(line => {
  for (let i = 0; i < line.length - 1; i++) {
    addEdgeToGraph(graphLrt, line[i], line[i + 1]);
  }
});

function findShortestRailwayPath(fromId, toId, line) {
  const g = line === 'WHOOSH'
    ? graphWhoosh
    : line === 'MRT'
      ? graphMrt
      : line === 'LRT'
        ? graphLrt
        : graphConv;

  if (fromId === toId) return [fromId];
  if (!g.has(fromId) || !g.has(toId)) return null;

  const queue = [[fromId]];
  const visited = new Set([fromId]);

  while (queue.length > 0) {
    const path = queue.shift();
    const curr = path[path.length - 1];
    if (curr === toId) return path;

    for (const neighbor of (g.get(curr) || [])) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([...path, neighbor]);
      }
    }
  }
  return null;
}

// Build indexed line structures with bounding boxes for ultra-fast spatial search
function indexLines(rawFeatures, filterFn) {
  const indexed = [];
  rawFeatures.forEach(f => {
    if (!f.geometry || !['LineString', 'MultiLineString'].includes(f.geometry.type)) return;
    if (filterFn && !filterFn(f)) return;

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
const indexedLrt = indexLines(railway.features, f => f.properties && f.properties.railway === 'light_rail');
const indexedWhoosh = indexLines(railway.features, f => f.properties && f.properties.highspeed === 'yes');
const indexedMrt = indexLines(krlRoutes.features, f => f.properties && (f.properties.line === 'MRT' || f.properties.colour === '#1e40af'));
const indexedConv = [
  ...indexLines(railway.features, f => !f.properties || (f.properties.highspeed !== 'yes' && f.properties.railway !== 'light_rail')),
  ...indexLines(krlRoutes.features, f => !f.properties || (f.properties.line !== 'MRT' && f.properties.colour !== '#1e40af'))
];

function findNearestOnIndexedTracks(indexedTracks, lng, lat, maxDistKm = 8.0) {
  if (!indexedTracks) return null;
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

function interpolatePoints(p1, p2, steps = 3) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    pts.push(roundCoord([
      p1[0] + (p2[0] - p1[0]) * f,
      p1[1] + (p2[1] - p1[1]) * f
    ]));
  }
  return pts;
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

function buildSmoothLrtSegment(fromId, toId) {
  const fromC = allStationCoords[fromId];
  const toC = allStationCoords[toId];
  if (!fromC || !toC) return null;

  // Use real surveyed physical LRT tracks from OpenStreetMap with 25 sampling steps
  if (indexedLrt && indexedLrt.length > 0) {
    const leg = buildSingleLeg(fromC, toC, indexedLrt, 25);
    if (leg && leg.length >= 2) return leg;
  }

  const key = `${fromId}->${toId}`;
  const revKey = `${toId}->${fromId}`;

  let intermediate = [];
  if (LRT_WAYPOINTS[key]) {
    intermediate = LRT_WAYPOINTS[key];
  } else if (LRT_WAYPOINTS[revKey]) {
    intermediate = [...LRT_WAYPOINTS[revKey]].reverse();
  }

  const allKeyPts = [fromC, ...intermediate, toC];
  const full = [];
  for (let i = 0; i < allKeyPts.length - 1; i++) {
    const sub = interpolatePoints(allKeyPts[i], allKeyPts[i + 1], 3);
    if (full.length > 0) full.push(...sub.slice(1));
    else full.push(...sub);
  }
  return full;
}


function buildPath(fromId, toId, line) {
  const fromCoord = allStationCoords[fromId];
  const toCoord = allStationCoords[toId];
  if (!fromCoord || !toCoord) return null;

  // STRICT SEPARATION OF INFRASTRUCTURE TRACKS:
  // 1. LRT: Never uses conventional rail tracks, stays strictly on dedicated elevated viaduct corridors
  if (line === 'LRT') {
    const directLrt = buildSmoothLrtSegment(fromId, toId);
    if (directLrt && directLrt.length >= 2) return directLrt;

    const corridor = findSpinePath(fromId, toId);
    if (corridor && corridor.length >= 2) {
      const fullLrt = [];
      for (let i = 0; i < corridor.length - 1; i++) {
        const sub = buildSmoothLrtSegment(corridor[i], corridor[i + 1]);
        if (sub) {
          if (fullLrt.length > 0) fullLrt.push(...sub.slice(1));
          else fullLrt.push(...sub);
        }
      }
      if (fullLrt.length >= 2) return fullLrt;
    }

    // Direct linear leg between LRT stations if unknown pair (never snap to heavy rail!)
    return buildSingleLeg(fromCoord, toCoord, null, 8);
  }

  // 2. Whoosh: dedicated high-speed rail alignment
  if (line === 'WHOOSH') {
    const WHOOSH_INTERMEDIATES = {
      'HLM->KRW': ['KCIC_CKR'],
      'KRW->HLM': ['KCIC_CKR'],
      'KRW->PDL': ['KCIC_KRW', 'KCIC_PWK', 'KCIC_WLN', 'KCIC_CKL', 'KCIC_SKT'],
      'PDL->KRW': ['KCIC_SKT', 'KCIC_CKL', 'KCIC_WLN', 'KCIC_PWK', 'KCIC_KRW'],
      'PDL->TGLR': ['KCIC_CMI', 'KCIC_KPO', 'KCIC_GDB'],
      'TGLR->PDL': ['KCIC_GDB', 'KCIC_KPO', 'KCIC_CMI'],
      'HLM->PDL': ['KCIC_CKR', 'KRW', 'KCIC_KRW', 'KCIC_PWK', 'KCIC_WLN', 'KCIC_CKL', 'KCIC_SKT'],
      'PDL->HLM': ['KCIC_SKT', 'KCIC_CKL', 'KCIC_WLN', 'KCIC_PWK', 'KCIC_KRW', 'KRW', 'KCIC_CKR'],
      'HLM->TGLR': ['KCIC_CKR', 'KRW', 'KCIC_KRW', 'KCIC_PWK', 'KCIC_WLN', 'KCIC_CKL', 'KCIC_SKT', 'PDL', 'KCIC_CMI', 'KCIC_KPO', 'KCIC_GDB'],
      'TGLR->HLM': ['KCIC_GDB', 'KCIC_KPO', 'KCIC_CMI', 'PDL', 'KCIC_SKT', 'KCIC_CKL', 'KCIC_WLN', 'KCIC_PWK', 'KCIC_KRW', 'KRW', 'KCIC_CKR'],
      'KRW->TGLR': ['KCIC_KRW', 'KCIC_PWK', 'KCIC_WLN', 'KCIC_CKL', 'KCIC_SKT', 'PDL', 'KCIC_CMI', 'KCIC_KPO', 'KCIC_GDB'],
      'TGLR->KRW': ['KCIC_GDB', 'KCIC_KPO', 'KCIC_CMI', 'PDL', 'KCIC_SKT', 'KCIC_CKL', 'KCIC_WLN', 'KCIC_PWK', 'KCIC_KRW']
    };
    const pairKey = `${fromId}->${toId}`;
    const revPairKey = `${toId}->${fromId}`;
    let inter = [];
    if (WHOOSH_INTERMEDIATES[pairKey]) {
      inter = WHOOSH_INTERMEDIATES[pairKey];
    } else if (WHOOSH_INTERMEDIATES[revPairKey]) {
      inter = [...WHOOSH_INTERMEDIATES[revPairKey]].reverse();
    }
    const stopsList = [fromId, ...inter, toId];
    const fullWhoosh = [];
    for (let i = 0; i < stopsList.length - 1; i++) {
      const c1 = allStationCoords[stopsList[i]];
      const c2 = allStationCoords[stopsList[i + 1]];
      if (c1 && c2) {
        const sub = buildSingleLeg(c1, c2, indexedWhoosh, 6);
        if (fullWhoosh.length > 0) fullWhoosh.push(...sub.slice(1));
        else fullWhoosh.push(...sub);
      }
    }
    if (fullWhoosh.length >= 2) return fullWhoosh;
    return buildSingleLeg(fromCoord, toCoord, indexedWhoosh, 8);
  }

  // 3. MRT: dedicated underground / elevated MRT alignment
  // 4. Conventional: KAI Commuter Line & Intercity tracks
  const indexedTrack = line === 'MRT' 
    ? indexedMrt 
    : indexedConv;
  
  // Resolve corridor breakdown from master railway network topology
  const corridor = findShortestRailwayPath(fromId, toId, line);

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
