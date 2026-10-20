import { json } from '@sveltejs/kit';
import { allTrains, getStationName } from '$lib/server/mockSchedule';
import { liveTrainPings, pruneExpiredPings } from '$lib/server/liveGpsStore';

export const GET = async ({ setHeaders }) => {
	// Cache response at CDN edge for 5 seconds to absorb high-frequency polling from clients
	setHeaders({
		'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10'
	});
    pruneExpiredPings();
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
        // Schedule is an object like { "DP": "04:05" } or { "MR": { "arr": "19:51", "dep": "19:53" } }
        let previousMins = -1;
        const stops = Object.entries(train.schedule).map(([stationId, timeVal]) => {
            let arrTimeStr: string;
            let depTimeStr: string;
            if (typeof timeVal === 'object' && timeVal !== null) {
                arrTimeStr = (timeVal as any).arr || (timeVal as any).dep;
                depTimeStr = (timeVal as any).dep || (timeVal as any).arr;
            } else {
                arrTimeStr = timeVal as string;
                depTimeStr = timeVal as string;
            }

            const [ah, am] = arrTimeStr.split(':').map(Number);
            let arrMins = ah * 60 + am;
            const [dh, dm] = depTimeStr.split(':').map(Number);
            let depMins = dh * 60 + dm;

            if (previousMins !== -1 && arrMins < previousMins - 180) {
                arrMins += 24 * 60;
            }
            if (depMins < arrMins) {
                depMins += 24 * 60;
            }
            previousMins = depMins;

            return {
                stationId,
                arrMinutes: arrMins,
                depMinutes: depMins,
                timeMinutes: depMins,
                arrTimeStr,
                depTimeStr,
                timeStr: depTimeStr !== arrTimeStr ? `${arrTimeStr} - ${depTimeStr}` : depTimeStr
            };
        });

        if (stops.length < 2) continue;

        const startTime = stops[0].depMinutes;
        const endTime = stops[stops.length - 1].arrMinutes;

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
            // Check if train is currently STOPPED at a station (scheduled dwell)
            let isStoppedAtStation = false;
            let stoppedStationIdx = -1;

            for (let i = 0; i < stops.length; i++) {
                if (effectiveCurrentTime >= stops[i].arrMinutes && effectiveCurrentTime <= stops[i].depMinutes) {
                    isStoppedAtStation = true;
                    stoppedStationIdx = i;
                    break;
                }
            }

            const livePing = liveTrainPings.get(train.id);

            if (isStoppedAtStation) {
                const curStn = stops[stoppedStationIdx].stationId;
                const nextStn = stoppedStationIdx < stops.length - 1 ? stops[stoppedStationIdx + 1].stationId : curStn;
                const dwellMinutes = stops[stoppedStationIdx].depMinutes - stops[stoppedStationIdx].arrMinutes;

                activeTrains.push({
                    id: train.id,
                    name: train.name || null,
                    line: train.line,
                    origin: train.origin || getStationName(stops[0].stationId),
                    destination: train.destination,
                    fromStation: curStn,
                    toStation: nextStn,
                    currentStation: curStn,
                    isStopped: true,
                    dwellMinutes,
                    progress: 0,
                    departMinutes: stops[stoppedStationIdx].depMinutes,
                    arrivMinutes: stoppedStationIdx < stops.length - 1 ? stops[stoppedStationIdx + 1].arrMinutes : stops[stoppedStationIdx].depMinutes,
                    isLiveGps: !!livePing,
                    liveLat: livePing ? livePing.lat : null,
                    liveLng: livePing ? livePing.lng : null,
                    speed: livePing ? livePing.speed : 0,
                    heading: livePing ? livePing.heading : null,
                    accuracy: livePing ? livePing.accuracy : null,
                    stops: stops.map((s) => ({
                        code: s.stationId,
                        name: getStationName(s.stationId),
                        time: s.timeStr as string,
                        arrTime: s.arrTimeStr,
                        depTime: s.depTimeStr
                    }))
                });
            } else {
                // Find the segment it's currently moving on
                for (let i = 0; i < stops.length - 1; i++) {
                    const segDep = stops[i].depMinutes;
                    const segArr = stops[i + 1].arrMinutes;
                    if (effectiveCurrentTime >= segDep && effectiveCurrentTime <= segArr) {
                        const fromStation = stops[i].stationId;
                        const toStation = stops[i + 1].stationId;
                        const segmentDuration = segArr - segDep;
                        let progress = 0;
                        if (segmentDuration > 0) {
                            progress = (effectiveCurrentTime - segDep) / segmentDuration;
                        } else {
                            progress = 1;
                        }

                        activeTrains.push({
                            id: train.id,
                            name: train.name || null,
                            line: train.line,
                            origin: train.origin || getStationName(stops[0].stationId),
                            destination: train.destination,
                            fromStation,
                            toStation,
                            currentStation: null,
                            isStopped: false,
                            dwellMinutes: 0,
                            progress,
                            departMinutes: segDep,
                            arrivMinutes: segArr,
                            isLiveGps: !!livePing,
                            liveLat: livePing ? livePing.lat : null,
                            liveLng: livePing ? livePing.lng : null,
                            speed: livePing ? livePing.speed : null,
                            heading: livePing ? livePing.heading : null,
                            accuracy: livePing ? livePing.accuracy : null,
                            stops: stops.map((s) => ({
                                code: s.stationId,
                                name: getStationName(s.stationId),
                                time: s.timeStr as string,
                                arrTime: s.arrTimeStr,
                                depTime: s.depTimeStr
                            }))
                        });
                        break;
                    }
                }
            }
        }
    }

    return json({
        status: 'success',
        serverTimeMinutes: currentTotalMinutes,
        data: activeTrains
    });
};
