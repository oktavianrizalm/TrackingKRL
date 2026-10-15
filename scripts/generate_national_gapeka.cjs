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
  },
  // Pandalungan (GAPEKA 2025/2026: Gambir - Jember via Surabaya Pasarturi)
  {
    id: "KA 75F Pandalungan",
    name: "Pandalungan",
    line: "ANTARKOTA",
    destination: "Gambir",
    schedule: { "JR": "14:55", "TGL": "15:35", "KK": "16:15", "PB": "17:00", "BG": "18:05", "SBI": "19:15", "BJ": "20:30", "CU": "21:05", "SMT": "22:30", "PK": "23:45", "TG": "00:35", "CN": "01:30", "JNG": "03:55", "GMR": "04:15" }
  },
  {
    id: "KA 76F Pandalungan",
    name: "Pandalungan",
    line: "ANTARKOTA",
    destination: "Jember",
    schedule: { "GMR": "20:05", "CN": "22:40", "TG": "23:35", "PK": "00:25", "SMT": "01:35", "CU": "03:00", "BJ": "03:35", "SBI": "04:50", "BG": "06:05", "PB": "07:10", "KK": "07:55", "TGL": "08:40", "JR": "09:15" }
  },
  // Majapahit (GAPEKA 2025/2026: Pasar Senen - Malang via Semarang)
  {
    id: "KA 215 Majapahit",
    name: "Majapahit",
    line: "ANTARKOTA",
    destination: "Pasar Senen",
    schedule: { "ML": "18:45", "BG": "19:55", "SDA": "20:25", "SGU": "20:55", "SBI": "21:20", "LMG": "21:55", "BBT": "22:20", "BJ": "22:50", "CU": "23:25", "NBO": "00:25", "SMT": "01:15", "PK": "02:30", "TG": "03:20", "CNP": "04:15", "BKS": "06:40", "JNG": "06:58", "PSE": "07:15" }
  },
  {
    id: "KA 216 Majapahit",
    name: "Majapahit",
    line: "ANTARKOTA",
    destination: "Malang",
    schedule: { "PSE": "19:20", "BKS": "19:50", "CNP": "22:25", "TG": "23:20", "PK": "00:10", "SMT": "01:25", "NBO": "02:15", "CU": "03:15", "BJ": "03:50", "BBT": "04:20", "LMG": "04:45", "SBI": "05:25", "SGU": "05:50", "SDA": "06:20", "BG": "06:50", "ML": "08:00" }
  },
  // Brantas (Pasar Senen - Blitar via Semarang & Solo)
  {
    id: "KA 151 Brantas",
    name: "Brantas",
    line: "ANTARKOTA",
    destination: "Pasar Senen",
    schedule: { "BL": "14:00", "TA": "14:35", "KD": "15:05", "KTS": "15:45", "MN": "16:45", "SK": "18:00", "SMT": "20:10", "PK": "21:25", "TG": "22:20", "BB": "22:40", "CNP": "23:25", "BKS": "01:50", "PSE": "02:20" }
  },
  {
    id: "KA 152 Brantas",
    name: "Brantas",
    line: "ANTARKOTA",
    destination: "Blitar",
    schedule: { "PSE": "13:30", "BKS": "14:00", "CNP": "16:25", "BB": "17:10", "TG": "17:30", "PK": "18:25", "SMT": "19:40", "SK": "21:50", "MN": "23:05", "KTS": "00:05", "KD": "00:40", "TA": "01:05", "BL": "01:45" }
  },
  // Gumarang (Pasar Senen - Surabaya Pasarturi via Semarang)
  {
    id: "KA 163 Gumarang",
    name: "Gumarang",
    line: "ANTARKOTA",
    destination: "Pasar Senen",
    schedule: { "SBI": "16:05", "LMG": "16:45", "BBT": "17:10", "BJ": "17:45", "CU": "18:25", "SMT": "20:00", "PK": "21:15", "TG": "22:10", "CN": "23:15", "BKS": "01:35", "PSE": "02:05" }
  },
  {
    id: "KA 164 Gumarang",
    name: "Gumarang",
    line: "ANTARKOTA",
    destination: "Surabaya Pasarturi",
    schedule: { "PSE": "20:45", "BKS": "21:15", "CN": "23:35", "TG": "00:40", "PK": "01:35", "SMT": "02:50", "CU": "04:25", "BJ": "05:05", "BBT": "05:40", "LMG": "06:05", "SBI": "06:45" }
  },
  // Menoreh (Pasar Senen - Semarang Tawang)
  {
    id: "KA 175 Menoreh",
    name: "Menoreh",
    line: "ANTARKOTA",
    destination: "Pasar Senen",
    schedule: { "SMT": "07:55", "PK": "09:15", "TG": "10:10", "BB": "10:30", "CNP": "11:15", "BKS": "13:35", "JNG": "13:50", "PSE": "14:05" }
  },
  {
    id: "KA 176 Menoreh",
    name: "Menoreh",
    line: "ANTARKOTA",
    destination: "Semarang Tawang",
    schedule: { "PSE": "16:55", "BKS": "17:25", "CNP": "19:45", "BB": "20:30", "TG": "20:50", "PK": "21:45", "SMT": "23:05" }
  },
  // Tawang Jaya (Pasar Senen - Semarang Poncol)
  {
    id: "KA 259 Tawang Jaya",
    name: "Tawang Jaya",
    line: "ANTARKOTA",
    destination: "Pasar Senen",
    schedule: { "SMC": "13:20", "PK": "14:40", "TG": "15:40", "BB": "16:00", "CNP": "17:00", "CKR": "19:05", "BKS": "19:25", "PSE": "19:55" }
  },
  {
    id: "KA 260 Tawang Jaya",
    name: "Tawang Jaya",
    line: "ANTARKOTA",
    destination: "Semarang Poncol",
    schedule: { "PSE": "23:45", "BKS": "00:15", "CKR": "00:35", "CNP": "02:35", "BB": "03:30", "TG": "03:50", "PK": "04:50", "SMC": "06:10" }
  },
  // Tegal Bahari (Pasar Senen - Tegal)
  {
    id: "KA 203 Tegal Bahari",
    name: "Tegal Bahari",
    line: "ANTARKOTA",
    destination: "Pasar Senen",
    schedule: { "TG": "14:30", "BB": "14:50", "CN": "15:40", "JNG": "17:45", "PSE": "18:05" }
  },
  {
    id: "KA 204 Tegal Bahari",
    name: "Tegal Bahari",
    line: "ANTARKOTA",
    destination: "Tegal",
    schedule: { "PSE": "09:20", "BKS": "09:50", "CN": "12:10", "BB": "13:00", "TG": "13:20" }
  },
  // Ambarawa Ekspres (Semarang Poncol - Surabaya Pasarturi)
  {
    id: "KA 263 Ambarawa Ekspres",
    name: "Ambarawa Ekspres",
    line: "ANTARKOTA",
    destination: "Semarang Poncol",
    schedule: { "SBI": "13:45", "LMG": "14:25", "BBT": "14:50", "BJ": "15:25", "CU": "16:00", "RBG": "16:25", "NBO": "17:15", "SMT": "18:08", "SMC": "18:20" }
  },
  {
    id: "KA 264 Ambarawa Ekspres",
    name: "Ambarawa Ekspres",
    line: "ANTARKOTA",
    destination: "Surabaya Pasarturi",
    schedule: { "SMC": "08:30", "SMT": "08:42", "NBO": "09:35", "RBG": "10:25", "CU": "10:50", "BJ": "11:25", "BBT": "12:00", "LMG": "12:25", "SBI": "13:05" }
  },
  // Banyubiru (Semarang Tawang - Solo Balapan)
  {
    id: "KA 267 Banyubiru",
    name: "Banyubiru",
    line: "ANTARKOTA",
    destination: "Semarang Tawang",
    schedule: { "SLO": "17:15", "GD": "18:15", "BBG": "19:02", "SMT": "19:20" }
  },
  {
    id: "KA 268 Banyubiru",
    name: "Banyubiru",
    line: "ANTARKOTA",
    destination: "Solo Balapan",
    schedule: { "SMT": "07:50", "BBG": "08:08", "GD": "08:55", "SLO": "09:55" }
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
  // Sawunggalih Pagi (GAPEKA Terbaru / 168Railway: Kutoarjo - Pasar Senen PP)
  {
    id: "KA 111 Sawunggalih Pagi",
    name: "Sawunggalih Pagi",
    line: "ANTARKOTA",
    destination: "Pasar Senen",
    schedule: { "KTA": "06:30", "KM": "06:52", "GB": "07:16", "KYA": "07:44", "PWT": "08:12", "CN": "10:08", "BKS": "12:16", "JNG": "12:30", "PSE": "12:40" }
  },
  {
    id: "KA 116 Sawunggalih Pagi",
    name: "Sawunggalih Pagi",
    line: "ANTARKOTA",
    destination: "Kutoarjo",
    schedule: { "PSE": "07:10", "BKS": "07:38", "CN": "09:45", "PWT": "11:40", "KYA": "12:05", "GB": "12:30", "KM": "12:54", "KTA": "13:10" }
  },
  // Progo (GAPEKA Terbaru / 168Railway: Lempuyangan - Pasar Senen PP)
  {
    id: "KA 257 Progo",
    name: "Progo",
    line: "ANTARKOTA",
    destination: "Pasar Senen",
    schedule: {
      "LPN": "13:10",
      "WT": "13:41",
      "KTA": "14:14",
      "KWN": "14:32",
      "KM": "14:43",
      "GB": "15:07",
      "KYA": "15:34",
      "PWT": "16:03",
      "PPK": "17:06",
      "KGG": "17:27",
      "CNP": "18:02",
      "HGL": "19:02",
      "BKS": "20:22",
      "JNG": "20:36",
      "PSE": "20:46"
    }
  },
  {
    id: "KA 258 Progo",
    name: "Progo",
    line: "ANTARKOTA",
    destination: "Lempuyangan",
    schedule: {
      "PSE": "23:20",
      "JNG": "23:32",
      "BKS": "23:45",
      "HGL": "01:03",
      "CNP": "02:05",
      "KGG": "02:38",
      "PPK": "02:59",
      "PWT": "04:04",
      "KYA": "04:29",
      "GB": "04:53",
      "KM": "05:11",
      "KWN": "05:22",
      "KTA": "05:40",
      "WT": "06:10",
      "LPN": "06:40"
    }
  },
  // Argo Semeru (Gambir - Surabaya Gubeng via Purwokerto/Yogyakarta)
  {
    id: "KA 5 Argo Semeru",
    name: "Argo Semeru",
    line: "ANTARKOTA",
    destination: "Gambir",
    schedule: { "SGU": "09:05", "MR": "09:38", "JG": "09:56", "KTS": "10:11", "NJ": "10:29", "MN": "11:06", "SLO": "12:11", "YK": "12:56", "KTA": "13:42", "KM": "14:03", "KYA": "14:38", "PWT": "15:06", "CN": "16:55", "BKS": "19:02", "JNG": "19:15", "GMR": "19:35" }
  },
  {
    id: "KA 6 Argo Semeru",
    name: "Argo Semeru",
    line: "ANTARKOTA",
    destination: "Surabaya Gubeng",
    schedule: { "GMR": "06:20", "BKS": "06:46", "CN": "08:54", "PWT": "10:41", "KYA": "11:05", "KM": "11:39", "KTA": "12:02", "YK": "12:50", "SLO": "13:33", "MN": "14:41", "NJ": "15:14", "KTS": "15:35", "JG": "15:58", "MR": "16:20", "SGU": "16:50" }
  },
  // Bogowonto (Pasar Senen - Lempuyangan)
  {
    id: "KA 103 Bogowonto",
    name: "Bogowonto",
    line: "ANTARKOTA",
    destination: "Pasar Senen",
    schedule: { "LPN": "08:15", "WT": "08:45", "KTA": "09:20", "KYA": "10:15", "PWT": "10:50", "CNP": "12:50", "BKS": "15:10", "PSE": "15:40" }
  },
  {
    id: "KA 104 Bogowonto",
    name: "Bogowonto",
    line: "ANTARKOTA",
    destination: "Lempuyangan",
    schedule: { "PSE": "18:10", "BKS": "18:40", "CNP": "21:00", "PWT": "23:00", "KYA": "23:35", "KTA": "00:30", "WT": "01:05", "LPN": "01:35" }
  },
  // Gajahwong (Pasar Senen - Lempuyangan)
  {
    id: "KA 105 Gajahwong",
    name: "Gajahwong",
    line: "ANTARKOTA",
    destination: "Pasar Senen",
    schedule: { "LPN": "20:40", "WT": "21:10", "KTA": "21:45", "KYA": "22:40", "PWT": "23:15", "CNP": "01:15", "BKS": "03:35", "PSE": "04:05" }
  },
  {
    id: "KA 106 Gajahwong",
    name: "Gajahwong",
    line: "ANTARKOTA",
    destination: "Lempuyangan",
    schedule: { "PSE": "07:55", "BKS": "08:25", "CNP": "10:45", "PWT": "12:45", "KYA": "13:20", "KTA": "14:15", "WT": "14:50", "LPN": "15:20" }
  },
  // Mataram (Pasar Senen - Solo Balapan)
  {
    id: "KA 75 Mataram",
    name: "Mataram",
    line: "ANTARKOTA",
    destination: "Pasar Senen",
    schedule: { "SLO": "07:15", "KT": "07:40", "YK": "08:05", "KTA": "08:55", "KYA": "09:50", "PWT": "10:25", "CN": "12:25", "BKS": "14:45", "PSE": "15:15" }
  },
  {
    id: "KA 76 Mataram",
    name: "Mataram",
    line: "ANTARKOTA",
    destination: "Solo Balapan",
    schedule: { "PSE": "22:05", "BKS": "22:35", "CN": "00:55", "PWT": "02:55", "KYA": "03:30", "KTA": "04:25", "YK": "05:15", "KT": "05:40", "SLO": "06:05" }
  },
  // Bangunkarta (Pasar Senen - Jombang via Solo)
  {
    id: "KA 161 Bangunkarta",
    name: "Bangunkarta",
    line: "ANTARKOTA",
    destination: "Pasar Senen",
    schedule: { "JG": "05:40", "KTS": "06:05", "MN": "07:00", "SLO": "08:10", "YK": "09:00", "KTA": "09:50", "KYA": "10:45", "PWT": "11:20", "CN": "13:20", "BKS": "15:40", "PSE": "16:10" }
  },
  {
    id: "KA 162 Bangunkarta",
    name: "Bangunkarta",
    line: "ANTARKOTA",
    destination: "Jombang",
    schedule: { "PSE": "12:25", "BKS": "12:55", "CN": "15:15", "PWT": "17:15", "KYA": "17:50", "KTA": "18:45", "YK": "19:35", "SLO": "20:30", "MN": "21:40", "KTS": "22:35", "JG": "23:00" }
  },
  // Singasari (Pasar Senen - Blitar via Purwokerto)
  {
    id: "KA 149 Singasari",
    name: "Singasari",
    line: "ANTARKOTA",
    destination: "Pasar Senen",
    schedule: { "BL": "16:45", "TA": "17:15", "KD": "17:45", "KTS": "18:25", "MN": "19:25", "SLO": "20:35", "YK": "21:25", "KTA": "22:15", "KYA": "23:10", "PWT": "23:45", "CN": "01:45", "BKS": "04:05", "PSE": "04:35" }
  },
  {
    id: "KA 150 Singasari",
    name: "Singasari",
    line: "ANTARKOTA",
    destination: "Blitar",
    schedule: { "PSE": "20:55", "BKS": "21:25", "CN": "23:45", "PWT": "01:45", "KYA": "02:20", "KTA": "03:15", "YK": "04:05", "SLO": "05:00", "MN": "06:10", "KTS": "07:05", "KD": "07:40", "TA": "08:05", "BL": "08:45" }
  },
  // Jaka Tingkir (Pasar Senen - Solo Purwosari)
  {
    id: "KA 255 Jaka Tingkir",
    name: "Jaka Tingkir",
    line: "ANTARKOTA",
    destination: "Pasar Senen",
    schedule: { "PWS": "23:45", "KT": "00:10", "LPN": "00:35", "WT": "01:05", "KTA": "01:40", "KYA": "02:35", "PWT": "03:10", "CNP": "05:10", "BKS": "07:30", "PSE": "08:00" }
  },
  {
    id: "KA 256 Jaka Tingkir",
    name: "Jaka Tingkir",
    line: "ANTARKOTA",
    destination: "Solo Purwosari",
    schedule: { "PSE": "12:00", "BKS": "12:30", "CNP": "14:50", "PWT": "16:50", "KYA": "17:25", "KTA": "18:20", "WT": "18:55", "LPN": "19:25", "KT": "19:50", "PWS": "20:15" }
  },
  // Pasundan (Kiaracondong - Surabaya Gubeng)
  {
    id: "KA 275 Pasundan",
    name: "Pasundan",
    line: "ANTARKOTA",
    destination: "Kiaracondong",
    schedule: { "SGU": "05:50", "MR": "06:25", "JG": "06:55", "KTS": "07:20", "MN": "08:20", "PWS": "09:35", "KT": "10:00", "LPN": "10:25", "WT": "10:55", "KTA": "11:30", "KYA": "12:25", "BJR": "14:00", "CI": "14:30", "TSM": "15:00", "CPD": "15:45", "KAC": "17:35" }
  },
  {
    id: "KA 276 Pasundan",
    name: "Pasundan",
    line: "ANTARKOTA",
    destination: "Surabaya Gubeng",
    schedule: { "KAC": "10:15", "CPD": "12:00", "TSM": "12:45", "CI": "13:15", "BJR": "13:45", "KYA": "15:20", "KTA": "16:15", "WT": "16:50", "LPN": "17:20", "KT": "17:45", "PWS": "18:10", "MN": "19:25", "KTS": "20:25", "JG": "20:50", "MR": "21:20", "SGU": "21:55" }
  },
  // Kahuripan (Kiaracondong - Blitar)
  {
    id: "KA 273 Kahuripan",
    name: "Kahuripan",
    line: "ANTARKOTA",
    destination: "Kiaracondong",
    schedule: { "BL": "15:45", "TA": "16:20", "KD": "16:50", "KTS": "17:35", "MN": "18:35", "PWS": "19:50", "LPN": "20:40", "KTA": "21:40", "KYA": "22:35", "BJR": "00:10", "CI": "00:40", "TSM": "01:10", "CPD": "01:55", "KAC": "03:40" }
  },
  {
    id: "KA 274 Kahuripan",
    name: "Kahuripan",
    line: "ANTARKOTA",
    destination: "Blitar",
    schedule: { "KAC": "22:15", "CPD": "00:00", "TSM": "00:45", "CI": "01:15", "BJR": "01:45", "KYA": "03:20", "KTA": "04:15", "LPN": "05:20", "PWS": "06:10", "MN": "07:25", "KTS": "08:25", "KD": "09:05", "TA": "09:35", "BL": "10:15" }
  },
  // Kertanegara (Purwokerto - Malang via Solo)
  {
    id: "KA 167 Kertanegara",
    name: "Kertanegara",
    line: "ANTARKOTA",
    destination: "Purwokerto",
    schedule: { "ML": "08:20", "BL": "10:05", "TA": "10:35", "KD": "11:05", "KTS": "11:45", "MN": "12:35", "SLO": "13:40", "YK": "14:30", "KTA": "15:20", "KYA": "16:15", "PWT": "16:45" }
  },
  {
    id: "KA 168 Kertanegara",
    name: "Kertanegara",
    line: "ANTARKOTA",
    destination: "Malang",
    schedule: { "PWT": "18:40", "KYA": "19:07", "KTA": "20:00", "YK": "20:50", "SLO": "21:40", "MN": "22:45", "KTS": "23:35", "KD": "00:10", "TA": "00:35", "BL": "01:10", "ML": "03:05" }
  },
  // Kutojaya Selatan (Kiaracondong - Kutoarjo)
  {
    id: "KA 291 Kutojaya Selatan",
    name: "Kutojaya Selatan",
    line: "ANTARKOTA",
    destination: "Kiaracondong",
    schedule: { "KTA": "09:40", "KM": "10:03", "GB": "10:25", "KYA": "11:00", "BJR": "12:35", "CI": "13:05", "TSM": "13:40", "CPD": "14:25", "KAC": "16:40" }
  },
  {
    id: "KA 292 Kutojaya Selatan",
    name: "Kutojaya Selatan",
    line: "ANTARKOTA",
    destination: "Kutoarjo",
    schedule: { "KAC": "20:50", "CPD": "22:40", "TSM": "23:25", "CI": "23:55", "BJR": "00:25", "KYA": "02:00", "GB": "02:35", "KM": "02:57", "KTA": "03:20" }
  },
  // Logawa (Purwokerto - Jember via Surabaya Gubeng)
  {
    id: "KA 248 Logawa",
    name: "Logawa",
    line: "ANTARKOTA",
    destination: "Jember",
    schedule: { "PWT": "05:30", "KYA": "06:05", "KTA": "07:00", "LPN": "08:00", "PWS": "08:50", "MN": "10:05", "KTS": "11:05", "JG": "11:30", "SGU": "12:35", "SDA": "13:10", "BG": "13:50", "PB": "14:50", "KK": "15:35", "JR": "16:45" }
  },
  {
    id: "KA 249 Logawa",
    name: "Logawa",
    line: "ANTARKOTA",
    destination: "Purwokerto",
    schedule: { "JR": "06:15", "KK": "07:25", "PB": "08:10", "BG": "09:10", "SDA": "09:50", "SGU": "10:25", "JG": "11:30", "KTS": "11:55", "MN": "12:55", "PWS": "14:10", "LPN": "15:00", "KTA": "16:00", "KYA": "16:55", "PWT": "17:30" }
  },
  // Ranggajati (Cirebon - Jember via Solo/Surabaya)
  {
    id: "KA 155 Ranggajati",
    name: "Ranggajati",
    line: "ANTARKOTA",
    destination: "Cirebon",
    schedule: { "JR": "05:15", "KK": "06:25", "PB": "07:10", "BG": "08:10", "SDA": "08:50", "SGU": "09:25", "JG": "10:30", "KTS": "10:55", "MN": "11:55", "SLO": "13:05", "YK": "14:00", "KTA": "14:50", "KYA": "15:45", "PWT": "16:20", "CN": "18:20" }
  },
  {
    id: "KA 156 Ranggajati",
    name: "Ranggajati",
    line: "ANTARKOTA",
    destination: "Jember",
    schedule: { "CN": "06:45", "PWT": "08:45", "KYA": "09:20", "KTA": "10:15", "YK": "11:05", "SLO": "12:00", "MN": "13:10", "KTS": "14:10", "JG": "14:35", "SGU": "15:40", "SDA": "16:15", "BG": "16:55", "PB": "17:55", "KK": "18:40", "JR": "19:50" }
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
  // Serayu Pagi & Malam (Pasar Senen - Purwokerto via Kiaracondong/Kroya)
  {
    id: "KA 284 Serayu Pagi",
    name: "Serayu Pagi",
    line: "ANTARKOTA",
    destination: "Purwokerto",
    schedule: { "PSE": "09:25", "BKS": "09:55", "CKR": "10:15", "KW": "10:35", "CKP": "10:50", "CBR": "10:58", "PWK": "11:05", "CA": "11:15", "PLD": "11:28", "SKT": "11:45", "PDL": "11:58", "CMI": "12:15", "KAC": "12:45", "CCL": "13:15", "TSM": "14:50", "CI": "15:25", "BJR": "15:55", "KYA": "17:30", "PWT": "18:05" }
  },
  {
    id: "KA 286 Serayu Malam",
    name: "Serayu Malam",
    line: "ANTARKOTA",
    destination: "Purwokerto",
    schedule: { "PSE": "20:10", "BKS": "20:40", "CKR": "21:00", "KW": "21:18", "CKP": "21:30", "PWK": "21:45", "PDL": "22:38", "CMI": "22:55", "KAC": "23:25", "CCL": "23:55", "TSM": "01:30", "CI": "02:05", "BJR": "02:35", "KYA": "04:10", "PWT": "04:45" }
  },
  {
    id: "KA 283 Serayu Pagi",
    name: "Serayu Pagi",
    line: "ANTARKOTA",
    destination: "Pasar Senen",
    schedule: { "PWT": "06:45", "KYA": "07:20", "BJR": "08:55", "CI": "09:25", "TSM": "10:00", "CCL": "11:35", "KAC": "12:05", "CMI": "12:35", "PDL": "12:50", "SKT": "13:05", "PLD": "13:20", "CA": "13:33", "PWK": "13:45", "CBR": "13:55", "CKP": "14:05", "KW": "14:20", "CKR": "14:35", "BKS": "14:55", "PSE": "15:25" }
  },
  {
    id: "KA 285 Serayu Malam",
    name: "Serayu Malam",
    line: "ANTARKOTA",
    destination: "Pasar Senen",
    schedule: { "PWT": "16:30", "KYA": "17:05", "BJR": "18:40", "CI": "19:10", "TSM": "19:45", "CCL": "21:20", "KAC": "21:50", "CMI": "22:20", "PDL": "22:35", "PWK": "23:30", "CKP": "23:50", "KW": "00:05", "CKR": "00:20", "BKS": "00:40", "PSE": "01:10" }
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
  {
    id: "KA U75 Putri Deli Sore",
    name: "Putri Deli Sore",
    line: "ANTARKOTA",
    destination: "Tanjungbalai",
    schedule: { "MDN": "18:55", "TBI": "20:45", "KIS": "21:50", "TNB": "22:30" }
  },
  {
    id: "KA U76 Putri Deli Sore",
    name: "Putri Deli Sore",
    line: "ANTARKOTA",
    destination: "Medan",
    schedule: { "TNB": "19:00", "KIS": "19:40", "TBI": "20:45", "MDN": "22:35" }
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

// 5b. Commuter Line Bandung Raya (PDL <-> CCL) - 24 trips (GAPEKA 2025/2026: Kecepatan s.d. 110 km/jam, durasi 63 menit)
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
      "CMI": addMinutes(dep, 14),
      "BD": addMinutes(dep, 28),
      "KAC": addMinutes(dep, 40),
      "CCL": addMinutes(dep, 63)
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
      "KAC": addMinutes(dep, 25),
      "BD": addMinutes(dep, 38),
      "CMI": addMinutes(dep, 50),
      "PDL": addMinutes(dep, 63)
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

// 5d. KA Prameks (YK <-> KTA) - 10 trips (GAPEKA 2025/2026: Tambahan frekuensi)
const prameksDeparturesYK = ["06:37", "09:05", "11:45", "14:55", "17:50"];
const prameksDeparturesKTA = ["05:25", "07:50", "10:20", "13:30", "16:25"];

prameksDeparturesYK.forEach((dep, idx) => {
  localTrains.push({
    id: `KA ${551 + idx * 2} Prameks`,
    name: "Prambanan Ekspres",
    line: "LOKAL",
    destination: "Kutoarjo",
    schedule: {
      "YK": dep,
      "WT": addMinutes(dep, 28),
      "KTA": addMinutes(dep, 58)
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
      "WT": addMinutes(dep, 30),
      "YK": addMinutes(dep, 58)
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
// 6. WHOOSH (Kereta Cepat Jakarta - Bandung) - 62 Trips (GAPEKA 2025/2026)
// ==========================================
const whooshTrains = [];
// Halim <-> Padalarang <-> Tegalluar (62 trips throughout the day from 06:00 to 21:00 with 30-min peak headway)
const whooshDeparturesHLM = [
  "06:00", "06:30", "07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00"
];
const whooshDeparturesTGLR = [
  "06:00", "06:30", "07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00"
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

// 7b. Bandara YIA (YK <-> YIA) - 24 Regular Trips + 8 Xpress Trips (GAPEKA 2025/2026 KAI Commuter)
const bandaraYIADeparturesYK = [
  "04:20", "05:10", "06:30", "08:33", "08:55", "10:15", "12:00", "12:35", "14:13", "15:49", "16:07", "18:25"
];
const bandaraYIADeparturesYIA = [
  "05:16", "06:20", "07:46", "09:53", "11:35", "13:25", "14:56", "15:20", "17:00", "17:34", "19:46", "20:55"
];
const bandaraYIAXpressYK = [
  "05:00", "07:20", "09:30", "11:00", "13:40", "16:40", "18:00", "20:15"
];
const bandaraYIAXpressYIA = [
  "05:55", "08:15", "10:25", "11:55", "14:35", "17:35", "18:55", "21:10"
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

// KA Bandara YIA Xpress (Non-stop ~35 menit)
bandaraYIAXpressYK.forEach((dep, idx) => {
  bandaraTrains.push({
    id: `KA ${7251 + idx * 2} YIA Xpress`,
    name: "KA Bandara YIA Xpress",
    line: "BANDARA",
    destination: "Bandara YIA",
    schedule: {
      "YK": dep,
      "YIA": addMinutes(dep, 35)
    }
  });
});

bandaraYIAXpressYIA.forEach((dep, idx) => {
  bandaraTrains.push({
    id: `KA ${7252 + idx * 2} YIA Xpress`,
    name: "KA Bandara YIA Xpress",
    line: "BANDARA",
    destination: "Yogyakarta",
    schedule: {
      "YIA": dep,
      "YK": addMinutes(dep, 35)
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

// ==========================================
// 8. LRT (LRT Jabodebek, LRT Jakarta, LRT Sumsel) - GAPEKA 2025/2026
// ==========================================
const lrtTrains = [];

// 8a. LRT Jabodebek - Lin Cibubur (DUKUH <-> HARJA)
const lrtCibuburDeparturesDUKUH = [];
for (let h = 5; h <= 22; h++) {
  const mins = (h === 5) ? [30, 42, 54] : (h >= 6 && h <= 9 || h >= 16 && h <= 19) ? [6, 18, 30, 42, 54] : [10, 25, 40, 55];
  mins.forEach(m => {
    lrtCibuburDeparturesDUKUH.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  });
}
lrtCibuburDeparturesDUKUH.push("23:00");

const lrtCibuburDeparturesHARJA = [];
for (let h = 5; h <= 22; h++) {
  const mins = (h === 5) ? [10, 22, 34, 46, 58] : (h >= 6 && h <= 9 || h >= 16 && h <= 19) ? [10, 22, 34, 46, 58] : [10, 25, 40, 55];
  mins.forEach(m => {
    lrtCibuburDeparturesHARJA.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  });
}

lrtCibuburDeparturesDUKUH.forEach((dep, idx) => {
  lrtTrains.push({
    id: `LRT C${101 + idx * 2}`,
    name: "LRT Jabodebek Lin Cibubur",
    line: "LRT",
    destination: "Harjamukti",
    schedule: {
      "DUKUH": dep,
      "SETIA": addMinutes(dep, 2),
      "RASUN": addMinutes(dep, 5),
      "KUNIN": addMinutes(dep, 7),
      "PANCO": addMinutes(dep, 11),
      "CIKOK": addMinutes(dep, 14),
      "CILIW": addMinutes(dep, 16),
      "CW_LRT": addMinutes(dep, 18),
      "TAMAN": addMinutes(dep, 24),
      "KAMPU": addMinutes(dep, 27),
      "CIRAC": addMinutes(dep, 30),
      "HARJA": addMinutes(dep, 34)
    }
  });
});

lrtCibuburDeparturesHARJA.forEach((dep, idx) => {
  lrtTrains.push({
    id: `LRT C${102 + idx * 2}`,
    name: "LRT Jabodebek Lin Cibubur",
    line: "LRT",
    destination: "Dukuh Atas",
    schedule: {
      "HARJA": dep,
      "CIRAC": addMinutes(dep, 4),
      "KAMPU": addMinutes(dep, 7),
      "TAMAN": addMinutes(dep, 10),
      "CW_LRT": addMinutes(dep, 16),
      "CILIW": addMinutes(dep, 18),
      "CIKOK": addMinutes(dep, 20),
      "PANCO": addMinutes(dep, 23),
      "KUNIN": addMinutes(dep, 27),
      "RASUN": addMinutes(dep, 29),
      "SETIA": addMinutes(dep, 32),
      "DUKUH": addMinutes(dep, 34)
    }
  });
});

// 8b. LRT Jabodebek - Lin Bekasi (DUKUH <-> JATIM)
const lrtBekasiDeparturesDUKUH = [];
for (let h = 5; h <= 22; h++) {
  const mins = (h === 5) ? [35, 48] : (h >= 6 && h <= 9 || h >= 16 && h <= 19) ? [0, 12, 24, 36, 48] : [5, 20, 35, 50];
  mins.forEach(m => {
    lrtBekasiDeparturesDUKUH.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  });
}
lrtBekasiDeparturesDUKUH.push("22:45");

const lrtBekasiDeparturesJATIM = [];
for (let h = 5; h <= 22; h++) {
  const mins = (h === 5) ? [0, 14, 28, 42, 54] : (h >= 6 && h <= 9 || h >= 16 && h <= 19) ? [6, 18, 30, 42, 54] : [5, 20, 35, 50];
  mins.forEach(m => {
    lrtBekasiDeparturesJATIM.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  });
}

lrtBekasiDeparturesDUKUH.forEach((dep, idx) => {
  lrtTrains.push({
    id: `LRT B${201 + idx * 2}`,
    name: "LRT Jabodebek Lin Bekasi",
    line: "LRT",
    destination: "Jatimulya",
    schedule: {
      "DUKUH": dep,
      "SETIA": addMinutes(dep, 2),
      "RASUN": addMinutes(dep, 5),
      "KUNIN": addMinutes(dep, 7),
      "PANCO": addMinutes(dep, 11),
      "CIKOK": addMinutes(dep, 14),
      "CILIW": addMinutes(dep, 16),
      "CW_LRT": addMinutes(dep, 18),
      "HLM_LRT": addMinutes(dep, 23),
      "JATIB": addMinutes(dep, 31),
      "CIKUN1": addMinutes(dep, 36),
      "CIKUN2": addMinutes(dep, 39),
      "BEKAS": addMinutes(dep, 44),
      "JATIM": addMinutes(dep, 48)
    }
  });
});

lrtBekasiDeparturesJATIM.forEach((dep, idx) => {
  lrtTrains.push({
    id: `LRT B${202 + idx * 2}`,
    name: "LRT Jabodebek Lin Bekasi",
    line: "LRT",
    destination: "Dukuh Atas",
    schedule: {
      "JATIM": dep,
      "BEKAS": addMinutes(dep, 4),
      "CIKUN2": addMinutes(dep, 9),
      "CIKUN1": addMinutes(dep, 12),
      "JATIB": addMinutes(dep, 17),
      "HLM_LRT": addMinutes(dep, 25),
      "CW_LRT": addMinutes(dep, 30),
      "CILIW": addMinutes(dep, 32),
      "CIKOK": addMinutes(dep, 34),
      "PANCO": addMinutes(dep, 37),
      "KUNIN": addMinutes(dep, 41),
      "RASUN": addMinutes(dep, 43),
      "SETIA": addMinutes(dep, 46),
      "DUKUH": addMinutes(dep, 48)
    }
  });
});

// 8c. LRT Jakarta (KPG <-> MRI_LRT via Velodrome & Manggarai Fase 1B)
const lrtJktDeparturesKPG = [];
for (let h = 5; h <= 22; h++) {
  const mins = (h === 5) ? [30, 45] : [0, 15, 30, 45];
  mins.forEach(m => {
    lrtJktDeparturesKPG.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  });
}

const lrtJktDeparturesMRI = [];
for (let h = 5; h <= 22; h++) {
  const mins = (h === 5) ? [40, 55] : [10, 25, 40, 55];
  mins.forEach(m => {
    lrtJktDeparturesMRI.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  });
}

lrtJktDeparturesKPG.forEach((dep, idx) => {
  lrtTrains.push({
    id: `LRTJ J${301 + idx * 2}`,
    name: "LRT Jakarta",
    line: "LRT",
    destination: "Manggarai",
    schedule: {
      "KPG": dep,
      "BVU": addMinutes(dep, 3),
      "BOULE": addMinutes(dep, 6),
      "PULOM": addMinutes(dep, 8),
      "EQUES": addMinutes(dep, 11),
      "VELOD": addMinutes(dep, 14),
      "RAWAM": addMinutes(dep, 17),
      "PRAMU": addMinutes(dep, 20),
      "MTR_LRT": addMinutes(dep, 23),
      "PROKL": addMinutes(dep, 25),
      "MRI_LRT": addMinutes(dep, 28)
    }
  });
});

lrtJktDeparturesMRI.forEach((dep, idx) => {
  lrtTrains.push({
    id: `LRTJ J${302 + idx * 2}`,
    name: "LRT Jakarta",
    line: "LRT",
    destination: "Pegangsaan Dua",
    schedule: {
      "MRI_LRT": dep,
      "PROKL": addMinutes(dep, 3),
      "MTR_LRT": addMinutes(dep, 5),
      "PRAMU": addMinutes(dep, 8),
      "RAWAM": addMinutes(dep, 11),
      "VELOD": addMinutes(dep, 14),
      "EQUES": addMinutes(dep, 17),
      "PULOM": addMinutes(dep, 20),
      "BOULE": addMinutes(dep, 22),
      "BVU": addMinutes(dep, 25),
      "KPG": addMinutes(dep, 28)
    }
  });
});

// 8d. LRT Sumatera Selatan / Palembang (BDR <-> DJKA)
const lrtSumselDeparturesDJKA = [];
for (let h = 5; h <= 19; h++) {
  const mins = (h === 5) ? [6, 24, 42] : [0, 18, 36, 54];
  mins.forEach(m => {
    lrtSumselDeparturesDJKA.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  });
}
lrtSumselDeparturesDJKA.push("19:01");

const lrtSumselDeparturesBDR = [];
for (let h = 6; h <= 19; h++) {
  const mins = [0, 18, 36, 54];
  mins.forEach(m => {
    lrtSumselDeparturesBDR.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  });
}
lrtSumselDeparturesBDR.push("19:55");

lrtSumselDeparturesDJKA.forEach((dep, idx) => {
  lrtTrains.push({
    id: `LRTS S${401 + idx * 2}`,
    name: "LRT Sumatera Selatan",
    line: "LRT",
    destination: "Bandara SMB II",
    schedule: {
      "DJKA": dep,
      "JAKAB": addMinutes(dep, 4),
      "POLRE": addMinutes(dep, 8),
      "AMPER": addMinutes(dep, 12),
      "CINDE": addMinutes(dep, 16),
      "DISHU": addMinutes(dep, 20),
      "BUMIS": addMinutes(dep, 23),
      "DEMAN": addMinutes(dep, 27),
      "GARUD": addMinutes(dep, 31),
      "RSUD": addMinutes(dep, 35),
      "PUNTI": addMinutes(dep, 38),
      "ASH": addMinutes(dep, 43),
      "BDR": addMinutes(dep, 47)
    }
  });
});

lrtSumselDeparturesBDR.forEach((dep, idx) => {
  lrtTrains.push({
    id: `LRTS S${402 + idx * 2}`,
    name: "LRT Sumatera Selatan",
    line: "LRT",
    destination: "DJKA",
    schedule: {
      "BDR": dep,
      "ASH": addMinutes(dep, 4),
      "PUNTI": addMinutes(dep, 9),
      "RSUD": addMinutes(dep, 12),
      "GARUD": addMinutes(dep, 16),
      "DEMAN": addMinutes(dep, 20),
      "BUMIS": addMinutes(dep, 24),
      "DISHU": addMinutes(dep, 27),
      "CINDE": addMinutes(dep, 31),
      "AMPER": addMinutes(dep, 35),
      "POLRE": addMinutes(dep, 39),
      "JAKAB": addMinutes(dep, 43),
      "DJKA": addMinutes(dep, 47)
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
  ...bandaraTrains,
  ...lrtTrains
];

console.log(`Generated ${allNationalTrains.length} national GAPEKA train trips:`);
console.log(`- Pantura Antarkota: ${panturaTrains.length}`);
console.log(`- Selatan & Tengah Antarkota: ${selatanTrains.length}`);
console.log(`- Parahyangan Antarkota: ${parahyanganTrains.length}`);
console.log(`- Sumatera Antarkota: ${sumateraAntarkotaTrains.length}`);
console.log(`- Lokal (Jawa & Sumatera): ${localTrains.length}`);
console.log(`- Whoosh (KCIC): ${whooshTrains.length}`);
console.log(`- Bandara (Soetta, YIA, Kualanamu, BIM): ${bandaraTrains.length}`);
console.log(`- LRT (Jabodebek, Jakarta, Sumsel): ${lrtTrains.length}`);

// Write to static/data/national-gapeka.json
const outputPath = path.resolve(__dirname, '../static/data/national-gapeka.json');
fs.writeFileSync(outputPath, JSON.stringify(allNationalTrains, null, 2), 'utf-8');
console.log(`Saved to ${outputPath}`);
