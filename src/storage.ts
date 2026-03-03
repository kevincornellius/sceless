import { Tab } from "./routing/router";

export const enabledStorage = storage.defineItem<boolean>("local:enabled", {
	defaultValue: true,
});

export const pinnedCoursesStorage = storage.defineItem<string[]>(
	"local:pinnedCourses",
	{ defaultValue: [] },
);

export const openTabsStorage = storage.defineItem<Tab[]>("local:openTabs", {
	defaultValue: [],
});

export const themeStorage = storage.defineItem<"light" | "dark">(
	"local:theme",
	{ defaultValue: "light" },
);
