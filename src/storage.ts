import { storage } from "#imports";
import type { ActivityStats } from "./stores/indexeddb/activity";

export const enabledStorage = storage.defineItem<boolean>("local:enabled", {
	defaultValue: true,
});

export const quizReviewHijackStorage = storage.defineItem<boolean>(
	"local:quizReviewHijackEnabled",
	{
		defaultValue: true,
	},
);

export const sceleModStorage = storage.defineItem<boolean>(
	"local:sceleModEnabled",
	{
		defaultValue: true,
	},
);

export const wrappedSnapshotStorage = storage.defineItem<ActivityStats | null>(
	"local:wrapped_snapshot",
	{ defaultValue: null },
);
