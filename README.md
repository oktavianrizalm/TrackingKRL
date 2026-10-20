<p align="center">
  <img src="static/logo.png" alt="Logo TrackRL" width="100" />
</p>

<h1 align="center">🚄 TrackRL • Live Train Radar Indonesia</h1>

<p align="center">
  <strong>Platform pelacak radar posisi dan jadwal kereta api terpadu se-Indonesia berbasis web secara real-time dengan citra satelit resolusi tinggi, integrasi rel fisik OpenRailwayMap, dan pelaporan Live GPS penumpang.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Svelte_5-FF3E00?style=for-the-badge&logo=svelte&logoColor=white" alt="Svelte 5" />
  <img src="https://img.shields.io/badge/SvelteKit_2-FF3E00?style=for-the-badge&logo=svelte&logoColor=white" alt="SvelteKit" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Leaflet-199900?style=for-the-badge&logo=leaflet&logoColor=white" alt="Leaflet" />
  <img src="https://img.shields.io/badge/ESRI_Satellite-007AC2?style=for-the-badge&logo=arcgis&logoColor=white" alt="ESRI Satellite" />
  <img src="https://img.shields.io/badge/OpenRailwayMap-FF6600?style=for-the-badge" alt="OpenRailwayMap" />
  <img src="https://img.shields.io/badge/Vite_8-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
</p>

<p align="center">
  <a href="#-cakupan-layanan-kereta">Cakupan Layanan</a> •
  <a href="#-fitur-utama">Fitur Utama</a> •
  <a href="#-animasi-berhenti-dwell-stop--fisika-gapeka-2025">Dwell Stop GAPEKA</a> •
  <a href="#-arsitektur-kinerja-tinggi-o1-lookup">Arsitektur Kinerja</a> •
  <a href="#-panduan-penggunaan">Panduan Penggunaan</a> •
  <a href="#-teknologi-yang-digunakan">Teknologi</a> •
  <a href="#-cara-instalasi--menjalankan">Instalasi</a> •
  <a href="#-struktur-proyek">Struktur Proyek</a>
</p>

---

## 🚆 Cakupan Layanan Kereta

TrackRL mendukung integrasi jadwal dan pelacakan seluruh armada perkeretaapian di Pulau Jawa dan Sumatera:

| Kategori | Armada & Koridor |
| :--- | :--- |
| **Kereta Antarkota (KAI)** | Seluruh KA Eksekutif, Bisnis, dan Ekonomi lintas Jawa & Sumatera (Argo Bromo Anggrek, Argo Lawu, Argo Dwipangga, Taksaka, Gajayana, Bima, Argo Muria, Kertajaya, Lodaya, Turangga, Malabar, Sancaka, Sri Tanjung, Blambangan Ekspres, Papandayan & Cikuray lintas Garut, Purwojaya & Wijayakusuma lintas Cilacap, dll.) |
| **Kereta Cepat (Whoosh)** | KCIC Kereta Cepat Jakarta – Bandung (Halim – Karawang – Padalarang – Tegalluar) |
| **Kereta Komuter & Lokal** | KRL Commuter Line Jabodetabek (termasuk percabangan Nambo), Commuter Line Merak, Commuter Line Garut, Commuter Line Yogyakarta–Solo, KA Lokal Bandung Raya, Commuter Line Dhoho/Penataran, Prameks, dll. |
| **MRT Jakarta** | MRT Lin Utara–Selatan (Lebak Bulus Grab – Bundaran HI Bank Jakarta) |
| **LRT (Light Rail Transit)** | LRT Jabodebek (Lin Cibubur & Lin Bekasi), LRT Jakarta (Pegangsaan Dua – Velodrome – Manggarai Fase 1B), dan LRT Sumatera Selatan (Palembang SMB II – DJKA) |
| **Kereta Bandara** | KA Bandara Soekarno-Hatta (BST), KA Bandara Internasional Yogyakarta (YIA), KA Bandara Kualanamu (KNM), dan KA Bandara Minangkabau (BIM) |
| **Kereta Api Sumatera** | Jalur Divre I Sumatera Utara & Aceh, Divre II Sumatera Barat, Divre III Palembang, dan Divre IV Tanjungkarang |

