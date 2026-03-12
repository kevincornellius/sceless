import { signal } from "@preact/signals";
import { storage } from "#imports";
import type { Tab } from "../types/state";
import { DashboardTab } from "../pages/DashboardPage";

export const openTabs = signal<Tab[]>([]);
export const activeTabKey = signal<string | null>(null);
export const openTabsLoaded = signal(false);
export const activeTabsLoaded = signal(false);

export const getTabKey = (tab: Tab) => `${tab.type}:${tab.id}`;
export const tabsStorage = storage.defineItem<Tab[]>("local:tabs", {
	defaultValue: [],
});

const FALLBACK_TAB_KEY = getTabKey(DashboardTab);

export const activeTabStorage = storage.defineItem<string | null>(
	"local:activeTab",
	{
		defaultValue: null,
	},
);

export const add = async (tab: Tab) => {
	const tabKey = getTabKey(tab);
	const exists = openTabs.value.some((t) => getTabKey(t) === tabKey);

	if (!exists) {
		await tabsStorage.setValue([...openTabs.value, tab]);
	}
};

export const setActive = async (tabKey: string) => {
	if (!openTabs.value.some((t) => getTabKey(t) === tabKey)) {
		console.warn(`Tab with key ${tabKey} does not exist.`);
		return;
	}

	await activeTabStorage.setValue(tabKey);
};

export const remove = async (tabKey: string) => {
	const closedIndex = openTabs.value.findIndex(
		(t) => getTabKey(t) === tabKey,
	);

	if (closedIndex === -1) return;

	const fallbackTab =
		(closedIndex < openTabs.value.length - 1
			? openTabs.value[closedIndex + 1]
			: openTabs.value[closedIndex - 1]) || null;

	const newTabs = openTabs.value.filter((t) => getTabKey(t) !== tabKey);
	await tabsStorage.setValue(newTabs);

	if (activeTabKey.value === tabKey) {
		await activeTabStorage.setValue(
			fallbackTab ? getTabKey(fallbackTab) : FALLBACK_TAB_KEY,
		);
	}
};

export async function initStore() {
	const [initialTabs, initialActiveTab] = await Promise.all([
		tabsStorage.getValue(),
		activeTabStorage.getValue(),
	]);

	openTabs.value = initialTabs;
	activeTabKey.value = initialActiveTab;

	console.log(
		"Initialized tabs store with tabs:",
		initialTabs,
		"and active tab:",
		initialActiveTab,
	);
	openTabsLoaded.value = true;
	activeTabsLoaded.value = true;

	tabsStorage.watch((newTabs) => {
		openTabs.value = newTabs ?? [];
	});

	activeTabStorage.watch((newActiveTab) => {
		activeTabKey.value = newActiveTab;
	});
}
