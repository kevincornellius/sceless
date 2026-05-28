import { Deadline } from "@/src/types/scele";
import { db } from "./db";

const CACHE_KEY = "deadlines";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

const MONTH_CACHE_PREFIX = "deadline-month-";

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

// ── Session-level timeline cache (resets on browser refresh) ─────────────────

let timelineSessionCache: Promise<Deadline[]> | null = null;

export function loadTimelineDeadlines(): Promise<Deadline[]> {
    if (timelineSessionCache) return timelineSessionCache;
    timelineSessionCache = import("@/src/data/adapter/moodlews/deadlines")
        .then(({ getTimelineDeadlines }) => getTimelineDeadlines())
        .catch(() => []);
    return timelineSessionCache;
}

// ── Per-month caching ─────────────────────────────────────────────────────────

function monthCacheKey(year: number, month: number): string {
    return `${MONTH_CACHE_PREFIX}${year}-${month}`;
}

async function isMonthCacheValid(year: number, month: number): Promise<boolean> {
    const timestamp = await db.getTimestamp("cache", monthCacheKey(year, month));
    if (!timestamp) return false;
    return Date.now() - timestamp < CACHE_TTL;
}

export async function loadMonthlyDeadlines(
    year: number,
    month: number,
): Promise<{ deadlines: Deadline[]; isFromCache: boolean }> {
    const key = monthCacheKey(year, month);

    const [valid, cached] = await Promise.all([
        isMonthCacheValid(year, month),
        db.get<Deadline[]>("cache", key),
    ]);

    if (valid && cached) {
        return { deadlines: cached, isFromCache: true };
    }

    const { getMonthlyDeadlines } = await import("@/src/data/adapter/moodlews/deadlines");
    const deadlines = await getMonthlyDeadlines(year, month);
    await db.set("cache", key, deadlines);
    return { deadlines, isFromCache: false };
}

export async function forceRefreshMonthlyDeadlines(year: number, month: number): Promise<Deadline[]> {
    const { getMonthlyDeadlines } = await import("@/src/data/adapter/moodlews/deadlines");
    const deadlines = await getMonthlyDeadlines(year, month);
    await db.set("cache", monthCacheKey(year, month), deadlines);
    return deadlines;
}

