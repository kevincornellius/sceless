import { CourseSection } from "@/src/types/course";
import { db } from "./db";

const CACHE_KEY_PREFIX = "course-contents-";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export function getCourseContentsCacheKey(courseId: string): string {
    return `${CACHE_KEY_PREFIX}${courseId}`;
}

export async function getCachedCourseContents(courseId: string): Promise<CourseSection[] | null> {
    return db.get<CourseSection[]>("cache", getCourseContentsCacheKey(courseId));
}

export async function setCachedCourseContents(courseId: string, contents: CourseSection[]): Promise<void> {
    await db.set("cache", getCourseContentsCacheKey(courseId), contents);
}

export async function getCourseContentsCacheTimestamp(courseId: string): Promise<number | null> {
    return db.getTimestamp("cache", getCourseContentsCacheKey(courseId));
}

export async function isCourseContentsCacheValid(courseId: string): Promise<boolean> {
    const timestamp = await getCourseContentsCacheTimestamp(courseId);
    if (!timestamp) return false;
    return Date.now() - timestamp < CACHE_TTL;
}

export async function refreshCourseContents(courseId: string): Promise<CourseSection[]> {
    const { getCourseContents } = await import("@/src/data/adapter/moodlews/courses");
    const contents = await getCourseContents(parseInt(courseId, 10));
    await setCachedCourseContents(courseId, contents);
    return contents;
}

export async function loadCourseContents(courseId: string): Promise<{ contents: CourseSection[]; isFromCache: boolean }> {
    const cacheValid = await isCourseContentsCacheValid(courseId);
    const cached = await getCachedCourseContents(courseId);

    if (cacheValid && cached && cached.length > 0) {
        return { contents: cached, isFromCache: true };
    }

    const contents = await refreshCourseContents(courseId);
    return { contents, isFromCache: false };
}

export async function forceRefreshCourseContents(courseId: string): Promise<CourseSection[]> {
    return refreshCourseContents(courseId);
}
