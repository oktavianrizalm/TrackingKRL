import { json } from '@sveltejs/kit';
import { allTrains } from '$lib/server/mockSchedule';

export const GET = async ({ setHeaders }) => {
	// Cache response at CDN edge for 5 seconds to absorb high-frequency polling from clients
	setHeaders({
		'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10'
	});
    const nowRaw = new Date();
    const now = new Date(nowRaw.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    // Use local Jakarta time if possible, or assume server time is correct
    // For robust logic, let's just use current hour/minute
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentSecond = now.getSeconds();
    
    // Time in minutes (float)
    const currentTotalMinutes = currentHour * 60 + currentMinute + (currentSecond / 60);

    const activeTrains = [];

    for (const train of allTrains) {
        // Schedule is an object like { "DP": "04:05", "DPB": "04:09", ... }
        // Keys preserve insertion order. We can anchor the times based on previous stops.
        let previousMins = -1;
        const stops = Object.entries(train.schedule).map(([stationId, timeStr]) => {
            const [h, m] = (timeStr as string).split(':').map(Number);
            let mins = h * 60 + m;
            
            // If time drops significantly (e.g. 23:55 -> 00:05), it crossed midnight
            if (previousMins !== -1 && mins < previousMins - 180) {
                mins += 24 * 60;
            }
            previousMins = mins;
            
            return { stationId, timeMinutes: mins, timeStr };
        });

        if (stops.length < 2) continue;

        const startTime = stops[0].timeMinutes;
        const endTime = stops[stops.length - 1].timeMinutes;

        // Check if train is currently active
        // It could be active today, or it could be a cross-midnight train running past 24:00
        let effectiveCurrentTime = currentTotalMinutes;
        
        // If current time is 00:30 (30 mins) but train is 23:00-01:00 (1380-1500)
        if (currentTotalMinutes < 180 && endTime >= 1440) {
            if (currentTotalMinutes + 1440 >= startTime && currentTotalMinutes + 1440 <= endTime) {
                effectiveCurrentTime += 1440;
            }
        }

        if (effectiveCurrentTime >= startTime && effectiveCurrentTime <= endTime) {
            // Find the segment it's currently on
            let fromStation = null;
            let toStation = null;
            let progress = 0;

            for (let i = 0; i < stops.length - 1; i++) {
                if (effectiveCurrentTime >= stops[i].timeMinutes && effectiveCurrentTime <= stops[i+1].timeMinutes) {
                    fromStation = stops[i].stationId;
                    toStation = stops[i+1].stationId;
                    
                    const segmentDuration = stops[i+1].timeMinutes - stops[i].timeMinutes;
                    if (segmentDuration > 0) {
                        progress = (effectiveCurrentTime - stops[i].timeMinutes) / segmentDuration;
                    } else {
                        progress = 1;
                    }
                    break;
                }
            }

            if (fromStation && toStation) {
                activeTrains.push({
                    id: train.id,
                    line: train.line,
                    destination: train.destination,
                    fromStation,
                    toStation,
                    progress
                });
            }
        }
    }

    return json({
        status: 'success',
        data: activeTrains
    });
};
