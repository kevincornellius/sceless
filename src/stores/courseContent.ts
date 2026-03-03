import { signal } from "@preact/signals";
import type { Topic } from "../types/scele";
import { fetchCourseContent } from "../utils/scraper";

export interface CourseCache {
	title: string;
	topics: Topic[];
	loading: boolean;
	error: string | null;
}

// Map of courseUrl → cached content
const cache = signal<Record<string, CourseCache>>({});

/** Get cached course content (reactive). Returns undefined if not yet fetched. */
export const getCourseCache = (courseUrl: string): CourseCache | undefined => {
	return cache.value[courseUrl];
};

/** Fetch + cache course content. Skips if already loaded or loading. */
export const loadCourseContent = async (courseUrl: string) => {
	const existing = cache.value[courseUrl];

	// Already loaded or in-flight
	if (existing?.topics.length || existing?.loading) return;

	// Set loading state
	cache.value = {
		...cache.value,
		[courseUrl]: { title: "", topics: [], loading: true, error: null },
	};

	try {
		const { title, topics } = await fetchCourseContent(courseUrl);
		cache.value = {
			...cache.value,
			[courseUrl]: { title, topics, loading: false, error: null },
		};
	} catch (err) {
		cache.value = {
			...cache.value,
			[courseUrl]: {
				title: "",
				topics: [],
				loading: false,
				error: err instanceof Error ? err.message : "Unknown error",
			},
		};
	}
};

/** Force re-fetch a course (invalidate cache). */
export const refreshCourseContent = async (courseUrl: string) => {
	cache.value = {
		...cache.value,
		[courseUrl]: { title: "", topics: [], loading: true, error: null },
	};
	try {
		const { title, topics } = await fetchCourseContent(courseUrl);
		cache.value = {
			...cache.value,
			[courseUrl]: { title, topics, loading: false, error: null },
		};
	} catch (err) {
		cache.value = {
			...cache.value,
			[courseUrl]: {
				title: "",
				topics: [],
				loading: false,
				error: err instanceof Error ? err.message : "Unknown error",
			},
		};
	}
};
