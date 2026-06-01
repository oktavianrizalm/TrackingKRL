import { json } from '@sveltejs/kit';
import { allTrains } from '$lib/server/mockSchedule';

export const GET = async () => {
    const now = new Date();
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
        // Let's sort the schedule by time to find the path
        const stops = Object.entries(train.schedule).map(([stationId, timeStr]) => {
            const [h, m] = (timeStr as string).split(':').map(Number);
            let mins = h * 60 + m;
            // Handle cross-midnight trains (e.g. starts at 23:30, ends at 01:00)
            if (mins < 180 && currentTotalMinutes > 1200) {
                // Current time is late night, train time is next morning
                mins += 24 * 60; 
            } else if (mins > 1200 && currentTotalMinutes < 180) {
                // Current time is early morning, train time is previous night
                mins -= 24 * 60;
            }
            return { stationId, timeMinutes: mins, timeStr };
        });

        // Sort chronologically
        stops.sort((a, b) => a.timeMinutes - b.timeMinutes);

        if (stops.length < 2) continue;

        const startTime = stops[0].timeMinutes;
        const endTime = stops[stops.length - 1].timeMinutes;

        // Check if train is currently active
        if (currentTotalMinutes >= startTime && currentTotalMinutes <= endTime) {
            // Find the segment it's currently on
            let fromStation = null;
            let toStation = null;
            let progress = 0;

            for (let i = 0; i < stops.length - 1; i++) {
                if (currentTotalMinutes >= stops[i].timeMinutes && currentTotalMinutes <= stops[i+1].timeMinutes) {
                    fromStation = stops[i].stationId;
                    toStation = stops[i+1].stationId;
                    
                    const segmentDuration = stops[i+1].timeMinutes - stops[i].timeMinutes;
                    if (segmentDuration > 0) {
                        progress = (currentTotalMinutes - stops[i].timeMinutes) / segmentDuration;
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
