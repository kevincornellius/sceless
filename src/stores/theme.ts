import { signal, effect } from "@preact/signals";
import { themeStorage } from "../storage";

export type Theme = "light" | "dark";

export const theme = signal<Theme>("light");

let _loaded = false;

const applyTheme = (t: Theme) => {
	const root = document.getElementById("sceless-root");
	if (!root) return;
	root.classList.toggle("dark", t === "dark");
};

export const loadTheme = async () => {
	if (_loaded) return;
	_loaded = true;
	const saved = (await themeStorage.getValue()) ?? "light";
	theme.value = saved;
	applyTheme(saved);
};

export const toggleTheme = () => {
	theme.value = theme.value === "light" ? "dark" : "light";
};

// Persist + apply whenever theme changes
effect(() => {
	const t = theme.value;
	if (!_loaded) return;
	applyTheme(t);
	themeStorage.setValue(t);
});
