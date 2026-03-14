import { signal } from "@preact/signals";
import { storage } from "#imports";
import type { Tab } from "../types/state";
import { DashboardTab } from "../pages/DashboardPage";

export const openTabs = signal<Tab[]>([]);
export const activeTabKey = signal<string | null>(null);
export const openTabsLoaded = signal(false);

export const getTabKey = (tab: Tab) => `${tab.type}:${tab.id}`;
export const tabsStorage = storage.defineItem<Tab[]>("local:tabs", {
	defaultValue: [],
});

const FALLBACK_TAB_KEY = getTabKey(DashboardTab);

export const add = async (tab: Tab) => {
	const tabKey = getTabKey(tab);
	const exists = openTabs.value.some((t) => getTabKey(t) === tabKey);

	if (!exists) {
		console.log(`Adding new tab: ${tabKey}`);
		await tabsStorage.setValue([...openTabs.value, tab]);
	}
};

// Replace all tabs with a single tab (for navbar search)
export const replaceAllWith = async (tab: Tab) => {
	const tabKey = getTabKey(tab);
	console.log(`Replacing all tabs with: ${tabKey}`);
	await tabsStorage.setValue([tab]);
	activeTabKey.value = tabKey;
	document.title = tab.title;
};

export const setActive = async (tabKey: string) => {
	const tab = openTabs.value.find((t) => getTabKey(t) === tabKey);
	if (!tab) {
		console.warn(`Tab with key ${tabKey} does not exist.`);
		return;
	}

	activeTabKey.value = tabKey;
	document.title = tab.title;
};

export const remove = async (tabKey: string) => {
	
	const newTabs = openTabs.value.filter((t) => getTabKey(t) !== tabKey);
	await tabsStorage.setValue(newTabs);

	
};

export async function initStore() {
	const initialTabs = await tabsStorage.getValue();

	openTabs.value = initialTabs;

	// Set default active tab if none exists
	const fallbackTab = initialTabs.length > 0 ? initialTabs[0] : DashboardTab;
	if (!activeTabKey.value && initialTabs.length > 0) {
		activeTabKey.value = getTabKey(initialTabs[0]);
	} else if (!activeTabKey.value) {
		activeTabKey.value = FALLBACK_TAB_KEY;
	}

	// Set initial document title
	const activeTab = openTabs.value.find(
		(t) => getTabKey(t) === activeTabKey.value,
	);
	document.title = activeTab?.title ?? "Sceless";

	console.log(
		"Initialized tabs store with tabs:",
		initialTabs,
		"and active tab:",
		activeTabKey.value,
	);
	openTabsLoaded.value = true;

	tabsStorage.watch((newTabs) => {
		openTabs.value = newTabs ?? [];
	});
}
