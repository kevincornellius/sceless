import { signal, effect } from "@preact/signals";

// Offset between server time and client time (in milliseconds)
const serverTimeOffset = signal<number>(0);

// Current server time (updates every second)
export const serverTime = signal<Date>(new Date());

let _loaded = false;

/**
 * Fetch server time from SCELE and calculate offset.
 * Run once on app boot.
 */
export const loadServerTime = async () => {
	if (_loaded) return;
	_loaded = true;

	try {
		console.log("[sceless] Fetching server time...");
		const response = await fetch("https://scele.cs.ui.ac.id/", {
			method: "HEAD",
		});

		const dateHeader = response.headers.get("Date");
		if (!dateHeader) {
			console.warn("[sceless] No Date header in response");
			return;
		}

		const serverDate = new Date(dateHeader);
		const clientDate = new Date();
		const offset = serverDate.getTime() - clientDate.getTime();

		console.log("[sceless] Server time:", serverDate);
		console.log("[sceless] Client time:", clientDate);
		console.log("[sceless] Offset (ms):", offset);

		serverTimeOffset.value = offset;
		serverTime.value = new Date(clientDate.getTime() + offset);
	} catch (error) {
		console.error("[sceless] Failed to fetch server time:", error);
	}
};

// Update server time every second
let intervalId: NodeJS.Timeout | null = null;

effect(() => {
	// Subscribe to offset to start the interval once loaded
	const offset = serverTimeOffset.value;

	if (offset === 0 && !_loaded) return;

	// Clear existing interval
	if (intervalId) clearInterval(intervalId);

	// Start interval - update every second
	intervalId = setInterval(() => {
		const now = new Date();
		serverTime.value = new Date(now.getTime() + offset);
	}, 1000);

	return () => {
		if (intervalId) clearInterval(intervalId);
	};
});

/**
 * Format server time for display.
 * Returns: "HH:MM:SS" or "HH:MM" depending on showSeconds.
 */
export const formatServerTime = (showSeconds = true): string => {
	const time = serverTime.value;
	const hours = String(time.getHours()).padStart(2, "0");
	const minutes = String(time.getMinutes()).padStart(2, "0");
	const seconds = String(time.getSeconds()).padStart(2, "0");

	if (showSeconds) {
		return `${hours}:${minutes}:${seconds}`;
	}
	return `${hours}:${minutes}`;
};