---

## ✨ Fitur Utama

- **🛰️ Default Basemap ESRI World Imagery**:
  Secara bawaan menampilkan citra satelit resolusi tinggi dari ESRI untuk visualisasi topografi daratan, gunung, pantai, dan jaringan rel yang realistis.
- **🛤️ Overlay Rel Fisik Resmi OpenRailwayMap**:
  Garis rel presisi berwarna oranye dari OpenRailwayMap di-*render* di atas basemap, mencerminkan rel ganda (*double track*), sepur belok, emplasemen stasiun, hingga jalur layang.
- **🎯 100% Track-Snapped Animation (Master Rail Spines)**:
  Kereta ekspres yang melompati puluhan stasiun kecil tidak lagi memotong garis lurus melewati laut atau gunung, melainkan otomatis mengikuti tulang punggung koridor rel resmi (*Master Rail Spines*) dengan toleransi deviasi kurang dari 15 meter.
- **🛑 Animasi Berhenti Stasiun Realistis (*GAPEKA 2025 Dwell Stops*)**:
  Mengadopsi jadwal resmi kedatangan dan keberangkatan GAPEKA 2025 (*KP-DJKA 224 TAHUN 2024*). Ketika kereta terjadwal berhenti di sebuah stasiun (misalnya 2 menit di Mojokerto atau 5 menit di Madiun), animasi kereta otomatis berhenti tepat di emplasemen stasiun dengan kecepatan `0 km/jam`, memancarkan cincin animasi berkedip amber (*pulsing glow*), menampilkan badge **`BERHENTI`**, serta durasi waktu singgah sebelum melanjutkan perjalanan.
- **⚡ Zero-Freeze High Performance Engine ($O(1)$ Lookups)**:
  Kalkulasi koordinat untuk 1.175 pasangan rute stasiun di seluruh Indonesia telah di-pramenghitung secara *offline*. Beban CPU saat membuka webapp turun drastis dari **34,5 detik menjadi 0,105 ms (280.000x lebih cepat)** tanpa membuat browser *stuck* di kotak abu-abu.
- **📡 Crowdsourced Live GPS Sharing**:
  Penumpang yang sedang berada di dalam kereta dapat membagikan posisi GPS perangkat secara *real-time*. Kereta yang memiliki sinyal aktif akan menampilkan lencana hijau berkedip **`📡 LIVE GPS`**.
- **🔍 Filter Kategori Cerdas**:
  Dukungan tombol filter instan untuk menyortir kereta aktif berdasarkan kategori: *Semua*, *KRL*, *MRT*, *Antarkota*, *Lokal*, *Whoosh*, atau *Bandara*.
- **⏱️ Live Countdown & Status Keberangkatan**:
  Hitungan mundur waktu nyata (*minutes & seconds countdown*) menuju stasiun pilihan, lengkap dengan status *Tiba*, *Segera*, atau *Berangkat*.
- **🧭 Auto-Detect Stasiun Terdekat**:
  Sensor *Browser Geolocation API* secara otomatis memposisikan peta ke stasiun kereta terdekat dari posisi pengguna saat membuka webapp.
- **🖥️ Antarmuka Layar Penuh Modern (Responsive Drawer)**:
  Desain *edge-to-edge* dengan *drawer* fleksibel yang dapat dibuka/tutup, mendukung mode gelap (*Dark Mode*) dan terang (*Light Mode*) serta pilihan basemap (ESRI Satelit, Carto Dark, Carto Light).

---

## 🛑 Animasi Berhenti (Dwell Stop) & Fisika GAPEKA 2025

TrackRL menghadirkan simulasi pergerakan kereta realistis yang disinkronkan langsung dengan jadwal resmi **GAPEKA 2025 (Keputusan Direktur Jenderal Perkeretaapian No. KP-DJKA 224 TAHUN 2024)**.

