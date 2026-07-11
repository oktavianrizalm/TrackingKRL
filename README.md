# 🚇 Jakarta KRL - MRT Commuter Tracking Webapp

A modern, responsive, and performant real-time commuter tracking web application for Jakarta KRL Commuter Line and MRT Jakarta. It visualizes train routes, displays upcoming arrivals with down-to-the-second countdowns, and displays simulated real-time train positions on an interactive map.

---

## ✨ Features

- **📍 Real-Time Active Train Mapping**: Automatically calculates and interpolates train positions along their active routes based on current timetables.
- **🛣️ Geospatial Snap-to-Track**: Snaps interpolated train coordinates to actual track geometries from GeoJSON route lines using Turf.js (`nearestPointOnLine`) for realistic map rendering.
- **⏳ Live Arrival Countdown**: Dynamically displays upcoming train schedules for any selected station, complete with active status updates and down-to-the-second countdowns.
- **🖥️ Responsive Desktop Dashboard**: Automatically adapts to screen sizes. Offers a spacious, side-by-side dashboard layout for desktop monitors and a clean, single-column interface for mobile devices.
- **🗺️ Interactive Map Mode**: Full-screen vector map view powered by Leaflet, displaying station markers, color-coded lines, and moving train indicators.
- **🌓 Native Dark Mode Toggle**: Built-in toggle to switch between a clean light theme and a sleek dark theme, dynamically adjusting map tiles (CartoDB Light/Dark) to match.
- **⚡ Performance Optimized**: Utilizes Svelte 5 Runes for reactive data bindings and applies Edge CDN cache-control headers on server endpoints to absorb high-frequency client polling.

---

## 🛠️ Tech Stack

- **Framework**: [Svelte 5](https://svelte.dev/) (using SvelteKit 2 & Runes)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Mapping & Geospatial**: [Leaflet](https://leafletjs.com/), [Turf.js](https://turfjs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Scraper**: [Puppeteer](https://pptr.dev/) (for crawling official MRT Jakarta schedules)
- **Bundler/Dev Server**: [Vite 8](https://vite.dev/)

---

## 📂 Project Structure

```text
├── src/
│   ├── lib/
│   │   ├── assets/         # Static visual assets
│   │   ├── mapData.ts      # Coordinate definitions, route colors, name mappings
│   │   └── server/
│   │       └── mockSchedule.ts # Schedule parsing and KRL/MRT train builders
│   ├── routes/
│   │   ├── api/
│   │   │   ├── active-trains/  # API: Calculates coordinates of currently active trains
│   │   │   ├── stations/       # API: Returns list of KRL & MRT stations
│   │   │   └── trains/         # API: Returns upcoming trains for a specific station
│   │   ├── +layout.svelte      # Root layout
│   │   └── +page.svelte        # Main application dashboard (Jadwal & Peta Jalur)
├── static/
│   ├── krl-routes.geojson  # GeoJSON path data for KRL & MRT tracks
│   ├── schedule.json       # Scraped KRL train timetable database
│   ├── mrt-schedule.json   # Scraped MRT Jakarta timetable database
│   └── all-stations.json   # Comprehensive index of station coordinates
└── scrape-mrt.cjs          # Scraper script for MRT Jakarta live schedule
```

---

## 🚀 Getting Started

### 📋 Prerequisites

Ensure you have [Node.js](https://nodejs.org/) installed (version 18+ recommended).

### 🔧 Installation

1. Clone this repository to your local machine.
2. Install the dependencies:
   ```bash
   npm install
   ```

### 💻 Development

Start the local development server:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser to view the application.

### 🏗️ Building for Production

Compile the SvelteKit project into optimized static/standalone assets:
```bash
npm run build
```
Preview the production build:
```bash
npm run preview
```

### 🕷️ Scraping MRT Jakarta Schedule

To re-scrape and update the MRT Jakarta schedule data directly from the official website:
```bash
node scrape-mrt.cjs
```
This script runs a headless browser using Puppeteer, gathers schedules for all stations, and updates `static/mrt-schedule.json` and `static/mrt-stations.json`.

---

## ⚙️ How the Live Tracking Works

1. **Schedule Ingestion**: The app loads static KRL schedule databases (based on GAPEKA timetables) and MRT schedule databases.
2. **Current Itinerary Check**: The backend API checks the current time in the `Asia/Jakarta` timezone and filters out trains that are currently running between their departure and destination stations.
3. **Interpolation & Snapping**: 
   - Based on the train's current progress between stops, the app computes a straight-line position.
   - Turf.js snaps this interpolated coordinate to the nearest coordinate on the actual vector track lines drawn from `krl-routes.geojson`.
4. **Leaflet Update**: The frontend receives the snapped train positions every 5 seconds and smoothly updates the map markers.

---

## 📄 License

This project is built for Jakarta Commuter Line & MRT Jakarta tracking optimization. Data scraped is based on schedules released as of May 2026.
Designed by **MRO - 2026**.
