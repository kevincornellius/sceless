import { storage } from "#imports";
import { signal } from "@preact/signals";
import type { Course } from "@/src/types/course";

export const pinnedCourses = signal<Course[]>([]);
export const pinnedCoursesLoaded = signal(false);

export const pinnedCoursesStorage = storage.defineItem<Course[]>("local:pinnedCourses", {
    defaultValue: [],
});

export const initPinnedCoursesStore = async () => {
    const saved = await pinnedCoursesStorage.getValue();
    pinnedCourses.value = saved ?? [];
    pinnedCoursesLoaded.value = true;
};

export const isPinned = (courseId: number): boolean => {
    return pinnedCourses.value.some(c => c.id === courseId);
};

export const togglePin = async (course: Course) => {
    const current = pinnedCourses.value;
    const pinned = isPinned(course.id);
    
    let newPinned: Course[];
    if (pinned) {
        // Unpin
        newPinned = current.filter(c => c.id !== course.id);
    } else {
        // Pin
        newPinned = [...current, { ...course, isPinned: true }];
    }
    
    pinnedCourses.value = newPinned;
    await pinnedCoursesStorage.setValue(newPinned);
};