### 1. Sinkronisasi Waktu Kedatangan & Keberangkatan
Kereta api tidak hanya sekadar bergerak melintasi garis jalur, melainkan mematuhi waktu singgah (*dwell time*) resmi di setiap stasiun pemberhentian perantara:
- **257 Nomor Perjalanan KA Antarkota di Jawa** telah diekstrak secara presisi dari dokumen resmi GAPEKA 2025 (mencakup **2.682 titik singgah perantara**).
- Format data membedakan waktu tiba (`arr`) dan waktu berangkat (`dep`), contohnya:
  - **KA 7 (Bima)**: Stasiun Mojokerto datang `19:51`, berangkat `19:53` (*dwell* 2 menit); Stasiun Jombang datang `20:10`, berangkat `20:12` (*dwell* 2 menit); Stasiun Madiun datang `21:16`, berangkat `21:21` (*dwell* 5 menit).
  - **KA 1 (Argo Bromo Anggrek)**: Stasiun Cirebon datang `22:42`, berangkat `22:47` (*dwell* 5 menit); Stasiun Semarang Tawang datang `00:32`, berangkat `00:37` (*dwell* 5 menit).

### 2. State Machine Animasi Berhenti (*Dwell State*)
Ketika waktu server/klien berada dalam jendela singgah stasiun $[A_i, D_i]$:
1. **Koordinat Stasioner**: Posisi marker kereta dikunci tepat pada titik koordinat platform/emplasemen stasiun terkait (`lat`, `lng`).
2. **Indikator Kecepatan $0\text{ km/jam}$**: Status otomatis berubah menjadi `stopped` dengan kecepatan nol.
3. **Visual Marker Interaktif**:
   - Ikon lokomotif berubah menjadi ikon jeda `⏸️`.
   - Menampilkan cincin animasi berkedip amber (*pulsing glow ring*).
   - Badge status menampilkan **`BERHENTI`** dengan durasi menit singgah pada kartu dan popup informasi (contoh: *Berhenti di Mojokerto (2 menit)*).
   - Pada popup rute stasiun, baris stasiun yang sedang disinggahi disorot dengan latar amber dan lencana aktif.

### 3. Model Fisika Akselerasi & Deselerasi Sinusoidal
Saat jam keberangkatan tiba ($t \ge D_i$):
- Kereta tidak melompat secara kaku, melainkan menggunakan kurva akselerasi sinusoidal halus:
  $$\text{curveFactor} = \sin\left(\frac{\text{progress}}{0.15} \times \frac{\pi}{2}\right) \quad (0 \le \text{progress} < 0.15)$$
- Di tengah perjalanan ($0.15 \le \text{progress} \le 0.85$), kereta melaju pada kecepatan jelajah operasional (hingga 120 km/jam untuk KA Antarkota, 350 km/jam untuk Whoosh).
- Menjelang stasiun tujuan berikutnya ($\text{progress} > 0.85$), kecepatan menurun secara deselerasi sinusoidal halus hingga berhenti sempurna saat memasuki stasiun.

---

## ⚙️ Arsitektur Kinerja Tinggi ($O(1)$ Lookup)

### Masalah Komputasi Konvensional vs Solusi TrackRL

```
[SEBELUMNYA - Runtime Turf Snapping]
128 Kereta Aktif x 8 Titik Sampling = >1.000 Pemanggilan Turf sinkron
--> Setiap pemanggilan memindai 7.115 garis rel mentah (GeoJSON 1,6 MB)
--> 1.000 x 34,5 ms = 34,5 DETIK CPU TERKUNCI 100% (Browser stuck, tile abu-abu)

[SEKARANG - Precalculated Track Paths & Master Rail Spines]
1.175 Rute Pasangan Stasiun di-pramenghitung secara offline ke precalculated-track-paths.json (1,1 MB)
--> Browser klien hanya melakukan $O(1)$ Dictionary Lookup dalam 0,0001 ms!
--> Total waktu pemrosesan seluruh armada: 0,105 ms (280.000x lebih cepat)
--> Browser thread 100% bebas, Leaflet tile satelit & animasi 60 FPS berjalan instan!
```

### Master Rail Spines System

