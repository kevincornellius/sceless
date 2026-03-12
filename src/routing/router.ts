import { TabToUrl, UrlToTab } from "../helper/tabs";
import { DashboardTab } from "../pages/DashboardPage";
import {
	activeTabKey,
	add,
	getTabKey,
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

	await add(tab);
	await setActive(tabKey);
};

export const deleteTab = async (tabKey: string) => {
	await remove(tabKey);
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
