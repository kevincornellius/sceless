import type { Profile } from "@/src/types/profile";
import { db } from "./db";

const CACHE_KEY = "site-info";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours - site info rarely changes

export async function getCachedSiteInfo(): Promise<Profile | null> {
  return db.get<Profile>("cache", CACHE_KEY);
}

export async function setCachedSiteInfo(info: Profile): Promise<void> {
  await db.set("cache", CACHE_KEY, info);
}

export async function getSiteInfoTimestamp(): Promise<number | null> {
  return db.getTimestamp("cache", CACHE_KEY);
}

export async function isSiteInfoCacheValid(): Promise<boolean> {
  const timestamp = await getSiteInfoTimestamp();
  if (!timestamp) return false;
  return Date.now() - timestamp < CACHE_TTL;
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
