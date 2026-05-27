import { Announcement } from "@/src/types/scele";
import { db } from "./db";

const CACHE_KEY = "announcements";
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

async function isCacheValid(): Promise<boolean> {
    const ts = await db.getTimestamp("cache", CACHE_KEY);
    return !!ts && Date.now() - ts < CACHE_TTL;
}

async function refresh(): Promise<Announcement[]> {
    const { getAnnouncements } = await import("@/src/data/adapter/moodlews/forum");
    const data = await getAnnouncements();
    await db.set("cache", CACHE_KEY, data);
    return data;
}

let firstLoad = false;

export async function loadAnnouncements(): Promise<{ announcements: Announcement[]; isFromCache: boolean }> {
    if (!firstLoad) {
        firstLoad = true;
        const announcements = await refresh();
        return { announcements, isFromCache: false };
    }

    const cacheValid = await isCacheValid();
    const cached = await db.get<Announcement[]>("cache", CACHE_KEY);

    if (cacheValid && cached && cached.length > 0) {
        return { announcements: cached, isFromCache: true };
    }

    const announcements = await refresh();
    return { announcements, isFromCache: false };
}
