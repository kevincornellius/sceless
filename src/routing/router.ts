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

export const navigateTab = async (tab: Tab) => {
	const tabKey = getTabKey(tab);

	const nextUrl = TabToUrl(tab);
	if (window.location.href !== nextUrl) {
		window.history.pushState(null, "", nextUrl);
	}

	console.log(`Navigating to tab: ${tabKey}`);

	await add(tab);
	await setActive(tabKey);
};
const FALLBACK_TAB_KEY = getTabKey(DashboardTab);


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

export const initNavigation = () => {
	if (isInitialized) return;
	isInitialized = true;

	window.addEventListener("popstate", (event) => {
		const newTab = UrlToTab(window.location.href);
		navigateTab(newTab || DashboardTab);
	});
};
