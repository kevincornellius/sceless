import { signal } from "@preact/signals";
import type { UpcomingEvent } from "../types/scele";
import { fetchUpcomingEvents } from "../utils/scraper";

interface UpcomingEventCache {
	events: UpcomingEvent[];
	loading: boolean;
	error: string | null;
	lastFetch: number;
}

const cache = signal<UpcomingEventCache>({
	events: [],
	loading: false,
	error: null,
	lastFetch: 0,
});

/** Get cached upcoming events (reactive). */
export const getUpcomingEvents = () => {
	return cache.value.events;
};

/** Get loading state. */
export const getUpcomingLoading = () => {
	return cache.value.loading;
};

/** Get error state. */
export const getUpcomingError = () => {
	return cache.value.error;
};

/** Fetch + cache upcoming events. Only refetch if data is stale (older than 30 min). */
export const loadUpcomingEvents = async () => {
	const now = Date.now();
	const lastFetch = cache.value.lastFetch;
	const cacheMs = 30 * 60 * 1000; // 30 minutes

	// Already loading
	if (cache.value.loading) return;

	// Cache is fresh
	if (lastFetch && now - lastFetch < cacheMs) return;

	// Set loading state
	cache.value = {
		...cache.value,
		loading: true,
		error: null,
	};

	try {
		const events = await fetchUpcomingEvents();
		cache.value = {
			events,
			loading: false,
			error: null,
			lastFetch: now,
		};
	} catch (err) {
		cache.value = {
			...cache.value,
			loading: false,
			error: err instanceof Error ? err.message : "Unknown error",
		};
	}
};

/** Force re-fetch upcoming events (invalidate cache). */
export const refreshUpcomingEvents = async () => {
	cache.value = {
		events: [],
		loading: true,
		error: null,
		lastFetch: 0,
	};

	try {
		const events = await fetchUpcomingEvents();
		cache.value = {
			events,
			loading: false,
			error: null,
			lastFetch: Date.now(),
		};
	} catch (err) {
		cache.value = {
			events: [],
			loading: false,
			error: err instanceof Error ? err.message : "Unknown error",
			lastFetch: 0,
		};
	}
};