Untuk mencegah kereta ekspres (misalnya KA Argo Muria rute Tegal–Cirebon sejauh 67 km, atau KA Pangandaran Tasikmalaya–Bandung sejauh 85 km) memotong garis lurus melintasi teluk laut atau pegunungan terjal:
1. Sistem memetakan **29 Master Rail Spines** yang menghubungkan seluruh stasiun perantara berturutan (Lintas Pantura, Lintas Selatan, Percabangan Garut, Percabangan Cilacap, Nambo, Merak, Whoosh, 3 sistem LRT, MRT Jakarta, dan 4 Divre Sumatera).
2. Setiap segmen stasiun yang berdekatan ($\le 10\text{--}15\text{ km}$) diinterpolasi dan di-*snap* ke koordinat rel fisik OpenRailwayMap.
3. Seluruh rute di Pulau Jawa dan Sumatera memiliki tingkat presisi deviasi **$\le 15\text{ meter}$** tepat di atas rel fisik.

---

## 📖 Panduan Penggunaan

### 1. Navigasi & Pencarian Stasiun
1. Klik pada kolom pencarian di bagian kiri atas.
2. Ketik nama stasiun (contoh: `Gambir`, `Cirebon`, `Yogyakarta`, `Surabaya Gubeng`, `Manggarai`) atau kode stasiun (contoh: `GMR`, `CN`, `YK`, `SGU`, `MRI`).
3. Pilih stasiun dari daftar dropdown untuk memuat jadwal keberangkatan dan mengarahkan kamera peta ke stasiun tersebut.

### 2. Memantau Kereta Aktif di Peta
1. Buka tab **Kereta Aktif** pada *drawer* bawah/samping untuk melihat daftar seluruh kereta yang saat ini sedang meluncur di jalur.
2. Klik tombol **"Lacak Kereta"** atau klik langsung pada ikon kereta di peta untuk membuka jendela informasi detail (*popup*) dan mengikuti laju pergerakannya.

### 3. Mengganti Lapisan Peta (*Basemap*)
1. Klik tombol ikon lapisan (🗺️) di pojok kiri atas.
2. Pilih basemap yang diinginkan:
   - **🛰️ ESRI Satelit (Default)**: Citra satelit fotorealistik dunia nyata.
   - **🌑 Carto Dark**: Tema gelap kontras tinggi, ideal untuk malam hari.
   - **☀️ Carto Light**: Tema terang minimalis.
3. Anda juga dapat menyalakan/mematikan **Overlay Rel Kereta** oranye dari tombol toggle yang disediakan.

### 4. Berbagi Live GPS (*Crowdsourcing*)
1. Jika Anda sedang berada di dalam kereta api, klik tombol **"Bagi GPS"** di menu atas.
2. Pilih kereta api yang sedang Anda tumpangi dari daftar kereta aktif.
3. Izinkan browser mengakses sensor GPS berakurasi tinggi (*High Accuracy Geolocation*).
4. Posisi kereta api Anda akan otomatis terverifikasi dan memancarkan lencana **`📡 LIVE GPS`** kepada seluruh pengguna webapp lainnya.

---

## 🛠️ Teknologi yang Digunakan

