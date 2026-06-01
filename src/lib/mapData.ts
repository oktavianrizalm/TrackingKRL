// Coordinates for tracked KRL stations
export const stationCoordinates: Record<string, [number, number]> = {
    'JAKK': [-6.1375828, 106.8146203], // Jakarta Kota
    'MRI': [-6.2101704, 106.849935],   // Manggarai
    'BOO': [-6.5942887, 106.7907695],  // Bogor
    'DP': [-6.4048263, 106.8170842],   // Depok
    'BKS': [-6.2362143, 106.9987436],  // Bekasi
    'CKR': [-6.2553138, 107.1450733],  // Cikarang
    'THB': [-6.1857127, 106.8108938],  // Tanah Abang
    'SUD': [-6.2024081, 106.8234493],  // Sudirman
    'RU': [-6.3527788, 106.2515252],   // Rangkasbitung
    'SRP': [-6.3201527, 106.6655836],  // Serpong
    'TNG': [-6.1769753, 106.6320106],  // Tangerang
    'DU': [-6.1552764, 106.8012968],   // Duri
    'TPK': [-6.1107, 106.8812],        // Tanjung Priok
    'KPB': [-6.1327023, 106.8284875],  // Kampung Bandan
    'JNG': [-6.2149252, 106.8703394]   // Jatinegara
};

// Route polylines
export const routes = [
    {
        line: 'BOGOR',
        color: '#EF4444', // Red
        path: ['JAKK', 'MRI', 'DP', 'BOO']
    },
    {
        line: 'CIKARANG',
        color: '#3B82F6', // Blue
        path: ['CKR', 'BKS', 'JNG', 'MRI', 'SUD', 'THB', 'KPB', 'JAKK']
    },
    {
        line: 'RANGKASBITUNG',
        color: '#16A34A', // Green
        path: ['RU', 'SRP', 'THB']
    },
    {
        line: 'TANGERANG',
        color: '#A16207', // Brown
        path: ['TNG', 'DU']
    },
    {
        line: 'TANJUNGPRIUK',
        color: '#DB2777', // Pink
        path: ['TPK', 'JAKK']
    }
];

// Mapping of station names to their official KRL IDs
export const realStationIds: Record<string, string> = {
    "jakarta kota": "JAKK",
    "jayakarta": "JYK",
    "mangga besar": "MGB",
    "sawah besar": "SW",
    "juanda": "JUA",
    "gondangdia": "GDD",
    "cikini": "CKI",
    "manggarai": "MRI",
    "tebet": "TEB",
    "cawang": "CW",
    "duren kalibata": "DRN",
    "pasar minggu baru": "PSMB",
    "pasar minggu": "PSM",
    "tanjung barat": "TNT",
    "lenteng agung": "LNA",
    "universitas pancasila": "UP",
    "universitas indonesia": "UI",
    "pondok cina": "POC",
    "depok baru": "DPB",
    "depok": "DP",
    "citayam": "CTA",
    "bojong gede": "BJD",
    "bojonggede": "BJD",
    "cilebut": "CLT",
    "bogor": "BOO",
    "cibinong": "CBN",
    "nambo": "NMO",
    "cikarang": "CKR",
    "metland telagamurni": "TLM",
    "cibitung": "CIT",
    "tambun": "TB",
    "bekasi timur": "BKST",
    "bekasi": "BKS",
    "kranji": "KRI",
    "cakung": "CUK",
    "klender baru": "KLDB",
    "buaran": "BUA",
    "klender": "KLD",
    "jatinegara": "JNG",
    "matraman": "MTR",
    "pondok jati": "POK",
    "kramat": "KMT",
    "gang sentiong": "GST",
    "pasar senen": "PSE",
    "kemayoran": "KMO",
    "rajawali": "RJW",
    "kampung bandan": "KPB",
    "angke": "AK",
    "duri": "DU",
    "tanah abang": "THB",
    "karet": "KRT",
    "bni city": "BNC",
    "bni city / sudirman baru": "BNC",
    "sudirman": "SUD",
    "palmerah": "PLM",
    "kebayoran": "KBY",
    "pondok ranji": "PDJ",
    "jurangmangu": "JMU",
    "sudimara": "SDM",
    "rawa buntu": "RU",
    "serpong": "SRP",
    "cisauk": "CSK",
    "cicayur": "CC",
    "parung panjang": "PRP",
    "parungpanjang": "PRP",
    "cilejit": "CJT",
    "daru": "DAR",
    "tenjo": "TEJ",
    "tigaraksa": "TGS",
    "cikoya": "CKY",
    "maja": "MJ",
    "citeras": "CTR",
    "rangkasbitung": "RK",
    "grogol": "GGL",
    "pesing": "PSG",
    "taman kota": "TKT",
    "bojong indah": "BOI",
    "rawa buaya": "RW",
    "kalideres": "KDS",
    "poris": "PI",
    "batu ceper": "BPR",
    "tanah tinggi": "TTI",
    "tangerang": "TNG",
    "ancol": "AC",
    "tanjung priok": "TPK",
    "tanjung priuk": "TPK"
};
