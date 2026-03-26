import { signal } from "@preact/signals";
import { db } from "./indexeddb/db";
import { CourseSection } from "@/src/types/course";

export const newModuleCounts = signal<Record<string, number>>({});

const SEEN_MODULES_KEY = "seen-modules";
const NEW_MODULE_COUNT_KEY = "new-module-count"; // { [courseId]: number } of last known new count

interface SeenModulesData {
    [courseId: string]: number[]; // array of seen module IDs
}

interface NewModuleCountData {
    [courseId: string]: number; // last stored new module count
}

/**
 * Get all seen module IDs for a course.
 */
async function getSeenModuleIds(courseId: string): Promise<number[]> {
    const all = await db.get<SeenModulesData>("cache", SEEN_MODULES_KEY);
    return all?.[courseId] ?? [];
}

/**
 * Save seen module IDs for a course.
 */
async function saveSeenModuleIds(courseId: string, ids: number[]): Promise<void> {
    const all = await db.get<SeenModulesData>("cache", SEEN_MODULES_KEY) ?? {};
    all[courseId] = ids;
    await db.set("cache", SEEN_MODULES_KEY, all);
}

/**
 * Mark all modules in a course as seen.
 * Call this when user opens a course detail page.
 * Saves the new module count so dashboard can display it without re-fetching.
 */
export async function markCourseSeen(courseId: string, sections: CourseSection[]): Promise<void> {
    const currentIds = sections.flatMap(s => s.modules.map(m => m.id));
    const existingIds = await getSeenModuleIds(courseId);
    const merged = [...new Set([...existingIds, ...currentIds])];
    await saveSeenModuleIds(courseId, merged);

    // Save how many were new this time (for dashboard badge without re-fetch)
    const newCount = currentIds.filter(id => !existingIds.includes(id)).length;
    if (newCount > 0) {
        const counts = await db.get<NewModuleCountData>("cache", NEW_MODULE_COUNT_KEY) ?? {};
        counts[courseId] = (counts[courseId] ?? 0) + newCount;
        await db.set("cache", NEW_MODULE_COUNT_KEY, counts);
        await refreshNewModuleCounts();
    }
}

/**
 * Get module IDs that are new (never seen before) in a course.
 */
export async function getNewModuleIds(courseId: string, sections: CourseSection[]): Promise<number[]> {
    const seenIds = await getSeenModuleIds(courseId);
    return sections
        .flatMap(s => s.modules)
        .map(m => m.id)
        .filter(id => !seenIds.includes(id));
}

/**
 * Get count of new (unseen) modules in a course (fresh, requires course contents).
 */
export async function getNewModuleCount(courseId: string, sections: CourseSection[]): Promise<number> {
    return (await getNewModuleIds(courseId, sections)).length;
}

/**
 * Get the last known new module count for a course (from cache, no fetch needed).
 */
export async function getCachedNewModuleCount(courseId: string): Promise<number> {
    const counts = await db.get<NewModuleCountData>("cache", NEW_MODULE_COUNT_KEY) ?? {};
    return counts[courseId] ?? 0;
}

/**
 * Get all cached new module counts (for dashboard).
 */
export async function getAllCachedNewModuleCounts(): Promise<Record<string, number>> {
    const counts = await db.get<NewModuleCountData>("cache", NEW_MODULE_COUNT_KEY);
    return counts ?? {};
}

/**
 * Reload new module counts from IndexedDB into the signal.
 */
export async function refreshNewModuleCounts(): Promise<void> {
    newModuleCounts.value = await getAllCachedNewModuleCounts();
}

/**
 * Clear the new module count for a course (call when user views new modules).
 */
export async function clearNewModuleCount(courseId: string): Promise<void> {
    const counts = await db.get<NewModuleCountData>("cache", NEW_MODULE_COUNT_KEY) ?? {};
    delete counts[courseId];
    await db.set("cache", NEW_MODULE_COUNT_KEY, counts);
    await refreshNewModuleCounts();
}
