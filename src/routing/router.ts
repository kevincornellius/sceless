import { effect, signal } from "@preact/signals";
import { openTabsStorage } from "../storage";
import { pinnedIds } from "../stores/pins";
import { SCELE_URL } from "../config";

export type TabType = "course" | "dashboard" | "settings";

export interface Tab {
	type: TabType;
	url: string;
	title: string;
}

export const DashboardTab: Tab = {
	type: "dashboard",
	url: SCELE_URL,
	title: "Dashboard",
};

export const openTabs = signal<Tab[]>([]);

export const getTabFromUrl = (currentUrl: string): Tab => {
	if (currentUrl.includes("/course/view.php")) {
		return { type: "course", url: currentUrl, title: "Course" };
	}
	if (
		currentUrl.includes("settings") ||
		currentUrl.includes("/user/profile.php")
	) {
		return { type: "settings", url: currentUrl, title: "Settings" };
	}
	return DashboardTab;
};

// Initialize activeTab based on the current URL
export const activeTab = signal<Tab>(getTabFromUrl(window.location.href));

let _loaded = false;
export const loadOpenTabs = async () => {
	if (_loaded) return;
	_loaded = true;
	const saved = (await openTabsStorage.getValue()) ?? [];
	openTabs.value = saved;
};

effect(() => {
	const tabs = openTabs.value;
	if (!_loaded) return;
	openTabsStorage.setValue(tabs);
});

const addToOpenTabs = (tab: Tab) => {
	if (tab.type === "dashboard") return;

	const courseIdMatch = tab.url.match(/[?&]id=(\d+)/);
	const courseId = courseIdMatch?.[1];

	if (courseId && pinnedIds.value.has(courseId)) return;

	if (!openTabs.value.some((t) => t.url === tab.url)) {
		openTabs.value = [...openTabs.value, tab];
	}
};

/**
 * Call this ONLY when the USER clicks a tab or links, NEVER from popstate.
 */
export const navigate = (tab: Tab, replace: boolean = false) => {
	if (activeTab.value.url === tab.url && !replace) return;

	console.log("[navigate] User clicked:", tab.url);

	activeTab.value = tab;
	addToOpenTabs(tab);

	const statePayload = {
		__sceless: true,
		type: tab.type,
		title: tab.title,
		url: tab.url,
	};

	if (replace) {
		window.history.replaceState(statePayload, "", tab.url);
	} else {
		window.history.pushState(statePayload, "", tab.url);
	}
};

export const closeTab = (tab: Tab) => {
	if (tab.type === "dashboard") return;

	const current = openTabs.value;
	const idx = current.findIndex((t) => t.url === tab.url);
	const next = current.filter((t) => t.url !== tab.url);
	openTabs.value = next;

	if (activeTab.value.url === tab.url) {
		const fallback = next[idx] ?? next[idx - 1] ?? DashboardTab;
		navigate(fallback, true);
	}
};

let isInitialized = false;

export const initNavigation = () => {
	if (isInitialized) return;
	isInitialized = true;

	if (!window.history.state || !window.history.state.__sceless) {
		window.history.replaceState(
			{
				__sceless: true,
				type: activeTab.value.type,
				title: activeTab.value.title,
				url: activeTab.value.url,
			},
			"",
			window.location.href,
		);
	}

	window.addEventListener("popstate", (event) => {
		const newTab = getTabFromUrl(window.location.href);

		activeTab.value = newTab;

		addToOpenTabs(newTab);
	});
};
