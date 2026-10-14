const fs = require('fs');
const path = require('path');

// Helper to add minutes to HH:mm string
function addMinutes(timeStr, mins) {
  const [h, m] = timeStr.split(':').map(Number);
  const total = (h * 60 + m + mins) % (24 * 60);
  const newH = Math.floor(total / 60);
  const newM = total % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

const nationalTrains = [];

// ==========================================
// 1. ANTARKOTA - PANTURA (Jawa Lintas Utara)
// ==========================================
const panturaTrains = [
  // Argo Bromo Anggrek
  {
    id: "KA 1 Argo Bromo Anggrek",
    name: "Argo Bromo Anggrek",
    line: "ANTARKOTA",
    destination: "Gambir",
    schedule: { "SBI": "09:10", "BJ": "10:18", "CU": "11:25", "SMT": "12:25", "PK": "13:30", "TG": "14:15", "CN": "15:08", "JNG": "17:15", "GMR": "17:35" }
  },
  {
    id: "KA 2 Argo Bromo Anggrek",
    name: "Argo Bromo Anggrek",
    line: "ANTARKOTA",
    destination: "Surabaya Pasarturi",
    schedule: { "GMR": "08:20", "CN": "10:45", "TG": "11:35", "PK": "12:20", "SMT": "13:25", "CU": "14:26", "BJ": "15:35", "SBI": "16:45" }
  },
  {
    id: "KA 3 Argo Bromo Anggrek Malam",
    name: "Argo Bromo Anggrek Malam",
    line: "ANTARKOTA",
    destination: "Gambir",
    schedule: { "SBI": "21:15", "BJ": "22:23", "CU": "23:30", "SMT": "00:30", "PK": "01:35", "TG": "02:20", "CN": "03:13", "JNG": "05:20", "GMR": "05:40" }
  },
  {
    id: "KA 4 Argo Bromo Anggrek Malam",
    name: "Argo Bromo Anggrek Malam",
    line: "ANTARKOTA",
    destination: "Surabaya Pasarturi",
    schedule: { "GMR": "20:30", "CN": "22:55", "TG": "23:45", "PK": "00:30", "SMT": "01:35", "CU": "02:36", "BJ": "03:45", "SBI": "04:55" }
  },
  // Sembrani
  {
    id: "KA 61 Sembrani",
    name: "Sembrani",
    line: "ANTARKOTA",
    destination: "Gambir",
    schedule: { "SBI": "19:00", "LMG": "19:35", "BBT": "19:55", "BJ": "20:25", "CU": "21:30", "SMT": "22:35", "PK": "23:45", "TG": "00:35", "CN": "01:30", "BKS": "03:50", "GMR": "04:15" }
  },
  {
    id: "KA 62 Sembrani",
    name: "Sembrani",
    line: "ANTARKOTA",
    destination: "Surabaya Pasarturi",
    schedule: { "GMR": "19:30", "BKS": "19:58", "CN": "22:15", "TG": "23:08", "PK": "23:55", "SMT": "01:05", "CU": "02:10", "BJ": "03:20", "BBT": "03:50", "LMG": "04:10", "SBI": "04:45" }
  },
  // Argo Sindoro & Argo Muria
  {
    id: "KA 11 Argo Sindoro",
    name: "Argo Sindoro",
    line: "ANTARKOTA",
    destination: "Gambir",
    schedule: { "SMT": "06:50", "PK": "08:00", "TG": "08:50", "CN": "09:45", "JNG": "12:05", "GMR": "12:25" }
  },
  {
    id: "KA 12 Argo Sindoro",
    name: "Argo Sindoro",
    line: "ANTARKOTA",
    destination: "Semarang Tawang",
    schedule: { "GMR": "16:40", "JNG": "16:58", "CN": "19:15", "TG": "20:05", "PK": "20:55", "SMT": "22:10" }
  },
  {
    id: "KA 13 Argo Muria",
    name: "Argo Muria",
    line: "ANTARKOTA",
    destination: "Gambir",
    schedule: { "SMT": "16:00", "PK": "17:10", "TG": "18:00", "CN": "18:55", "JNG": "21:15", "GMR": "21:35" }
  },
  {
    id: "KA 14 Argo Muria",
    name: "Argo Muria",
    line: "ANTARKOTA",
    destination: "Semarang Tawang",
    schedule: { "GMR": "07:00", "JNG": "07:18", "CN": "09:35", "TG": "10:25", "PK": "11:15", "SMT": "12:30" }
  },
  // Dharmawangsa
  {
    id: "KA 131 Dharmawangsa",
    name: "Dharmawangsa",
    line: "ANTARKOTA",
    destination: "Pasar Senen",
    schedule: { "SBI": "22:30", "LMG": "23:10", "BBT": "23:35", "BJ": "00:10", "CU": "01:25", "NBO": "02:10", "SMT": "03:00", "PK": "04:20", "TG": "05:15", "BB": "05:40", "CNP": "06:30", "CKR": "08:35", "BKS": "08:55", "PSE": "09:25" }
  },
  {
    id: "KA 132 Dharmawangsa",
    name: "Dharmawangsa",
    line: "ANTARKOTA",
    destination: "Surabaya Pasarturi",
    schedule: { "PSE": "08:40", "BKS": "09:10", "CKR": "09:30", "CNP": "11:45", "BB": "12:35", "TG": "13:00", "PK": "13:55", "SMT": "15:20", "NBO": "16:15", "CU": "17:05", "BJ": "18:25", "BBT": "19:00", "LMG": "19:25", "SBI": "20:05" }
  },
  // Kertajaya
  {
    id: "KA 219 Kertajaya",
    name: "Kertajaya",
    line: "ANTARKOTA",
    destination: "Pasar Senen",
    schedule: { "SBI": "21:45", "LMG": "22:25", "BBT": "22:50", "BJ": "23:25", "CU": "00:40", "SMT": "02:15", "PK": "03:35", "TG": "04:30", "CNP": "05:40", "BKS": "07:55", "PSE": "08:25" }
  },
  {
    id: "KA 220 Kertajaya",
    name: "Kertajaya",
    line: "ANTARKOTA",
    destination: "Surabaya Pasarturi",
    schedule: { "PSE": "14:30", "BKS": "15:00", "CNP": "17:35", "TG": "18:40", "PK": "19:35", "SMT": "21:00", "CU": "22:25", "BJ": "23:45", "BBT": "00:20", "LMG": "00:45", "SBI": "01:25" }
  },
  // Airlangga
  {
    id: "KA 235 Airlangga",
    name: "Airlangga",
    line: "ANTARKOTA",
    destination: "Pasar Senen",
    schedule: { "SBI": "12:25", "LMG": "13:05", "BBT": "13:30", "BJ": "14:05", "CU": "15:20", "SMC": "17:00", "PK": "18:25", "TG": "19:20", "CNP": "20:45", "CKR": "22:50", "BKS": "23:10", "PSE": "23:35" }
  },
  {
    id: "KA 236 Airlangga",
    name: "Airlangga",
    line: "ANTARKOTA",
    destination: "Surabaya Pasarturi",
    schedule: { "PSE": "11:20", "BKS": "11:50", "CKR": "12:10", "CNP": "14:25", "TG": "15:45", "PK": "16:45", "SMC": "18:15", "CU": "19:40", "BJ": "21:05", "BBT": "21:40", "LMG": "22:05", "SBI": "22:50" }
  },
  // Jayabaya
  {
    id: "KA 107 Jayabaya",
    name: "Jayabaya",
    line: "ANTARKOTA",
    destination: "Pasar Senen",
    schedule: { "ML": "12:30", "LW": "13:00", "BG": "13:45", "SDA": "14:20", "SGU": "14:50", "SBI": "15:20", "BJ": "16:45", "CU": "18:00", "SMT": "19:25", "PK": "20:45", "TG": "21:40", "CN": "22:45", "BKS": "01:10", "PSE": "01:40" }
  },
  {
    id: "KA 108 Jayabaya",
    name: "Jayabaya",
    line: "ANTARKOTA",
    destination: "Malang",
    schedule: { "PSE": "16:45", "BKS": "17:15", "CN": "19:45", "TG": "20:45", "PK": "21:40", "SMT": "23:05", "CU": "00:30", "BJ": "01:50", "SBI": "03:15", "SGU": "03:45", "SDA": "04:15", "BG": "04:50", "LW": "05:35", "ML": "06:05" }
  },
  // Harina
  {
    id: "KA 123 Harina",
    name: "Harina",
    line: "ANTARKOTA",
    destination: "Bandung",
    schedule: { "SBI": "17:40", "LMG": "18:20", "BJ": "19:15", "CU": "20:30", "SMT": "22:00", "PK": "23:20", "TG": "00:15", "CNP": "01:25", "CKP": "03:45", "CBR": "03:57", "PWK": "04:10", "CA": "04:18", "PLD": "04:30", "SKT": "04:42", "PDL": "04:52", "CMI": "05:00", "BD": "05:20" }
  },
  {
    id: "KA 124 Harina",
    name: "Harina",
    line: "ANTARKOTA",
    destination: "Surabaya Pasarturi",
    schedule: { "BD": "21:40", "CMI": "21:55", "PDL": "22:05", "SKT": "22:15", "PLD": "22:28", "CA": "22:40", "PWK": "22:50", "CBR": "23:05", "CKP": "23:25", "CNP": "01:45", "TG": "02:50", "PK": "03:45", "SMT": "05:10", "CU": "06:35", "BJ": "07:55", "LMG": "08:50", "SBI": "09:35" }
  },
  // Argo Merbabu (GAPEKA 2025)
  {
    id: "KA 19 Argo Merbabu",
    name: "Argo Merbabu",
    line: "ANTARKOTA",
    destination: "Gambir",
    schedule: { "SMT": "05:50", "PK": "06:55", "TG": "07:45", "CN": "08:40", "JNG": "11:00", "GMR": "11:20" }
  },
  {
    id: "KA 20 Argo Merbabu",
    name: "Argo Merbabu",
    line: "ANTARKOTA",
    destination: "Semarang Tawang",
    schedule: { "GMR": "14:20", "CN": "16:40", "TG": "17:35", "PK": "18:25", "SMT": "19:40" }
  },
  // Blambangan Ekspres (GAPEKA 2025: Perpanjangan Relasi Pasar Senen - Ketapang)
  {
    id: "KA 185 Blambangan Ekspres",
    name: "Blambangan Ekspres",
    line: "ANTARKOTA",
    destination: "Pasar Senen",
    schedule: { "KTG": "14:50", "BWI": "15:05", "RGP": "15:40", "GLM": "16:15", "JR": "17:30", "TGL": "18:05", "PB": "19:30", "BG": "20:30", "SDA": "21:10", "SGU": "21:45", "SBI": "22:15", "BJ": "23:40", "CU": "00:55", "SMT": "02:15", "PK": "03:30", "TG": "04:25", "CNP": "05:25", "BKS": "07:15", "PSE": "07:40" }
  },
  {
    id: "KA 186 Blambangan Ekspres",
    name: "Blambangan Ekspres",
    line: "ANTARKOTA",
    destination: "Ketapang",
    schedule: { "PSE": "12:15", "BKS": "12:45", "CNP": "15:00", "TG": "16:05", "PK": "17:00", "SMT": "18:15", "CU": "19:35", "BJ": "20:45", "SBI": "22:10", "SGU": "22:40", "SDA": "23:15", "BG": "23:55", "PB": "00:55", "TGL": "02:15", "JR": "02:55", "GLM": "04:10", "RGP": "04:45", "BWI": "05:20", "KTG": "05:40" }
  }
];

// ==========================================
// 2. ANTARKOTA - JALUR SELATAN & TENGAH (Jawa)
// ==========================================
const selatanTrains = [
  // Argo Lawu
  {
    id: "KA 7 Argo Lawu",
    name: "Argo Lawu",
    line: "ANTARKOTA",
    destination: "Gambir",
    schedule: { "SLO": "08:30", "KT": "08:55", "YK": "09:20", "KTA": "10:10", "KYA": "11:05", "PWT": "11:40", "CN": "13:30", "JNG": "15:50", "GMR": "16:10" }
  },
  {
    id: "KA 8 Argo Lawu",
    name: "Argo Lawu",
    line: "ANTARKOTA",
    destination: "Solo Balapan",
    schedule: { "GMR": "20:45", "CN": "23:05", "PWT": "00:55", "KYA": "01:30", "KTA": "02:25", "YK": "03:15", "KT": "03:40", "SLO": "04:05" }
  },
  // Argo Dwipangga
  {
    id: "KA 9 Argo Dwipangga",
    name: "Argo Dwipangga",
    line: "ANTARKOTA",
    destination: "Gambir",
    schedule: { "SLO": "20:30", "KT": "20:55", "YK": "21:20", "KTA": "22:10", "KYA": "23:05", "PWT": "23:40", "CN": "01:30", "JNG": "03:50", "GMR": "04:10" }
  },
  {
    id: "KA 10 Argo Dwipangga",
    name: "Argo Dwipangga",
    line: "ANTARKOTA",
    destination: "Solo Balapan",
    schedule: { "GMR": "08:50", "CN": "11:10", "PWT": "13:00", "KYA": "13:35", "KTA": "14:30", "YK": "15:20", "KT": "15:45", "SLO": "16:10" }
  },
  // Taksaka Pagi & Malam
  {
    id: "KA 67 Taksaka Pagi",
    name: "Taksaka Pagi",
    line: "ANTARKOTA",
    destination: "Gambir",
    schedule: { "YK": "08:45", "KTA": "09:35", "KYA": "10:30", "PWT": "11:05", "CN": "12:55", "JNG": "15:15", "GMR": "15:35" }
  },
  {
    id: "KA 68 Taksaka Pagi",
    name: "Taksaka Pagi",
    line: "ANTARKOTA",
    destination: "Yogyakarta",
    schedule: { "GMR": "09:20", "CN": "11:40", "PWT": "13:30", "KYA": "14:05", "KTA": "15:00", "YK": "15:50" }
  },
  {
    id: "KA 69 Taksaka Malam",
    name: "Taksaka Malam",
    line: "ANTARKOTA",
    destination: "Gambir",
    schedule: { "YK": "21:40", "KTA": "22:30", "KYA": "23:25", "PWT": "00:00", "CN": "01:50", "JNG": "04:10", "GMR": "04:30" }
  },
  {
    id: "KA 70 Taksaka Malam",
    name: "Taksaka Malam",
    line: "ANTARKOTA",
    destination: "Yogyakarta",
    schedule: { "GMR": "21:40", "CN": "00:00", "PWT": "01:50", "KYA": "02:25", "KTA": "03:20", "YK": "04:10" }
  },
  // Gajayana
  {
    id: "KA 55 Gajayana",
    name: "Gajayana",
    line: "ANTARKOTA",
    destination: "Gambir",
    schedule: { "ML": "14:25", "MLK": "14:32", "WG": "15:10", "BL": "16:00", "TA": "16:35", "KD": "17:15", "KTS": "17:55", "MN": "18:45", "SLO": "19:50", "YK": "20:45", "KTA": "21:35", "KYA": "22:30", "PWT": "23:05", "CN": "00:55", "JNG": "03:15", "GMR": "03:35" }
  },
  {
    id: "KA 56 Gajayana",
    name: "Gajayana",
    line: "ANTARKOTA",
    destination: "Malang",
    schedule: { "GMR": "18:50", "CN": "21:10", "PWT": "23:00", "KYA": "23:35", "KTA": "00:30", "YK": "01:20", "SLO": "02:15", "MN": "03:20", "KTS": "04:10", "KD": "04:50", "TA": "05:30", "BL": "06:05", "WG": "06:55", "MLK": "07:33", "ML": "07:40" }
  },
  // Bima
  {
    id: "KA 59 Bima",
    name: "Bima",
    line: "ANTARKOTA",
    destination: "Gambir",
    schedule: { "SGU": "19:20", "MR": "19:55", "JG": "20:20", "KTS": "20:45", "MN": "21:35", "SLO": "22:40", "YK": "23:35", "KTA": "00:25", "KYA": "01:20", "PWT": "01:55", "CN": "03:45", "JNG": "06:05", "GMR": "06:25" }
  },
  {
    id: "KA 60 Bima",
    name: "Bima",
    line: "ANTARKOTA",
    destination: "Surabaya Gubeng",
    schedule: { "GMR": "17:00", "CN": "19:20", "PWT": "21:10", "KYA": "21:45", "KTA": "22:40", "YK": "23:30", "SLO": "00:25", "MN": "01:30", "KTS": "02:20", "JG": "02:45", "MR": "03:10", "SGU": "03:45" }
  },
  // Turangga
  {
    id: "KA 65 Turangga",
    name: "Turangga",
    line: "ANTARKOTA",
    destination: "Bandung",
    schedule: { "SGU": "20:00", "MR": "20:35", "JG": "21:00", "KTS": "21:25", "MN": "22:15", "SLO": "23:20", "YK": "00:15", "KTA": "01:05", "KYA": "02:00", "BJR": "03:35", "CI": "04:05", "TSM": "04:40", "KAC": "06:30", "BD": "06:50" }
  },
  {
    id: "KA 66 Turangga",
    name: "Turangga",
    line: "ANTARKOTA",
    destination: "Surabaya Gubeng",
    schedule: { "BD": "18:10", "KAC": "18:25", "TSM": "20:15", "CI": "20:50", "BJR": "21:20", "KYA": "22:55", "KTA": "23:50", "YK": "00:40", "SLO": "01:35", "MN": "02:40", "KTS": "03:30", "JG": "03:55", "MR": "04:20", "SGU": "04:55" }
  },
  // Lodaya Pagi & Malam
  {
    id: "KA 91 Lodaya Pagi",
    name: "Lodaya Pagi",
    line: "ANTARKOTA",
    destination: "Bandung",
    schedule: { "SLO": "07:20", "KT": "07:45", "YK": "08:10", "WT": "08:40", "KTA": "09:10", "GB": "09:40", "KYA": "10:15", "BJR": "11:50", "CI": "12:20", "TSM": "12:55", "KAC": "14:45", "BD": "15:05" }
  },
  {
    id: "KA 92 Lodaya Pagi",
    name: "Lodaya Pagi",
    line: "ANTARKOTA",
    destination: "Solo Balapan",
    schedule: { "BD": "06:55", "KAC": "07:10", "TSM": "09:00", "CI": "09:35", "BJR": "10:05", "KYA": "11:40", "GB": "12:15", "KTA": "12:45", "WT": "13:15", "YK": "13:45", "KT": "14:10", "SLO": "14:35" }
  },
  {
    id: "KA 93 Lodaya Malam",
    name: "Lodaya Malam",
    line: "ANTARKOTA",
    destination: "Bandung",
    schedule: { "SLO": "19:00", "KT": "19:25", "YK": "19:50", "WT": "20:20", "KTA": "20:50", "KYA": "21:55", "BJR": "23:30", "TSM": "00:35", "KAC": "02:25", "BD": "02:45" }
  },
  {
    id: "KA 94 Lodaya Malam",
    name: "Lodaya Malam",
    line: "ANTARKOTA",
    destination: "Solo Balapan",
    schedule: { "BD": "19:10", "KAC": "19:25", "TSM": "21:15", "CI": "21:50", "BJR": "22:20", "KYA": "23:55", "KTA": "00:50", "WT": "01:20", "YK": "01:50", "KT": "02:15", "SLO": "02:40" }
  },
  // Malabar
  {
    id: "KA 121 Malabar",
    name: "Malabar",
    line: "ANTARKOTA",
    destination: "Bandung",
    schedule: { "ML": "16:50", "WG": "17:35", "BL": "18:25", "TA": "19:00", "KD": "19:40", "KTS": "20:20", "MN": "21:10", "SLO": "22:15", "YK": "23:10", "KTA": "00:00", "KYA": "00:55", "BJR": "02:30", "TSM": "03:35", "KAC": "05:25", "BD": "05:45" }
  },
  {
    id: "KA 122 Malabar",
    name: "Malabar",
    line: "ANTARKOTA",
    destination: "Malang",
    schedule: { "BD": "09:50", "KAC": "10:05", "TSM": "11:55", "CI": "12:30", "BJR": "13:00", "KYA": "14:35", "KTA": "15:30", "YK": "16:20", "SLO": "17:15", "MN": "18:20", "KTS": "19:10", "KD": "19:50", "TA": "20:30", "BL": "21:05", "WG": "21:55", "ML": "22:40" }
  },
  // Sancaka 1 - 4
  {
    id: "KA 95 Sancaka Pagi",
    name: "Sancaka Pagi",
    line: "ANTARKOTA",
    destination: "Yogyakarta",
    schedule: { "SGU": "07:00", "MR": "07:35", "JG": "08:00", "KTS": "08:25", "MN": "09:15", "NGW": "09:40", "SLO": "10:35", "KT": "11:00", "YK": "11:25" }
  },
  {
    id: "KA 96 Sancaka Pagi",
    name: "Sancaka Pagi",
    line: "ANTARKOTA",
    destination: "Surabaya Gubeng",
    schedule: { "YK": "06:45", "KT": "07:10", "SLO": "07:35", "NGW": "08:30", "MN": "08:55", "KTS": "09:45", "JG": "10:10", "MR": "10:35", "SGU": "11:10" }
  },
  {
    id: "KA 97 Sancaka Siang",
    name: "Sancaka Siang",
    line: "ANTARKOTA",
    destination: "Yogyakarta",
    schedule: { "SGU": "11:15", "MR": "11:50", "JG": "12:15", "KTS": "12:40", "MN": "13:30", "SLO": "14:50", "KT": "15:15", "YK": "15:40" }
  },
  {
    id: "KA 98 Sancaka Sore",
    name: "Sancaka Sore",
    line: "ANTARKOTA",
    destination: "Surabaya Gubeng",
    schedule: { "YK": "17:10", "KT": "17:35", "SLO": "18:00", "NGW": "18:55", "MN": "19:20", "KTS": "20:10", "JG": "20:35", "MR": "21:00", "SGU": "21:35" }
  },
  // Jayakarta
  {
    id: "KA 217 Jayakarta",
    name: "Jayakarta",
    line: "ANTARKOTA",
    destination: "Pasar Senen",
    schedule: { "SGU": "14:10", "MR": "14:45", "KTS": "15:35", "MN": "16:25", "SLO": "17:30", "YK": "18:25", "KTA": "19:15", "KYA": "20:10", "PWT": "20:45", "CNP": "22:35", "CKR": "00:40", "BKS": "01:00", "PSE": "01:35" }
  },
  {
    id: "KA 218 Jayakarta",
    name: "Jayakarta",
    line: "ANTARKOTA",
    destination: "Surabaya Gubeng",
    schedule: { "PSE": "17:10", "BKS": "17:40", "CKR": "18:00", "CNP": "20:15", "PWT": "22:05", "KYA": "22:40", "KTA": "23:35", "YK": "00:25", "SLO": "01:20", "MN": "02:25", "KTS": "03:15", "MR": "04:05", "SGU": "04:40" }
  },
  // Matarmaja
  {
    id: "KA 233 Matarmaja",
    name: "Matarmaja",
    line: "ANTARKOTA",
    destination: "Pasar Senen",
    schedule: { "ML": "09:25", "WG": "10:10", "BL": "11:00", "TA": "11:35", "KD": "12:15", "KTS": "12:55", "MN": "13:45", "SLO": "14:50", "SMT": "17:15", "PK": "18:35", "TG": "19:30", "CNP": "20:40", "PSE": "23:55" }
  },
  {
    id: "KA 234 Matarmaja",
    name: "Matarmaja",
    line: "ANTARKOTA",
    destination: "Malang",
    schedule: { "PSE": "10:45", "BKS": "11:15", "CNP": "13:30", "TG": "14:35", "PK": "15:30", "SMT": "16:55", "SLO": "19:20", "MN": "20:25", "KTS": "21:15", "KD": "21:55", "TA": "22:35", "BL": "23:10", "WG": "00:00", "ML": "00:45" }
  },
  // Bengawan
  {
    id: "KA 245 Bengawan",
    name: "Bengawan",
    line: "ANTARKOTA",
    destination: "Pasar Senen",
    schedule: { "PWS": "20:50", "KT": "21:15", "LPN": "21:40", "WT": "22:10", "KTA": "22:40", "KYA": "23:45", "PWT": "00:20", "CNP": "02:10", "BKS": "04:25", "PSE": "04:55" }
  },
  {
    id: "KA 246 Bengawan",
    name: "Bengawan",
    line: "ANTARKOTA",
    destination: "Solo Purwosari",
    schedule: { "PSE": "06:00", "BKS": "06:30", "CKR": "06:50", "CNP": "09:05", "PWT": "10:55", "KYA": "11:30", "KTA": "12:25", "WT": "12:55", "LPN": "13:25", "KT": "13:50", "PWS": "14:15" }
  },
  // Progo
  {
    id: "KA 293 Progo",
    name: "Progo",
    line: "ANTARKOTA",
    destination: "Pasar Senen",
    schedule: { "LPN": "15:10", "WT": "15:40", "KTA": "16:10", "KYA": "17:15", "PWT": "17:50", "CNP": "19:40", "BKS": "21:55", "PSE": "22:25" }
  },
  {
    id: "KA 294 Progo",
    name: "Progo",
    line: "ANTARKOTA",
    destination: "Lempuyangan",
    schedule: { "PSE": "23:00", "BKS": "23:30", "CNP": "01:45", "PWT": "03:35", "KYA": "04:10", "KTA": "05:05", "WT": "05:35", "LPN": "06:05" }
  },
  // Sri Tanjung
  {
    id: "KA 241 Sri Tanjung",
    name: "Sri Tanjung",
    line: "ANTARKOTA",
    destination: "Ketapang",
    schedule: { "LPN": "07:00", "KT": "07:25", "PWS": "07:50", "MN": "08:55", "KTS": "09:45", "JG": "10:10", "MR": "10:35", "SGU": "11:15", "SDA": "11:50", "BG": "12:30", "PB": "13:30", "JR": "15:30", "RGP": "16:45", "BWI": "17:20", "KTG": "17:40" }
  },
  {
    id: "KA 242 Sri Tanjung",
    name: "Sri Tanjung",
    line: "ANTARKOTA",
    destination: "Lempuyangan",
    schedule: { "KTG": "06:50", "BWI": "07:05", "RGP": "07:40", "JR": "08:55", "PB": "10:55", "BG": "11:55", "SDA": "12:35", "SGU": "13:10", "MR": "13:50", "JG": "14:15", "KTS": "14:40", "MN": "15:30", "PWS": "16:35", "KT": "17:00", "LPN": "17:25" }
  },
  // Wijayakusuma
  {
    id: "KA 117 Wijayakusuma",
    name: "Wijayakusuma",
    line: "ANTARKOTA",
    destination: "Ketapang",
    schedule: { "CP": "15:10", "KYA": "15:45", "KTA": "16:40", "YK": "17:30", "SLO": "18:25", "MN": "19:30", "KTS": "20:20", "SGU": "21:35", "SDA": "22:10", "BG": "22:50", "JR": "00:50", "BWI": "02:40", "KTG": "03:00" }
  },
  {
    id: "KA 118 Wijayakusuma",
    name: "Wijayakusuma",
    line: "ANTARKOTA",
    destination: "Cilacap",
    schedule: { "KTG": "11:30", "BWI": "11:45", "JR": "13:35", "BG": "15:35", "SDA": "16:15", "SGU": "16:50", "KTS": "18:05", "MN": "18:55", "SLO": "20:00", "YK": "20:55", "KTA": "21:45", "KYA": "22:40", "CP": "23:15" }
  },
  // Sawunggalih (GAPEKA 2025)
  {
    id: "KA 147 Sawunggalih Pagi",
    name: "Sawunggalih Pagi",
    line: "ANTARKOTA",
    destination: "Pasar Senen",
    schedule: { "KTA": "07:00", "GB": "07:35", "KYA": "08:05", "PWT": "08:40", "CNP": "10:30", "BKS": "12:45", "PSE": "13:15" }
  },
  {
    id: "KA 148 Sawunggalih Pagi",
    name: "Sawunggalih Pagi",
    line: "ANTARKOTA",
    destination: "Kutoarjo",
    schedule: { "PSE": "07:10", "BKS": "07:40", "CNP": "09:55", "PWT": "11:45", "KYA": "12:20", "GB": "12:50", "KTA": "13:25" }
  }
];

// ==========================================
// 3. ANTARKOTA - PARAHYANGAN & PRIANGAN
// ==========================================
const parahyanganTrains = [
  {
    id: "KA 35 Argo Parahyangan",
    name: "Argo Parahyangan",
    line: "ANTARKOTA",
    destination: "Gambir",
    schedule: { "BD": "05:00", "CMI": "05:15", "PDL": "05:28", "SKT": "05:42", "PLD": "05:58", "CA": "06:12", "PWK": "06:22", "CBR": "06:33", "CKP": "06:45", "KW": "07:00", "CKR": "07:18", "BKS": "07:34", "JNG": "07:48", "GMR": "08:05" }
  },
  {
    id: "KA 36 Argo Parahyangan",
    name: "Argo Parahyangan",
    line: "ANTARKOTA",
    destination: "Bandung",
    schedule: { "GMR": "06:30", "JNG": "06:48", "BKS": "07:02", "CKR": "07:18", "KW": "07:35", "CKP": "07:50", "CBR": "08:01", "PWK": "08:12", "CA": "08:22", "PLD": "08:35", "SKT": "08:52", "PDL": "09:05", "CMI": "09:20", "BD": "09:35" }
  },
  {
    id: "KA 37 Argo Parahyangan",
    name: "Argo Parahyangan",
    line: "ANTARKOTA",
    destination: "Gambir",
    schedule: { "BD": "10:50", "CMI": "11:05", "PDL": "11:18", "SKT": "11:32", "PLD": "11:48", "CA": "12:02", "PWK": "12:12", "CBR": "12:23", "CKP": "12:35", "KW": "12:50", "CKR": "13:08", "BKS": "13:24", "JNG": "13:38", "GMR": "13:55" }
  },
  {
    id: "KA 38 Argo Parahyangan",
    name: "Argo Parahyangan",
    line: "ANTARKOTA",
    destination: "Bandung",
    schedule: { "GMR": "12:30", "JNG": "12:48", "BKS": "13:02", "CKR": "13:18", "KW": "13:35", "CKP": "13:50", "CBR": "14:01", "PWK": "14:12", "CA": "14:22", "PLD": "14:35", "SKT": "14:52", "PDL": "15:05", "CMI": "15:20", "BD": "15:35" }
  },
  {
    id: "KA 39 Argo Parahyangan",
    name: "Argo Parahyangan",
    line: "ANTARKOTA",
    destination: "Gambir",
    schedule: { "BD": "16:10", "CMI": "16:25", "PDL": "16:38", "SKT": "16:52", "PLD": "17:08", "CA": "17:22", "PWK": "17:32", "CBR": "17:43", "CKP": "17:55", "KW": "18:10", "CKR": "18:28", "BKS": "18:44", "JNG": "18:58", "GMR": "19:15" }
  },
  {
    id: "KA 40 Argo Parahyangan",
    name: "Argo Parahyangan",
    line: "ANTARKOTA",
    destination: "Bandung",
    schedule: { "GMR": "18:25", "JNG": "18:43", "BKS": "18:57", "CKR": "19:13", "KW": "19:30", "CKP": "19:45", "CBR": "19:56", "PWK": "20:07", "CA": "20:17", "PLD": "20:30", "SKT": "20:47", "PDL": "21:00", "CMI": "21:15", "BD": "21:30" }
  },
  // Papandayan & Pangandaran
  {
    id: "KA 7047 Papandayan",
    name: "Papandayan",
    line: "ANTARKOTA",
    destination: "Gambir",
    schedule: { "GRT": "12:30", "CCL": "13:35", "KAC": "14:05", "BD": "14:25", "CMI": "14:40", "PDL": "14:55", "SKT": "15:10", "PLD": "15:25", "CA": "15:40", "PWK": "15:52", "CBR": "16:03", "CKP": "16:15", "CKR": "16:45", "BKS": "17:02", "JNG": "17:18", "GMR": "17:35" }
  },
  {
    id: "KA 7048 Papandayan",
    name: "Papandayan",
    line: "ANTARKOTA",
    destination: "Garut",
    schedule: { "GMR": "06:30", "JNG": "06:48", "BKS": "07:02", "CKR": "07:18", "CKP": "07:50", "CBR": "08:01", "PWK": "08:12", "CA": "08:22", "PLD": "08:35", "SKT": "08:52", "PDL": "09:05", "CMI": "09:20", "BD": "09:35", "KAC": "09:55", "CCL": "10:25", "GRT": "11:30" }
  },
  {
    id: "KA 7027 Pangandaran",
    name: "Pangandaran",
    line: "ANTARKOTA",
    destination: "Gambir",
    schedule: { "BJR": "16:55", "CI": "17:25", "TSM": "18:00", "KAC": "19:50", "BD": "20:10", "CMI": "20:25", "PDL": "20:40", "SKT": "20:55", "PLD": "21:10", "CA": "21:23", "PWK": "21:35", "CBR": "21:47", "CKP": "22:00", "CKR": "22:30", "BKS": "22:48", "JNG": "23:02", "GMR": "23:20" }
  },
  {
    id: "KA 7028 Pangandaran",
    name: "Pangandaran",
    line: "ANTARKOTA",
    destination: "Banjar",
    schedule: { "GMR": "09:30", "JNG": "09:48", "BKS": "10:02", "CKR": "10:18", "CKP": "10:50", "CBR": "11:01", "PWK": "11:12", "CA": "11:22", "PLD": "11:35", "SKT": "11:52", "PDL": "12:05", "CMI": "12:20", "BD": "12:35", "KAC": "12:55", "TSM": "14:45", "CI": "15:20", "BJR": "15:50" }
  },
  // Serayu
  {
    id: "KA 251 Serayu Pagi",
    name: "Serayu Pagi",
    line: "ANTARKOTA",
    destination: "Purwokerto",
    schedule: { "PSE": "09:25", "BKS": "09:55", "CKR": "10:15", "KW": "10:35", "CKP": "10:50", "CBR": "10:58", "PWK": "11:05", "CA": "11:15", "PLD": "11:28", "SKT": "11:45", "PDL": "11:58", "CMI": "12:15", "KAC": "12:45", "CCL": "13:15", "TSM": "14:50", "CI": "15:25", "BJR": "15:55", "KYA": "17:30", "PWT": "18:05" }
  },
  {
    id: "KA 252 Serayu Pagi",
    name: "Serayu Pagi",
    line: "ANTARKOTA",
    destination: "Pasar Senen",
    schedule: { "PWT": "06:50", "KYA": "07:25", "BJR": "09:00", "CI": "09:30", "TSM": "10:05", "CCL": "11:40", "KAC": "12:10", "CMI": "12:40", "PDL": "12:55", "SKT": "13:10", "PLD": "13:25", "CA": "13:38", "PWK": "13:50", "CBR": "14:00", "CKP": "14:10", "KW": "14:25", "CKR": "14:40", "BKS": "15:00", "PSE": "15:30" }
  }
];

// ==========================================
// 4. ANTARKOTA - SUMATERA (Divre I, III, IV)
// ==========================================
const sumateraAntarkotaTrains = [
  // Sribilah Utama (Medan - Rantau Prapat)
  {
    id: "KA U51 Sribilah Pagi",
    name: "Sribilah Utama Pagi",
    line: "ANTARKOTA",
    destination: "Rantau Prapat",
    schedule: { "MDN": "07:50", "TBI": "09:40", "KIS": "10:45", "MBM": "11:45", "RAP": "13:10" }
  },
  {
    id: "KA U52 Sribilah Pagi",
    name: "Sribilah Utama Pagi",
    line: "ANTARKOTA",
    destination: "Medan",
    schedule: { "RAP": "07:45", "MBM": "09:10", "KIS": "10:10", "TBI": "11:15", "MDN": "13:05" }
  },
  {
    id: "KA U53 Sribilah Siang",
    name: "Sribilah Utama Siang",
    line: "ANTARKOTA",
    destination: "Rantau Prapat",
    schedule: { "MDN": "15:00", "TBI": "16:50", "KIS": "17:55", "MBM": "18:55", "RAP": "20:20" }
  },
  {
    id: "KA U54 Sribilah Siang",
    name: "Sribilah Utama Siang",
    line: "ANTARKOTA",
    destination: "Medan",
    schedule: { "RAP": "14:35", "MBM": "16:00", "KIS": "17:00", "TBI": "18:05", "MDN": "19:55" }
  },
  {
    id: "KA U55 Sribilah Malam",
    name: "Sribilah Utama Malam",
    line: "ANTARKOTA",
    destination: "Rantau Prapat",
    schedule: { "MDN": "22:20", "TBI": "00:10", "KIS": "01:15", "MBM": "02:15", "RAP": "03:40" }
  },
  {
    id: "KA U56 Sribilah Malam",
    name: "Sribilah Utama Malam",
    line: "ANTARKOTA",
    destination: "Medan",
    schedule: { "RAP": "22:00", "MBM": "23:25", "KIS": "00:25", "TBI": "01:30", "MDN": "03:20" }
  },
  // Putri Deli (Medan - Tanjungbalai)
  {
    id: "KA U71 Putri Deli Pagi",
    name: "Putri Deli Pagi",
    line: "ANTARKOTA",
    destination: "Tanjungbalai",
    schedule: { "MDN": "07:00", "TBI": "08:50", "KIS": "09:55", "TNB": "10:35" }
  },
  {
    id: "KA U72 Putri Deli Pagi",
    name: "Putri Deli Pagi",
    line: "ANTARKOTA",
    destination: "Medan",
    schedule: { "TNB": "08:30", "KIS": "09:10", "TBI": "10:15", "MDN": "12:05" }
  },
  {
    id: "KA U73 Putri Deli Siang",
    name: "Putri Deli Siang",
    line: "ANTARKOTA",
    destination: "Tanjungbalai",
    schedule: { "MDN": "12:50", "TBI": "14:40", "KIS": "15:45", "TNB": "16:25" }
  },
  {
    id: "KA U74 Putri Deli Siang",
    name: "Putri Deli Siang",
    line: "ANTARKOTA",
    destination: "Medan",
    schedule: { "TNB": "12:40", "KIS": "13:20", "TBI": "14:25", "MDN": "16:15" }
  },
  // Siantar Ekspres
  {
    id: "KA U77 Siantar Ekspres",
    name: "Siantar Ekspres",
    line: "ANTARKOTA",
    destination: "Siantar",
    schedule: { "MDN": "11:45", "TBI": "13:35", "SIR": "14:40" }
  },
  {
    id: "KA U78 Siantar Ekspres",
    name: "Siantar Ekspres",
    line: "ANTARKOTA",
    destination: "Medan",
    schedule: { "SIR": "15:10", "TBI": "16:15", "MDN": "18:05" }
  },
  // Sindang Marga (Kertapati - Lubuklinggau)
  {
    id: "KA S1 Sindang Marga",
    name: "Sindang Marga",
    line: "ANTARKOTA",
    destination: "Lubuklinggau",
    schedule: { "KPT": "20:15", "PBM": "21:40", "ME": "22:45", "LT": "23:40", "LLG": "02:45" }
  },
  {
    id: "KA S2 Sindang Marga",
    name: "Sindang Marga",
    line: "ANTARKOTA",
    destination: "Kertapati",
    schedule: { "LLG": "20:15", "LT": "23:20", "ME": "00:15", "PBM": "01:20", "KPT": "02:45" }
  },
  // Bukit Serelo
  {
    id: "KA S5 Bukit Serelo",
    name: "Bukit Serelo",
    line: "ANTARKOTA",
    destination: "Lubuklinggau",
    schedule: { "KPT": "09:00", "PBM": "10:25", "ME": "11:30", "LT": "12:25", "LLG": "15:30" }
  },
  {
    id: "KA S6 Bukit Serelo",
    name: "Bukit Serelo",
    line: "ANTARKOTA",
    destination: "Kertapati",
    schedule: { "LLG": "09:00", "LT": "12:05", "ME": "13:00", "PBM": "14:05", "KPT": "15:30" }
  },
  // Sriwijaya (Kertapati - Tanjungkarang)
  {
    id: "KA S3 Sriwijaya",
    name: "Sriwijaya",
    line: "ANTARKOTA",
    destination: "Tanjungkarang",
    schedule: { "KPT": "21:00", "PBM": "22:25", "BTA": "00:45", "KB": "02:30", "TNK": "05:40" }
  },
  {
    id: "KA S4 Sriwijaya",
    name: "Sriwijaya",
    line: "ANTARKOTA",
    destination: "Kertapati",
    schedule: { "TNK": "21:00", "KB": "00:10", "BTA": "01:55", "PBM": "04:15", "KPT": "05:40" }
  },
  // Rajabasa
  {
    id: "KA S7 Rajabasa",
    name: "Rajabasa",
    line: "ANTARKOTA",
    destination: "Tanjungkarang",
    schedule: { "KPT": "08:30", "PBM": "09:55", "BTA": "12:15", "KB": "14:00", "TNK": "17:10" }
  },
  {
    id: "KA S8 Rajabasa",
    name: "Rajabasa",
    line: "ANTARKOTA",
    destination: "Kertapati",
    schedule: { "TNK": "08:30", "KB": "11:40", "BTA": "13:25", "PBM": "15:45", "KPT": "17:10" }
  },
  // Kuala Stabas
  {
    id: "KA S9 Kuala Stabas Pagi",
    name: "Kuala Stabas Pagi",
    line: "ANTARKOTA",
    destination: "Baturaja",
    schedule: { "TNK": "06:30", "KB": "09:40", "BTA": "11:25" }
  },
  {
    id: "KA S10 Kuala Stabas Pagi",
    name: "Kuala Stabas Pagi",
    line: "ANTARKOTA",
    destination: "Tanjungkarang",
    schedule: { "BTA": "06:30", "KB": "08:15", "TNK": "11:25" }
  },
  {
    id: "KA S11 Kuala Stabas Siang",
    name: "Kuala Stabas Siang",
    line: "ANTARKOTA",
    destination: "Baturaja",
    schedule: { "TNK": "13:30", "KB": "16:40", "BTA": "18:25" }
  },
  {
    id: "KA S12 Kuala Stabas Siang",
    name: "Kuala Stabas Siang",
    line: "ANTARKOTA",
    destination: "Tanjungkarang",
    schedule: { "BTA": "14:00", "KB": "15:45", "TNK": "18:55" }
  }
];

// ==========================================
// 5. KERETA LOKAL JAWA & SUMATERA
// ==========================================
const localTrains = [];

// 5a. Commuter Line Merak (RK <-> MER) - 14 trips
const merakDeparturesRK = ["05:10", "07:35", "09:50", "12:10", "14:20", "16:45", "19:00", "21:15"];
const merakDeparturesMER = ["05:00", "07:20", "09:40", "12:00", "14:10", "16:30", "18:50", "21:05"];

merakDeparturesRK.forEach((dep, idx) => {
  localTrains.push({
    id: `KA ${301 + idx * 2} CL Merak`,
    name: "Commuter Line Merak",
    line: "LOKAL",
    destination: "Merak",
    schedule: {
      "RK": dep,
      "CKY": addMinutes(dep, 18),
      "SG": addMinutes(dep, 42),
      "KRA": addMinutes(dep, 54),
      "CLG": addMinutes(dep, 74),
      "KEN": addMinutes(dep, 85),
      "MER": addMinutes(dep, 105)
    }
  });
});

merakDeparturesMER.forEach((dep, idx) => {
  localTrains.push({
    id: `KA ${302 + idx * 2} CL Merak`,
    name: "Commuter Line Merak",
    line: "LOKAL",
    destination: "Rangkasbitung",
    schedule: {
      "MER": dep,
      "KEN": addMinutes(dep, 20),
      "CLG": addMinutes(dep, 31),
      "KRA": addMinutes(dep, 51),
      "SG": addMinutes(dep, 63),
      "CKY": addMinutes(dep, 87),
      "RK": addMinutes(dep, 105)
    }
  });
});

// 5b. Commuter Line Bandung Raya (PDL <-> CCL) - 16 trips
const bdrDeparturesPDL = ["05:05", "06:15", "07:30", "08:50", "10:15", "11:45", "13:10", "14:40", "16:05", "17:35", "19:00", "20:30"];
const bdrDeparturesCCL = ["05:10", "06:25", "07:45", "09:10", "10:35", "12:05", "13:35", "15:00", "16:25", "17:55", "19:20", "20:50"];

bdrDeparturesPDL.forEach((dep, idx) => {
  localTrains.push({
    id: `KA ${351 + idx * 2} CL Bandung Raya`,
    name: "Commuter Line Bandung Raya",
    line: "LOKAL",
    destination: "Cicalengka",
    schedule: {
      "PDL": dep,
      "CMI": addMinutes(dep, 16),
      "BD": addMinutes(dep, 32),
      "KAC": addMinutes(dep, 46),
      "CCL": addMinutes(dep, 78)
    }
  });
});

bdrDeparturesCCL.forEach((dep, idx) => {
  localTrains.push({
    id: `KA ${352 + idx * 2} CL Bandung Raya`,
    name: "Commuter Line Bandung Raya",
    line: "LOKAL",
    destination: "Padalarang",
    schedule: {
      "CCL": dep,
      "KAC": addMinutes(dep, 32),
      "BD": addMinutes(dep, 46),
      "CMI": addMinutes(dep, 62),
      "PDL": addMinutes(dep, 78)
    }
  });
});

// 5c. Commuter Line Yogyakarta (KRL Yogya - Solo: YK <-> PL) - 16 trips
const ykSoloDeparturesYK = ["05:30", "06:50", "08:15", "09:40", "11:05", "12:30", "13:55", "15:20", "16:45", "18:10", "19:35", "21:00"];
const ykSoloDeparturesPL = ["05:35", "06:55", "08:20", "09:45", "11:10", "12:35", "14:00", "15:25", "16:50", "18:15", "19:40", "21:05"];

ykSoloDeparturesYK.forEach((dep, idx) => {
  localTrains.push({
    id: `KA ${651 + idx * 2} CL Yogyakarta`,
    name: "Commuter Line Yogyakarta",
    line: "LOKAL",
    destination: "Palur",
    schedule: {
      "YK": dep,
      "LPN": addMinutes(dep, 5),
      "KT": addMinutes(dep, 28),
      "PWS": addMinutes(dep, 52),
      "SLO": addMinutes(dep, 60),
      "PL": addMinutes(dep, 72)
    }
  });
});

ykSoloDeparturesPL.forEach((dep, idx) => {
  localTrains.push({
    id: `KA ${652 + idx * 2} CL Yogyakarta`,
    name: "Commuter Line Yogyakarta",
    line: "LOKAL",
    destination: "Yogyakarta",
    schedule: {
      "PL": dep,
      "SLO": addMinutes(dep, 12),
      "PWS": addMinutes(dep, 20),
      "KT": addMinutes(dep, 44),
      "LPN": addMinutes(dep, 67),
      "YK": addMinutes(dep, 72)
    }
  });
});

// 5d. KA Prameks (YK <-> KTA) - 8 trips
const prameksDeparturesYK = ["06:37", "10:26", "13:49", "17:50"];
const prameksDeparturesKTA = ["05:25", "09:05", "12:20", "16:05"];

prameksDeparturesYK.forEach((dep, idx) => {
  localTrains.push({
    id: `KA ${551 + idx * 2} Prameks`,
    name: "Prambanan Ekspres",
    line: "LOKAL",
    destination: "Kutoarjo",
    schedule: {
      "YK": dep,
      "WT": addMinutes(dep, 30),
      "KTA": addMinutes(dep, 65)
    }
  });
});

prameksDeparturesKTA.forEach((dep, idx) => {
  localTrains.push({
    id: `KA ${552 + idx * 2} Prameks`,
    name: "Prambanan Ekspres",
    line: "LOKAL",
    destination: "Yogyakarta",
    schedule: {
      "KTA": dep,
      "WT": addMinutes(dep, 35),
      "YK": addMinutes(dep, 65)
    }
  });
});

// 5e. Commuter Line Dhoho (SGU <-> BL via KTS) - 8 trips
const dhohoDeparturesSGU = ["05:15", "09:20", "14:15", "18:30"];
const dhohoDeparturesBL = ["04:30", "08:50", "13:40", "18:00"];

dhohoDeparturesSGU.forEach((dep, idx) => {
  localTrains.push({
    id: `KA ${401 + idx * 2} CL Dhoho`,
    name: "Commuter Line Dhoho",
    line: "LOKAL",
    destination: "Blitar",
    schedule: {
      "SGU": dep,
      "MR": addMinutes(dep, 45),
      "KTS": addMinutes(dep, 95),
      "KD": addMinutes(dep, 135),
      "TA": addMinutes(dep, 175),
      "BL": addMinutes(dep, 215)
    }
  });
});

dhohoDeparturesBL.forEach((dep, idx) => {
  localTrains.push({
    id: `KA ${402 + idx * 2} CL Dhoho`,
    name: "Commuter Line Dhoho",
    line: "LOKAL",
    destination: "Surabaya Gubeng",
    schedule: {
      "BL": dep,
      "TA": addMinutes(dep, 40),
      "KD": addMinutes(dep, 80),
      "KTS": addMinutes(dep, 120),
      "MR": addMinutes(dep, 170),
      "SGU": addMinutes(dep, 215)
    }
  });
});

// 5f. Commuter Line Penataran (SGU <-> BL via ML) - 8 trips
const penataranDeparturesSGU = ["06:45", "11:10", "15:30", "19:40"];
const penataranDeparturesBL = ["05:40", "10:15", "14:50", "19:15"];

penataranDeparturesSGU.forEach((dep, idx) => {
  localTrains.push({
    id: `KA ${431 + idx * 2} CL Penataran`,
    name: "Commuter Line Penataran",
    line: "LOKAL",
    destination: "Blitar",
    schedule: {
      "SGU": dep,
      "SDA": addMinutes(dep, 35),
      "BG": addMinutes(dep, 75),
      "ML": addMinutes(dep, 135),
      "BL": addMinutes(dep, 215)
    }
  });
});

penataranDeparturesBL.forEach((dep, idx) => {
  localTrains.push({
    id: `KA ${432 + idx * 2} CL Penataran`,
    name: "Commuter Line Penataran",
    line: "LOKAL",
    destination: "Surabaya Gubeng",
    schedule: {
      "BL": dep,
      "ML": addMinutes(dep, 80),
      "BG": addMinutes(dep, 140),
      "SDA": addMinutes(dep, 180),
      "SGU": addMinutes(dep, 215)
    }
  });
});

// 5g. Commuter Line Sri Lelawangsa (MDN <-> BIJ) - 12 trips
const lelawangsaDeparturesMDN = ["05:30", "07:00", "08:30", "10:30", "12:15", "14:00", "15:45", "17:15", "18:45", "20:30"];
const lelawangsaDeparturesBIJ = ["06:15", "07:45", "09:15", "11:15", "13:00", "14:45", "16:30", "18:00", "19:30", "21:15"];

lelawangsaDeparturesMDN.forEach((dep, idx) => {
  localTrains.push({
    id: `KA U${81 + idx * 2} Sri Lelawangsa`,
    name: "Commuter Line Sri Lelawangsa",
    line: "LOKAL",
    destination: "Binjai",
    schedule: {
      "MDN": dep,
      "BIJ": addMinutes(dep, 30)
    }
  });
});

lelawangsaDeparturesBIJ.forEach((dep, idx) => {
  localTrains.push({
    id: `KA U${82 + idx * 2} Sri Lelawangsa`,
    name: "Commuter Line Sri Lelawangsa",
    line: "LOKAL",
    destination: "Medan",
    schedule: {
      "BIJ": dep,
      "MDN": addMinutes(dep, 30)
    }
  });
});

// 5h. KA Pariaman Ekspres / Sibinuang (PD <-> NRS) - 8 trips
const sibinuangDeparturesPD = ["06:00", "09:30", "14:10", "17:35"];
const sibinuangDeparturesNRS = ["06:00", "09:20", "14:00", "17:00"];

sibinuangDeparturesPD.forEach((dep, idx) => {
  localTrains.push({
    id: `KA B${1 + idx * 2} Pariaman Ekspres`,
    name: "KA Pariaman Ekspres",
    line: "LOKAL",
    destination: "Naras",
    schedule: {
      "PD": dep,
      "ATR": addMinutes(dep, 10),
      "TAB": addMinutes(dep, 22),
      "LBY": addMinutes(dep, 50),
      "PMN": addMinutes(dep, 85),
      "NRS": addMinutes(dep, 100)
    }
  });
});

sibinuangDeparturesNRS.forEach((dep, idx) => {
  localTrains.push({
    id: `KA B${2 + idx * 2} Pariaman Ekspres`,
    name: "KA Pariaman Ekspres",
    line: "LOKAL",
    destination: "Padang",
    schedule: {
      "NRS": dep,
      "PMN": addMinutes(dep, 15),
      "LBY": addMinutes(dep, 50),
      "TAB": addMinutes(dep, 78),
      "ATR": addMinutes(dep, 90),
      "PD": addMinutes(dep, 100)
    }
  });
});

// ==========================================
// 6. WHOOSH (Kereta Cepat Jakarta - Bandung)
// ==========================================
const whooshTrains = [];
// Halim <-> Padalarang <-> Tegalluar (30 trips throughout the day from 06:00 to 21:00)
const whooshDeparturesHLM = [
  "06:40", "07:05", "07:55", "08:45", "09:10", "10:20", "11:10", "12:00", "13:02", "14:02",
  "15:00", "15:35", "16:10", "16:45", "17:35", "18:00", "18:50", "19:40", "20:30", "21:15"
];
const whooshDeparturesTGLR = [
  "06:40", "07:05", "07:55", "08:45", "09:10", "10:20", "11:10", "12:00", "13:02", "14:02",
  "15:00", "15:35", "16:10", "16:45", "17:35", "18:00", "18:50", "19:40", "20:30", "21:15"
];

whooshDeparturesHLM.forEach((dep, idx) => {
  whooshTrains.push({
    id: `Whoosh G${1101 + idx * 2}`,
    name: "Whoosh KCIC",
    line: "WHOOSH",
    destination: "Tegalluar Summarecon",
    schedule: {
      "HLM": dep,
      "PDL": addMinutes(dep, 32),
      "TGLR": addMinutes(dep, 46)
    }
  });
});

whooshDeparturesTGLR.forEach((dep, idx) => {
  whooshTrains.push({
    id: `Whoosh G${1102 + idx * 2}`,
    name: "Whoosh KCIC",
    line: "WHOOSH",
    destination: "Halim",
    schedule: {
      "TGLR": dep,
      "PDL": addMinutes(dep, 14),
      "HLM": addMinutes(dep, 46)
    }
  });
});

// ==========================================
// 7. KERETA BANDARA (Soekarno-Hatta, YIA, Kualanamu, BIM)
// ==========================================
const bandaraTrains = [];

// 7a. Bandara Soekarno-Hatta (MRI <-> BST)
const bandaraSoettaDeparturesMRI = [
  "05:00", "05:30", "06:00", "06:30", "07:00", "07:30", "08:00", "08:30", "09:00", "09:30",
  "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30",
  "20:00", "20:30", "21:00", "21:30"
];
const bandaraSoettaDeparturesBST = [
  "06:15", "06:45", "07:15", "07:45", "08:15", "08:45", "09:15", "09:45", "10:15", "10:45",
  "11:15", "11:45", "12:15", "12:45", "13:15", "13:45", "14:15", "14:45", "15:15", "15:45",
  "16:15", "16:45", "17:15", "17:45", "18:15", "18:45", "19:15", "19:45", "20:15", "20:45",
  "21:15", "21:45", "22:15", "22:45"
];

bandaraSoettaDeparturesMRI.forEach((dep, idx) => {
  bandaraTrains.push({
    id: `KA ${7101 + idx * 2} Bandara Soetta`,
    name: "KA Bandara Soekarno-Hatta",
    line: "BANDARA",
    destination: "Bandara Soekarno-Hatta",
    schedule: {
      "MRI": dep,
      "BNC": addMinutes(dep, 12),
      "DU": addMinutes(dep, 25),
      "BPR": addMinutes(dep, 42),
      "BST": addMinutes(dep, 54)
    }
  });
});

bandaraSoettaDeparturesBST.forEach((dep, idx) => {
  bandaraTrains.push({
    id: `KA ${7102 + idx * 2} Bandara Soetta`,
    name: "KA Bandara Soekarno-Hatta",
    line: "BANDARA",
    destination: "Manggarai",
    schedule: {
      "BST": dep,
      "BPR": addMinutes(dep, 12),
      "DU": addMinutes(dep, 29),
      "BNC": addMinutes(dep, 42),
      "MRI": addMinutes(dep, 54)
    }
  });
});

// 7b. Bandara YIA (YK <-> YIA)
const bandaraYIADeparturesYK = [
  "05:00", "06:00", "07:05", "08:05", "09:10", "10:10", "11:20", "12:20", "13:30", "14:30", "15:40", "16:40", "17:50", "18:50", "20:00", "21:00"
];
const bandaraYIADeparturesYIA = [
  "05:50", "06:50", "07:55", "08:55", "10:00", "11:00", "12:10", "13:10", "14:20", "15:20", "16:30", "17:30", "18:40", "19:40", "20:50", "21:50"
];

bandaraYIADeparturesYK.forEach((dep, idx) => {
  bandaraTrains.push({
    id: `KA ${7201 + idx * 2} Bandara YIA`,
    name: "KA Bandara YIA",
    line: "BANDARA",
    destination: "Bandara YIA",
    schedule: {
      "YK": dep,
      "WT": addMinutes(dep, 24),
      "YIA": addMinutes(dep, 39)
    }
  });
});

bandaraYIADeparturesYIA.forEach((dep, idx) => {
  bandaraTrains.push({
    id: `KA ${7202 + idx * 2} Bandara YIA`,
    name: "KA Bandara YIA",
    line: "BANDARA",
    destination: "Yogyakarta",
    schedule: {
      "YIA": dep,
      "WT": addMinutes(dep, 15),
      "YK": addMinutes(dep, 39)
    }
  });
});

// 7c. Bandara Minangkabau (PD <-> BIM)
const bimDeparturesPD = ["06:15", "08:20", "10:45", "13:10", "15:40", "18:00"];
const bimDeparturesBIM = ["07:15", "09:30", "11:55", "14:25", "16:50", "19:15"];

bimDeparturesPD.forEach((dep, idx) => {
  bandaraTrains.push({
    id: `KA ${7301 + idx * 2} Minangkabau Ekspres`,
    name: "KA Minangkabau Ekspres",
    line: "BANDARA",
    destination: "Bandara Minangkabau",
    schedule: {
      "PD": dep,
      "DUK": addMinutes(dep, 25),
      "BIM": addMinutes(dep, 42)
    }
  });
});

bimDeparturesBIM.forEach((dep, idx) => {
  bandaraTrains.push({
    id: `KA ${7302 + idx * 2} Minangkabau Ekspres`,
    name: "KA Minangkabau Ekspres",
    line: "BANDARA",
    destination: "Padang",
    schedule: {
      "BIM": dep,
      "DUK": addMinutes(dep, 17),
      "PD": addMinutes(dep, 42)
    }
  });
});

// 7d. Bandara Kualanamu (MDN <-> KNM)
const knmDeparturesMDN = ["05:20", "07:20", "09:20", "11:20", "13:20", "15:20", "17:20", "19:20"];
const knmDeparturesKNM = ["06:20", "08:20", "10:20", "12:20", "14:20", "16:20", "18:20", "20:20"];

knmDeparturesMDN.forEach((dep, idx) => {
  bandaraTrains.push({
    id: `KA ${7401 + idx * 2} Bandara Kualanamu`,
    name: "KA Bandara Kualanamu",
    line: "BANDARA",
    destination: "Kualanamu",
    schedule: {
      "MDN": dep,
      "KNM": addMinutes(dep, 32)
    }
  });
});

knmDeparturesKNM.forEach((dep, idx) => {
  bandaraTrains.push({
    id: `KA ${7402 + idx * 2} Bandara Kualanamu`,
    name: "KA Bandara Kualanamu",
    line: "BANDARA",
    destination: "Medan",
    schedule: {
      "KNM": dep,
      "MDN": addMinutes(dep, 32)
    }
  });
});

// Merge all national trains
const allNationalTrains = [
  ...panturaTrains,
  ...selatanTrains,
  ...parahyanganTrains,
  ...sumateraAntarkotaTrains,
  ...localTrains,
  ...whooshTrains,
  ...bandaraTrains
];

console.log(`Generated ${allNationalTrains.length} national GAPEKA train trips:`);
console.log(`- Pantura Antarkota: ${panturaTrains.length}`);
console.log(`- Selatan & Tengah Antarkota: ${selatanTrains.length}`);
console.log(`- Parahyangan Antarkota: ${parahyanganTrains.length}`);
console.log(`- Sumatera Antarkota: ${sumateraAntarkotaTrains.length}`);
console.log(`- Lokal (Jawa & Sumatera): ${localTrains.length}`);
console.log(`- Whoosh (KCIC): ${whooshTrains.length}`);
console.log(`- Bandara (Soetta, YIA, Kualanamu, BIM): ${bandaraTrains.length}`);

// Write to static/data/national-gapeka.json
const outputPath = path.resolve(__dirname, '../static/data/national-gapeka.json');
fs.writeFileSync(outputPath, JSON.stringify(allNationalTrains, null, 2), 'utf-8');
console.log(`Saved to ${outputPath}`);
