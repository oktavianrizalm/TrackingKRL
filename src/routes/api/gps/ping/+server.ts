import { json } from '@sveltejs/kit';
import { liveTrainPings, pruneExpiredPings, type LiveGpsPing } from '$lib/server/liveGpsStore';
import { allTrains } from '$lib/server/mockSchedule';
import { stationCoordinates } from '$lib/mapData';

export const POST = async ({ request }) => {
	try {
		const body = await request.json();
		const { lat, lng, speed, heading, accuracy, trainId } = body;

		if (typeof lat !== 'number' || typeof lng !== 'number') {
			return json({ status: 'error', message: 'Invalid coordinates' }, { status: 400 });
		}

		pruneExpiredPings();

		let matchedTrainId = trainId || null;

		// If no trainId specified by user, find closest active train in network
		if (!matchedTrainId) {
			const nowRaw = new Date();
			const now = new Date(nowRaw.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
			const currentTotalMinutes = now.getHours() * 60 + now.getMinutes() + (now.getSeconds() / 60);

			let closestTrainId: string | null = null;
			let minDistance = 3000; // max 3 km search radius for train inside corridor

			for (const train of allTrains) {
				let previousMins = -1;
				const stops = Object.entries(train.schedule).map(([stationId, timeStr]) => {
					const [h, m] = (timeStr as string).split(':').map(Number);
					let mins = h * 60 + m;
					if (previousMins !== -1 && mins < previousMins - 180) mins += 24 * 60;
					previousMins = mins;
					return { stationId, timeMinutes: mins };
				});

				if (stops.length < 2) continue;

				const startTime = stops[0].timeMinutes;
				const endTime = stops[stops.length - 1].timeMinutes;
				let effectiveCurrentTime = currentTotalMinutes;
				if (currentTotalMinutes < 180 && endTime >= 1440) {
					if (currentTotalMinutes + 1440 >= startTime && currentTotalMinutes + 1440 <= endTime) {
						effectiveCurrentTime += 1440;
					}
				}

				if (effectiveCurrentTime >= startTime && effectiveCurrentTime <= endTime) {
					for (let i = 0; i < stops.length - 1; i++) {
						if (effectiveCurrentTime >= stops[i].timeMinutes && effectiveCurrentTime <= stops[i+1].timeMinutes) {
							const fromCoord = stationCoordinates[stops[i].stationId];
							const toCoord = stationCoordinates[stops[i+1].stationId];
							if (fromCoord && toCoord) {
								const duration = stops[i+1].timeMinutes - stops[i].timeMinutes;
								const progress = duration > 0 ? (effectiveCurrentTime - stops[i].timeMinutes) / duration : 0;
								const estLat = fromCoord[0] + (toCoord[0] - fromCoord[0]) * progress;
								const estLng = fromCoord[1] + (toCoord[1] - fromCoord[1]) * progress;

								// Distance in meters
								const dx = (lng - estLng) * 110350;
								const dy = (lat - estLat) * 111000;
								const dist = Math.sqrt(dx * dx + dy * dy);

								if (dist < minDistance) {
									minDistance = dist;
									closestTrainId = train.id;
								}
							}
							break;
						}
					}
				}
			}

			if (closestTrainId) {
				matchedTrainId = closestTrainId;
			}
		}

		if (matchedTrainId) {
			const ping: LiveGpsPing = {
				lat,
				lng,
				speed: typeof speed === 'number' ? Math.round(speed) : null,
				heading: typeof heading === 'number' ? Math.round(heading) : null,
				accuracy: typeof accuracy === 'number' ? Math.round(accuracy) : null,
				trainId: matchedTrainId,
				timestamp: Date.now()
			};

			liveTrainPings.set(matchedTrainId, ping);

			return json({
				status: 'success',
				matchedTrainId,
				accuracy: ping.accuracy,
				timestamp: ping.timestamp,
				activeLiveCount: liveTrainPings.size
			});
		}

		return json({
			status: 'no_match',
			message: 'Tidak ada kereta aktif di sekitar koordinat Anda',
			coordinates: { lat, lng }
		});
	} catch (err: any) {
		return json({ status: 'error', message: err?.message || 'Server error' }, { status: 500 });
	}
};
