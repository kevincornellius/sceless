import { signal, effect } from "@preact/signals";
import { pinnedCoursesStorage } from "../storage";

export const pinnedIds = signal<Set<string>>(new Set());

let _loaded = false;

/** Load pinned IDs from storage (once). */
export const loadPins = async () => {
	if (_loaded) return;
	_loaded = true;
	const ids = (await pinnedCoursesStorage.getValue()) ?? [];
	pinnedIds.value = new Set(ids);
};

// Persist whenever the set changes
effect(() => {
	const ids = pinnedIds.value; // subscribe BEFORE the guard
	if (!_loaded) return;
	pinnedCoursesStorage.setValue([...ids]);
});

export const togglePin = (courseId: string) => {
	const next = new Set(pinnedIds.value);
	if (next.has(courseId)) {
		next.delete(courseId);
	} else {
		next.add(courseId);
	}
	pinnedIds.value = next;
};

export const isPinned = (courseId: string) => pinnedIds.value.has(courseId);
