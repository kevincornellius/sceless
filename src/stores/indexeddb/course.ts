import { signal } from "@preact/signals";
import { Course } from "@/src/types/course";
import { db } from "./db";
import { decodeEntities } from "@/src/utils/html";

function sanitizeCourse(c: Course): Course {
    return { ...c, title: decodeEntities(c.title), code: decodeEntities(c.code) };
}

const CACHE_KEY = "inprogress-courses";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Global signal for courses
export const courses = signal<Course[]>([]);
export const coursesLoaded = signal(false);

export async function getCachedCourses(): Promise<Course[] | null> {
  return db.get<Course[]>("cache", CACHE_KEY);
}

export async function setCachedCourses(coursesToCache: Course[]): Promise<void> {
  await db.set("cache", CACHE_KEY, coursesToCache);
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
  const courseList = await getInprogressCourses();
  await setCachedCourses(courseList);
  courses.value = courseList;
  return courseList;
}

let firstLoad = false;

export async function loadCourses(): Promise<{ courses: Course[]; isFromCache: boolean }> {
  
  console.log("Loading courses...");
    if(!firstLoad)
    {
        firstLoad = true;
        const courseList = await refreshCourses();
        coursesLoaded.value = true;
        console.log("Returning: ", courseList);
        return { courses: courseList, isFromCache: false };
    }


    const cacheValid = await isCacheValid();
    const cached = await getCachedCourses();
  
    if (cacheValid && cached && cached.length > 0) {
        const sanitized = cached.map(sanitizeCourse);
        courses.value = sanitized;
        coursesLoaded.value = true;
        return { courses: sanitized, isFromCache: true };
    }

    const courseList = await refreshCourses();
    coursesLoaded.value = true;
    return { courses: courseList, isFromCache: false };
}

export async function forceRefreshCourses(): Promise<Course[]> {
  return refreshCourses();
}

// Get course title by course ID
export function getCourseTitle(courseId: string): string | null {
    const course = courses.value.find(c => c.id.toString() === courseId);
    return course?.title ?? null;
}
export function getCourseCode(courseId: string): string | null {
    const course = courses.value.find(c => c.id.toString() === courseId);
    return course?.code ?? null;
}
