import { Deadline } from "@/src/types/scele";
import { db } from "./db";

const CACHE_KEY = "deadlines";
const CACHE_KEY_TIMESORT = "deadlines-timesort";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function getCachedDeadlines(): Promise<Deadline[] | null> {
  return db.get<Deadline[]>("cache", CACHE_KEY);
}

export async function setCachedDeadlines(deadlines: Deadline[]): Promise<void> {
  await db.set("cache", CACHE_KEY, deadlines);
}

export async function getCacheTimestamp(): Promise<number | null> {
  return db.getTimestamp("cache", CACHE_KEY);
}

export async function isCacheValid(): Promise<boolean> {
  const timestamp = await getCacheTimestamp();
  if (!timestamp) return false;
  return Date.now() - timestamp < CACHE_TTL;
}

export async function refreshDeadlines(): Promise<Deadline[]> {
  const { getUpcomingDeadlines } = await import("@/src/data/adapter/moodlews/deadlines");
  const deadlines = await getUpcomingDeadlines();
  await setCachedDeadlines(deadlines);
  return deadlines;
}

let firstLoad = false;

export async function loadDeadlines(): Promise<{ deadlines: Deadline[]; isFromCache: boolean }> {
    if (!firstLoad) {
        firstLoad = true;
        const deadlines = await refreshDeadlines();
        return { deadlines, isFromCache: false };
    }

    const cacheValid = await isCacheValid();
    const cached = await getCachedDeadlines();

    if (cacheValid && cached && cached.length > 0) {
        return { deadlines: cached, isFromCache: true };
    }

    const deadlines = await refreshDeadlines();
    return { deadlines, isFromCache: false };
}

export async function forceRefreshDeadlines(): Promise<Deadline[]> {
  return refreshDeadlines();
}

// TasksPage: uses by_timesort endpoint with its own cache
export async function getCachedDeadlinesByTimesort(): Promise<Deadline[] | null> {
  return db.get<Deadline[]>("cache", CACHE_KEY_TIMESORT);
}

export async function setCachedDeadlinesByTimesort(deadlines: Deadline[]): Promise<void> {
  await db.set("cache", CACHE_KEY_TIMESORT, deadlines);
}

export async function getCacheTimestampTimesort(): Promise<number | null> {
  return db.getTimestamp("cache", CACHE_KEY_TIMESORT);
}

export async function isCacheValidTimesort(): Promise<boolean> {
  const timestamp = await getCacheTimestampTimesort();
  if (!timestamp) return false;
  return Date.now() - timestamp < CACHE_TTL;
}

let firstLoadTimesort = false;

export async function loadDeadlinesByTimesort(): Promise<{ deadlines: Deadline[]; isFromCache: boolean }> {
    if (!firstLoadTimesort) {
        firstLoadTimesort = true;
        const { getDeadlinesByTimesort } = await import("@/src/data/adapter/moodlews/deadlines");
        const deadlines = await getDeadlinesByTimesort();
        await setCachedDeadlinesByTimesort(deadlines);
        return { deadlines, isFromCache: false };
    }

    const cacheValid = await isCacheValidTimesort();
    const cached = await getCachedDeadlinesByTimesort();

    if (cacheValid && cached && cached.length > 0) {
        return { deadlines: cached, isFromCache: true };
    }

    const { getDeadlinesByTimesort } = await import("@/src/data/adapter/moodlews/deadlines");
    const deadlines = await getDeadlinesByTimesort();
    await setCachedDeadlinesByTimesort(deadlines);
    return { deadlines, isFromCache: false };
}

export async function forceRefreshDeadlinesByTimesort(): Promise<Deadline[]> {
    const { getDeadlinesByTimesort } = await import("@/src/data/adapter/moodlews/deadlines");
    const deadlines = await getDeadlinesByTimesort();
    await setCachedDeadlinesByTimesort(deadlines);
    return deadlines;
}
