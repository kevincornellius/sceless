import { TabToUrl, UrlToTab } from "../helper/tabs";
import { DashboardTab } from "../pages/DashboardPage";
import {
	activeTabKey,
	add,
	getTabKey,
	openTabs,
	remove,
	setActive,
} from "../stores/tabs";
import { Tab } from "../types/state";

// Guard: skip navigation if already on this exact tab
let isNavigating = false;

export const navigateTab = async (tab: Tab) => {
	// Skip if already navigating (avoid double navigation during boot)
	if (isNavigating) return;
	isNavigating = true;
	try {
		const tabKey = getTabKey(tab);
		const nextUrl = TabToUrl(tab);

		// Skip if already on this tab
		if (activeTabKey.value === tabKey && window.location.href === nextUrl) {
			return;
		}

		if (window.location.href !== nextUrl) {
			window.history.pushState(null, "", nextUrl);
		}

		await add(tab);
		await setActive(tabKey);
	} finally {
		isNavigating = false;
	}
};

export const deleteTab = async (tabKey: string) => {
	const closedIndex = openTabs.value.findIndex(
			(t) => getTabKey(t) === tabKey,
		);
	
		if (closedIndex === -1) return;
	
		const fallbackTab =
			(closedIndex < openTabs.value.length - 1
				? openTabs.value[closedIndex + 1]
				: openTabs.value[closedIndex - 1]) || null;
	
	await remove(tabKey);
	if (activeTabKey.value === tabKey) {
		navigateTab(fallbackTab || DashboardTab);
	}
};

export const getActiveTab = (): string | null => {
	return activeTabKey.value;
};


let isInitialized = false;
let bootComplete = false;

export const initNavigation = async () => {
	if (isInitialized) return;
	isInitialized = true;

	window.addEventListener("popstate", () => {
		// Skip popstate during boot — bootCoreData handles initial navigation explicitly
		if (!bootComplete) return;
		const newTab = UrlToTab(window.location.href);
		navigateTab(newTab || DashboardTab);
	});
};

// Called from bootCoreData after navigateTab completes
export const markBootComplete = () => {
	bootComplete = true;
};
