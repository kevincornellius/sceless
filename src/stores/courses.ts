import { signal, computed } from "@preact/signals";
import type { Course } from "../types/scele";
import { fetchCoursesFromMy } from "../utils/scraper";

export const courses = signal<Course[]>([]);
export const coursesLoading = signal(true);
export const coursesError = signal<string | null>(null);

/** Courses grouped by term, respecting an external "showArchived" flag. */
export const groupedCourses = (showArchived: boolean) => {
	const filtered = courses.value.filter((c) =>
		showArchived ? true : !c.isArchived,
	);
	const grouped: Record<string, Course[]> = {};
	for (const course of filtered) {
		const key = course.term || "My Courses";
		(grouped[key] ??= []).push(course);
	}
	return grouped;
};

let _fetched = false;

/** Fetch courses once. Subsequent calls are no-ops. */
export const loadCourses = async () => {
	if (_fetched) return;
	_fetched = true;
	coursesLoading.value = true;
	coursesError.value = null;
	try {
		courses.value = await fetchCoursesFromMy();
	} catch (e) {
		coursesError.value =
			e instanceof Error ? e.message : "Failed to load courses";
		console.error("[sceless] Failed to fetch courses:", e);
	} finally {
		coursesLoading.value = false;
	}
};
