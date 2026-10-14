export interface LiveGpsPing {
	lat: number;
	lng: number;
	speed?: number | null; // km/h
	heading?: number | null;
	accuracy?: number | null;
	trainId?: string | null;
	timestamp: number; // Unix ms
}

// In-memory store of active train pings: trainId -> LiveGpsPing
export const liveTrainPings = new Map<string, LiveGpsPing>();

// Clean up pings older than maxAgeMs (default 60 seconds)
export function pruneExpiredPings(maxAgeMs = 60000) {
	const now = Date.now();
	for (const [trainId, ping] of liveTrainPings.entries()) {
		if (now - ping.timestamp > maxAgeMs) {
			liveTrainPings.delete(trainId);
		}
	}
}
