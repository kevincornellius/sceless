import { Course } from "@/src/types/course";
import { db } from "./db";

const CACHE_KEY = "inprogress-courses";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function getCachedCourses(): Promise<Course[] | null> {
  return db.get<Course[]>("cache", CACHE_KEY);
}

export async function setCachedCourses(courses: Course[]): Promise<void> {
  await db.set("cache", CACHE_KEY, courses);
}

export async function getCacheTimestamp(): Promise<number | null> {
console.log(`Retrieving cache timestamp for key: ${CACHE_KEY}: ${await db.getTimestamp("cache", CACHE_KEY)}`);
  return db.getTimestamp("cache", CACHE_KEY);
}

export async function isCacheValid(): Promise<boolean> {
console.log(`Checking cache validity: ${CACHE_KEY} - TTL: ${CACHE_TTL}ms`);
  const timestamp = await getCacheTimestamp();
  if (!timestamp) return false;
  return Date.now() - timestamp < CACHE_TTL;
}

export async function refreshCourses(): Promise<Course[]> {
  const { getInprogressCourses } = await import("@/src/data/adapter/moodlews/courses");
  const courses = await getInprogressCourses();
  await setCachedCourses(courses);
  return courses;
}

let firstLoad = false;

export async function loadCourses(): Promise<{ courses: Course[]; isFromCache: boolean }> {
  
    if(!firstLoad)
    {
        firstLoad = true;
        const courses = await refreshCourses();
        return { courses, isFromCache: false };
    }

    const cacheValid = await isCacheValid();
    const cached = await getCachedCourses();
  
    if (cacheValid && cached && cached.length > 0) {
        return { courses: cached, isFromCache: true };
    }

    const courses = await refreshCourses();
    return { courses, isFromCache: false };
}

export async function forceRefreshCourses(): Promise<Course[]> {
  return refreshCourses();
}
