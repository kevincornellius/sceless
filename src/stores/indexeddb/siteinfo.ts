import type { Profile } from "@/src/types/profile";
import { db } from "./db";

const CACHE_KEY = "site-info";
// No TTL - cache persists until logout

export async function getCachedSiteInfo(): Promise<Profile | null> {
  return db.get<Profile>("cache", CACHE_KEY);
}

export async function setCachedSiteInfo(info: Profile): Promise<void> {
  await db.set("cache", CACHE_KEY, info);
}

export async function isSiteInfoCacheValid(): Promise<boolean> {
  // Always valid - no TTL
  const cached = await getCachedSiteInfo();
  return cached !== null;
}

export async function refreshSiteInfo(): Promise<Profile | null> {
  const { getSiteInfo } = await import("@/src/data/adapter/moodlews/siteinfo");
  const info = await getSiteInfo();
  if (info) {
    await setCachedSiteInfo(info);
  }
  return info ?? null;
}
export async function loadSiteInfo(): Promise<{ info: Profile | null; isFromCache: boolean }> {
  const cacheValid = await isSiteInfoCacheValid();
  
  if (cacheValid) {
    const cached = await getCachedSiteInfo();
    if (cached) {
      return { info: cached, isFromCache: true };
    }
  }

  const info = await refreshSiteInfo();
  return { info, isFromCache: false };
}

export async function forceRefreshSiteInfo(): Promise<Profile | null> {
  return refreshSiteInfo();
}

// Clear site info cache (call on logout)
export async function clearSiteInfoCache(): Promise<void> {
  await db.delete("cache", CACHE_KEY);
}

export async function getUserId(): Promise<number | null> {
  const cached = await getCachedSiteInfo();
  return cached?.id ?? null;
}