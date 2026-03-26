import { db } from "./indexeddb/db";

const LAST_VISIT_KEY = "last-visit";

export async function getLastVisit(): Promise<number | null> {
    const val = await db.get<number>("cache", LAST_VISIT_KEY);
    return val ?? null;
}

export async function setLastVisit(timestamp?: number): Promise<void> {
    await db.set("cache", LAST_VISIT_KEY, timestamp ?? Date.now());
}
