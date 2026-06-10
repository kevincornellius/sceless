import { AppNotification } from "@/src/types/scele";
import { db } from "./db";

const CACHE_KEY = "notifications";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function getCachedNotifications(): Promise<AppNotification[] | null> {
  return db.get<AppNotification[]>("cache", CACHE_KEY);
}

export async function setCachedNotifications(notifications: AppNotification[]): Promise<void> {
  await db.set("cache", CACHE_KEY, notifications);
}

export async function getCacheTimestamp(): Promise<number | null> {
  return db.getTimestamp("cache", CACHE_KEY);
}

export async function isCacheValid(): Promise<boolean> {
  const timestamp = await getCacheTimestamp();
  if (!timestamp) return false;
  return Date.now() - timestamp < CACHE_TTL;
}

export async function refreshNotifications(): Promise<AppNotification[]> {
  const { getNotifications} = await import("@/src/data/adapter/moodlews/notifications");
  const notifications = await getNotifications();
  await setCachedNotifications(notifications);
  return notifications;
}

let firstLoad = false;

export async function loadNotifications(): Promise<{ notifications: AppNotification[]; isFromCache: boolean }> {
  
    if(!firstLoad)
    {
        firstLoad = true;
        const notifications = await refreshNotifications();
        return { notifications, isFromCache: false };
    }

    const cacheValid = await isCacheValid();
    const cached = await getCachedNotifications();
  
    if (cacheValid && cached && cached.length > 0) {
        return { notifications: cached, isFromCache: true };
    }

    const notifications = await refreshNotifications();
    return { notifications, isFromCache: false };
}

export async function forceRefreshNotifications(): Promise<AppNotification[]> {
  return refreshNotifications();
}
