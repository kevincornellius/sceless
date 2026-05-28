import { signal } from "@preact/signals";
import { Course } from "@/src/types/course";
import { db } from "./db";
import { decodeEntities } from "@/src/utils/html";

function sanitizeCourse(c: Course): Course {
    return { ...c, title: decodeEntities(c.title), code: decodeEntities(c.code) };
}

const CACHE_KEY = "inprogress-courses";

export const courses = signal<Course[]>([]);
export const coursesLoaded = signal(false);

export async function getCachedCourses(): Promise<Course[] | null> {
    return db.get<Course[]>("cache", CACHE_KEY);
}

export async function setCachedCourses(coursesToCache: Course[]): Promise<void> {
    await db.set("cache", CACHE_KEY, coursesToCache);
}

export async function refreshCourses(): Promise<Course[]> {
    const { getInprogressCourses } = await import("@/src/data/adapter/moodlews/courses");
    const courseList = await getInprogressCourses();
    await setCachedCourses(courseList);
    courses.value = courseList;
    return courseList;
}

export async function loadCourses(): Promise<{ courses: Course[]; isFromCache: boolean }> {
    const cached = await getCachedCourses();

    if (cached && cached.length > 0) {
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

export function getCourseTitle(courseId: string): string | null {
    const course = courses.value.find(c => c.id.toString() === courseId);
    return course?.title ?? null;
}

export function getCourseCode(courseId: string): string | null {
    const course = courses.value.find(c => c.id.toString() === courseId);
    return course?.code ?? null;
}
