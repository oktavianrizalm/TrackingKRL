import { json } from '@sveltejs/kit';
import { stationsList } from '$lib/server/mockSchedule';

export const GET = async () => {
	return json({
		status: 'success',
		data: stationsList
	});
};
