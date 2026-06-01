import { json } from '@sveltejs/kit';
import { allTrains } from '$lib/server/mockSchedule';

// In-memory cache
interface CacheData {
	timestamp: number;
	data: any;
}

const cache: Record<string, CacheData> = {};
const CACHE_DURATION_MS = 30 * 1000; // 30 seconds

export const GET = async ({ url }) => {
	const stationId = url.searchParams.get('stationId') || 'MRI';
	
	// Check cache
	if (cache[stationId] && Date.now() - cache[stationId].timestamp < CACHE_DURATION_MS) {
		return json({
			status: 'success',
			source: 'cache',
			data: cache[stationId].data
		});
	}

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

	// Save to cache
	cache[stationId] = {
		timestamp: Date.now(),
		data: responseData
	};

	return json({
		status: 'success',
		source: 'live',
		data: responseData
	});
};
