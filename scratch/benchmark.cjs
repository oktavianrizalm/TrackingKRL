const { performance } = require('perf_hooks');

// Attempt to load the data
async function runBenchmark() {
    console.log("Starting backend performance benchmark...");
    
    // We will dynamically import the server endpoint logic
    // Since it's SvelteKit, we can't directly run +server.ts easily without compiling,
    // so let's import the raw data and simulate the exact logic.
    
    // 1. Data Loading Benchmark
    const t0 = performance.now();
    const { allTrains } = await import('../src/lib/server/mockSchedule.ts');
    const t1 = performance.now();
    console.log(`[Data Loading] Time to load allTrains (${allTrains.length} total trains): ${(t1 - t0).toFixed(2)} ms`);
    
    // 2. Active Trains Calculation Benchmark (What /api/active-trains does every 5 seconds)
    const t2 = performance.now();
    let activeTrains = [];
    const now = new Date();
    const currentTotalMinutes = now.getHours() * 60 + now.getMinutes() + (now.getSeconds() / 60);

    for (const train of allTrains) {
        const stops = Object.entries(train.schedule).map(([stationId, timeStr]) => {
            const [h, m] = timeStr.split(':').map(Number);
            let mins = h * 60 + m;
            if (mins < 180 && currentTotalMinutes > 1200) mins += 24 * 60; 
            else if (mins > 1200 && currentTotalMinutes < 180) mins -= 24 * 60;
            return { stationId, timeMinutes: mins };
        });

        stops.sort((a, b) => a.timeMinutes - b.timeMinutes);

        if (stops.length < 2) continue;
        const startTime = stops[0].timeMinutes;
        const endTime = stops[stops.length - 1].timeMinutes;

        if (currentTotalMinutes >= startTime && currentTotalMinutes <= endTime) {
            let fromStation, toStation, progress;
            for (let i = 0; i < stops.length - 1; i++) {
                if (currentTotalMinutes >= stops[i].timeMinutes && currentTotalMinutes <= stops[i+1].timeMinutes) {
                    fromStation = stops[i].stationId;
                    toStation = stops[i+1].stationId;
                    const duration = stops[i+1].timeMinutes - stops[i].timeMinutes;
                    progress = duration > 0 ? (currentTotalMinutes - stops[i].timeMinutes) / duration : 1;
                    break;
                }
            }
            if (fromStation && toStation) {
                activeTrains.push({ id: train.id });
            }
        }
    }
    const t3 = performance.now();
    console.log(`[Active Trains Calculation] Time to calculate ${activeTrains.length} active trains from ${allTrains.length} database: ${(t3 - t2).toFixed(2)} ms`);
    
    // 3. Station Schedule Calculation Benchmark (What /api/trains does)
    const t4 = performance.now();
    const stationId = 'BHI';
    const mockTrains = [];
    for (const train of allTrains) {
        if (train.schedule[stationId]) {
            // Simplified check
            mockTrains.push(train.id);
        }
    }
    const t5 = performance.now();
    console.log(`[Station Query Calculation] Time to query all upcoming trains for a single station: ${(t5 - t4).toFixed(2)} ms`);
}

runBenchmark().catch(console.error);
