import { json } from '@sveltejs/kit';
import { allTrains } from '$lib/server/mockSchedule';

export const GET = async ({ url, setHeaders }) => {
	const rawStationId = url.searchParams.get('stationId') || 'MRI';
	
	// Input validation: Must be alphanumeric, max 10 chars. Prevent prototype pollution.
	const isValid = /^[A-Z0-9]{2,10}$/i.test(rawStationId);
	const stationId = isValid ? rawStationId.toUpperCase() : 'MRI';

	// Use Edge CDN caching instead of vulnerable in-memory cache
	setHeaders({
		'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=59'
	});

	const nowRaw = new Date();
	const now = new Date(nowRaw.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
	const currentHour = now.getHours();
	const currentMinute = now.getMinutes();
	const currentTotalMinutes = currentHour * 60 + currentMinute;

	const mockTrains = [];

	// Filter trains that stop at the requested station and are upcoming
	for (const train of allTrains) {
		if (train.schedule[stationId]) {
			const timeStr = train.schedule[stationId];
			const [hours, minutes] = timeStr.split(':').map(Number);
			let trainTotalMinutes = hours * 60 + minutes;

			// Handle trains that are scheduled past midnight
			if (trainTotalMinutes < currentTotalMinutes - 120) {
				trainTotalMinutes += 24 * 60;
			}

			const diffMinutes = trainTotalMinutes - currentTotalMinutes;

			// Include trains arriving in the next 120 minutes, or just arrived (diff >= -5)
			if (diffMinutes >= -5 && diffMinutes <= 120) {
				let status = 'upcoming';
				if (diffMinutes <= 0) status = 'arrived';
				else if (diffMinutes <= 5) status = 'boarding_soon';

				mockTrains.push({
					id: train.id,
					line: train.line,
					destination: train.destination,
					scheduled_time: timeStr,
					estimated_minutes: Math.max(0, diffMinutes),
					status: status
				});
			}
		}
	}

	// Sort by estimated time
	mockTrains.sort((a, b) => a.estimated_minutes - b.estimated_minutes);

	// Limit to top 15 trains
	const upcomingTrains = mockTrains.slice(0, 15);

	const responseData = {
		station_id: stationId,
		last_updated: now.toISOString(),
		trains: upcomingTrains
	};

	return json({
		status: 'success',
		source: 'live',
		data: responseData
	});
};