| Kategori | Teknologi | Deskripsi |
| :--- | :--- | :--- |
| **Frontend Framework** | [Svelte 5](https://svelte.dev/) | Reaktivitas mutakhir berbasis Svelte Runes (`$state`, `$derived`, `$effect`). |
| **Meta-Framework** | [SvelteKit 2](https://kit.svelte.dev/) | SSR performa tinggi, endpoint API server, dan routing modern. |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) | Desain antarmuka responsif dan modern. |
| **Peta Interaktif** | [Leaflet](https://leafletjs.com/) | Engine peta interaktif dengan GPU Canvas Renderer (`preferCanvas: true`). |
| **Citra Satelit** | [ESRI World Imagery](https://server.arcgisonline.com/) | Basemap citra satelit global resolusi tinggi tanpa batas watermark. |
| **Geometri Rel Fisik** | [OpenRailwayMap](https://openrailwaymap.org/) | Data rel resmi dunia nyata bersumber dari OpenStreetMap. |
| **Geospatial Engine** | [Turf.js](https://turfjs.org/) | Mesin kalkulasi spasial offline untuk precalculating jalur rel. |
| **Runtime & Build** | [Vite 8](https://vite.dev/) & [Node.js](https://nodejs.org/) | Pembangunan aset secepat kilat dengan HMR. |

---

## 🚀 Cara Instalasi & Menjalankan

### Prasyarat
- [Node.js](https://nodejs.org/) (versi 18.x atau yang lebih baru)
- Package manager `npm`, `pnpm`, atau `yarn`

### 1. Clone Repositori
```bash
git clone https://github.com/oktavianrizalm/TrackingKRL.git
cd TrackingKRL
```

### 2. Instal Dependensi
```bash
npm install
```

### 3. Generate Precalculated Track Paths (Jika Diperlukan)
Untuk mempramenghitung rute rel fisik terbaru:
```bash
node scripts/generate_track_paths.cjs
```
*Output file akan otomatis diperbarui di `static/data/precalculated-track-paths.json` dalam waktu ~30 detik (1.175 rute).*

### 4. Jalankan Server Pengembangan (Dev)
```bash
npm run dev
```
Buka browser dan akses alamat:
```
http://localhost:5173
```

### 5. Build untuk Lingkungan Produksi
```bash
npm run build
npm run preview
```

---

## 📂 Struktur Proyek

```text
TrackingKRL/
├── docs/                         # Screenshot dan dokumentasi visual
├── scripts/
│   └── generate_track_paths.cjs  # Generator offline snapping rute & Master Rail Spines
├── src/
│   ├── lib/
│   │   ├── mapData.ts            # Koordinat stasiun inti KRL, MRT, dan ID mapping
│   │   └── server/
│   │       ├── liveGpsStore.ts   # In-memory store untuk sinyal Live GPS penumpang
│   │       └── mockSchedule.ts   # Agregator jadwal KRL, MRT, dan GAPEKA Nasional
│   └── routes/
│       ├── api/
│       │   ├── active-trains/    # API: Posisi kereta aktif & status perjalanan
│       │   ├── gps/              # API: Endpoint terima & kirim sinyal Live GPS
│       │   ├── stations/         # API: Database seluruh stasiun se-Indonesia
│       │   └── trains/           # API: Jadwal kereta per stasiun
│       ├── +layout.svelte        # Shell layout utama
│       └── +page.svelte          # Layar peta penuh (Leaflet, ESRI, Drawer, Markers)
├── static/
│   ├── data/
│   │   ├── all-national-stations.json       # Database stasiun Jawa & Sumatera
│   │   ├── indonesia-railway.geojson        # Geometri rel fisik OpenRailwayMap
│   │   ├── national-gapeka.json             # Jadwal GAPEKA terbaru KAI se-Indonesia
│   │   └── precalculated-track-paths.json   # 1.175 rute track-snapped siap pakai (O(1)) (1,1 MB)
│   ├── krl-routes.geojson                   # Geometri jalur KRL & MRT Jakarta
│   ├── mrt-schedule.json                    # Jadwal MRT Jakarta
│   └── schedule.json                        # Jadwal Commuter Line Jabodetabek
├── package.json
└── vite.config.ts
```

> [!NOTE]
> Berkas sumber jadwal resmi GAPEKA (KP-DJKA 224–227 TAHUN 2024 dan KP-DJKA 2 TAHUN 2025) disimpan secara lokal dan dilindungi di `.gitignore` untuk menjaga efisiensi repositori Git.

---

## 📄 Lisensi & Kredit

- **Pengembang**: Dirancang dan dikembangkan oleh **MRO - 2026**.
- **Sumber Data Rel**: &copy; [OpenRailwayMap](https://www.openrailwaymap.org/) contributors & [OpenStreetMap](https://www.openstreetmap.org/copyright).
- **Peta Satelit**: &copy; [ESRI](https://www.esri.com/) World Imagery, Maxar, Earthstar Geographics.
- **Data Jadwal**: GAPEKA Resmi PT Kereta Api Indonesia (Persero) berdasarkan Keputusan Direktur Jenderal Perkeretaapian (KP-DJKA 224 TAHUN 2024 untuk Jawa, KP-DJKA 225-227 TAHUN 2024 untuk Sumatera, dan KP-DJKA 2 TAHUN 2025 untuk KCIC Whoosh), KAI Commuter, dan PT MRT Jakarta.
