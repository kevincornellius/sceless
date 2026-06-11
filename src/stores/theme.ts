import { signal } from "@preact/signals";
import { defaultThemes, type ThemeConfig } from "../types/themes";

export const theme = signal<ThemeConfig>(defaultThemes[0]);
export const isThemeLoaded = signal(false);

export const themeStorage = storage.defineItem<ThemeConfig>("local:theme", {
	defaultValue: defaultThemes[0],
});

const applyTheme = (t: ThemeConfig) => {
	const root = document.documentElement;

	root.style.setProperty("--theme-primary", t.primary);
	root.style.setProperty("--theme-primary-dark", t.primaryDark);
	root.style.setProperty("--theme-on-primary", t.onPrimary);
	root.style.setProperty("--theme-page", t.bg);
	root.style.setProperty("--theme-page-secondary", t.bgSecondary);
	root.style.setProperty("--theme-edge", t.border);
	root.style.setProperty("--theme-content", t.text);
	root.style.setProperty("--theme-content-muted", t.textMuted);
	root.style.setProperty("--theme-highlight", t.highlight);
	root.style.setProperty("--theme-success", t.success);
	root.style.setProperty("--theme-danger", t.danger);

	// Add dark theme class for noise texture on dark backgrounds
	const isDark = t.bg.startsWith("#") && parseInt(t.bg.slice(1), 16) < 0x888888;
	if (isDark) {
		root.classList.add("theme-dark");
	} else {
		root.classList.remove("theme-dark");
	}
};

export const initializeTheme = async () => {
	const initialTheme = await themeStorage.getValue();

	theme.value = initialTheme;
	applyTheme(initialTheme);
	isThemeLoaded.value = true;

	themeStorage.watch((newTheme) => {
		if (newTheme) {
			theme.value = newTheme;
			applyTheme(newTheme);
		}
	});
};

export const changeTheme = async (newTheme: ThemeConfig) => {
	const prevName = theme.value.name;
	await themeStorage.setValue(newTheme);
	const { trackThemeSwitch } = await import("./indexeddb/activity");
	trackThemeSwitch(prevName, newTheme.name);
};
