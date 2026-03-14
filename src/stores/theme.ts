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
	await themeStorage.setValue(newTheme);
};
