import { h, render as renderPreact } from "preact";
import { Logo } from "@/src/components/ui/Logo";
import { initializeTheme, theme, changeTheme } from "@/src/stores/theme";
import { defaultThemes } from "@/src/types/themes";
import { sceleModStorage } from "@/src/storage";
import fontCss from "@/src/assets/fonts/plus-jakarta-sans.css?inline";

const STYLE_ID = "sceless-mod-style";
const FONT_ID = "sceless-mod-font";

function injectFont() {
	if (document.getElementById(FONT_ID)) return;
	const style = document.createElement("style");
	style.id = FONT_ID;
	style.textContent = fontCss;
	document.head.appendChild(style);
}

function injectStyles() {
	if (document.getElementById(STYLE_ID)) return;

	const style = document.createElement("style");
	style.id = STYLE_ID;
	style.textContent = `
/* Font — only text elements, never pseudo-elements (icons use ::before) */
body, h1, h2, h3, h4, h5, h6,
p, li, td, th, caption, blockquote,
a, span:not(.icon):not([class*="fa"]),
input, button, select, textarea, label,
.nav-link, .navbar-brand, .dropdown-item,
.breadcrumb-item, .card-title, .card-body,
div[role="main"], .generalbox, .submissionstatustable {
	font-family: "Plus Jakarta Sans", "Segoe UI", sans-serif !important;
}

/* Font sizes */
body { font-size: 13px !important; }
h1   { font-size: 1.6rem !important; }
h2   { font-size: 1.3rem !important; }
h3   { font-size: 1.05rem !important; }
h4, h5, h6 { font-size: 0.9rem !important; }
.navbar .nav-link, .navbar-brand { font-size: 12px !important; }
.breadcrumb { font-size: 11px !important; }
td, th { font-size: 12px !important; }
.btn  { font-size: 12px !important; }

/* Background — page regions */
body, #page, #page-content, .pagelayout-incourse {
	background-color: var(--theme-page-secondary, #f7f7f7) !important;
}

/* Content area backgrounds — fixes white-on-white in dark mode */
#region-main,
.region-main-content,
div[role="main"] {
	background-color: var(--theme-page-secondary, #f7f7f7) !important;
}

/* Card / box backgrounds */
.card, .generalbox, .box, #intro {
	background-color: var(--theme-page, #ffffff) !important;
	border-color: var(--theme-edge, #e5e5e5) !important;
}

/* Table borders */
.generaltable,
.submissionsummarytable {
	border-color: var(--theme-edge, #e5e5e5) !important;
}

/* Reset plain cells only — preserve Moodle's status tints (overdue, submitted, graded) */
.generaltable td:not([class*="overdue"]):not([class*="submission"]):not([class*="graded"]):not([class*="early"]),
.generaltable th,
.submissionsummarytable td:not([class*="overdue"]):not([class*="submission"]):not([class*="graded"]):not([class*="early"]),
.submissionsummarytable th {
	background-color: var(--theme-page, #ffffff) !important;
	border-color: var(--theme-edge, #e5e5e5) !important;
}

/* Text colors — override Moodle's hardcoded values */
body,
p, li, blockquote, label,
div[role="main"], div[role="main"] * {
	color: var(--theme-content, #3c3c3c) !important;
}

h1, h2, h3, h4, h5, h6 {
	color: var(--theme-content, #3c3c3c) !important;
}

td, th {
	color: var(--theme-content, #3c3c3c) !important;
	border-color: var(--theme-edge, #e5e5e5) !important;
}

.text-muted, .dimmed_text, small {
	color: var(--theme-content-muted, #afafaf) !important;
}

#page-header, #page-header * {
	color: var(--theme-content, #3c3c3c) !important;
	background-color: transparent !important;
}

/* Soft border-radius */
.card, .card-body          { border-radius: 14px !important; }
.generalbox, .box          { border-radius: 12px !important; }
.btn                       { border-radius: 8px !important; }
input, select, textarea    { border-radius: 8px !important; }
.table, table.generaltable { border-radius: 10px !important; overflow: hidden !important; }
.popover                   { border-radius: 12px !important; }
.dropdown-menu             { border-radius: 10px !important; }
.alert                     { border-radius: 10px !important; }
.badge                     { border-radius: 6px !important; }

/* Links */
a { color: var(--theme-primary, #58cc02) !important; }

/* ── Buttons ─────────────────────────────────────────────────────── */

/* Primary — use double-class for higher specificity than Bootstrap */
.btn.btn-primary {
	background-color: var(--theme-primary, #58cc02) !important;
	border-color: var(--theme-primary, #58cc02) !important;
	color: var(--theme-on-primary, #ffffff) !important;
}
.btn.btn-primary:hover,
.btn.btn-primary:focus {
	background-color: var(--theme-primary-dark, #46a302) !important;
	border-color: var(--theme-primary-dark, #46a302) !important;
	color: var(--theme-on-primary, #ffffff) !important;
}

/* Secondary / Default — page-secondary avoids blending into page bg in Noir/Paper */
.btn.btn-secondary,
.btn.btn-default {
	background-color: var(--theme-page-secondary, #f7f7f7) !important;
	border-color: var(--theme-edge, #e5e5e5) !important;
	color: var(--theme-content, #3c3c3c) !important;
}
.btn.btn-secondary:hover,
.btn.btn-secondary:focus,
.btn.btn-default:hover,
.btn.btn-default:focus {
	background-color: var(--theme-edge, #e5e5e5) !important;
	border-color: var(--theme-primary, #58cc02) !important;
	color: var(--theme-content, #3c3c3c) !important;
}

/* Light — same as secondary */
.btn.btn-light {
	background-color: var(--theme-page-secondary, #f7f7f7) !important;
	border-color: var(--theme-edge, #e5e5e5) !important;
	color: var(--theme-content, #3c3c3c) !important;
}

/* Outline variants */
.btn.btn-outline-primary {
	border-color: var(--theme-primary, #58cc02) !important;
	color: var(--theme-primary, #58cc02) !important;
	background-color: transparent !important;
}
.btn.btn-outline-primary:hover,
.btn.btn-outline-primary:focus {
	background-color: var(--theme-primary, #58cc02) !important;
	color: var(--theme-on-primary, #ffffff) !important;
}
.btn.btn-outline-secondary {
	border-color: var(--theme-edge, #e5e5e5) !important;
	color: var(--theme-content-muted, #afafaf) !important;
	background-color: transparent !important;
}
.btn.btn-outline-secondary:hover,
.btn.btn-outline-secondary:focus {
	background-color: var(--theme-page-secondary, #f7f7f7) !important;
	color: var(--theme-content, #3c3c3c) !important;
}

/* Link */
.btn.btn-link {
	color: var(--theme-primary, #58cc02) !important;
	background-color: transparent !important;
	border-color: transparent !important;
}
.btn.btn-link:hover {
	color: var(--theme-primary-dark, #46a302) !important;
}

/* Semantic */
.btn.btn-danger  { background-color: var(--theme-danger, #ff4b4b) !important; border-color: var(--theme-danger, #ff4b4b) !important; color: #ffffff !important; }
.btn.btn-success { background-color: var(--theme-success, #58cc02) !important; border-color: var(--theme-success, #58cc02) !important; color: #ffffff !important; }
.btn.btn-warning { background-color: var(--theme-highlight, #ffc800) !important; border-color: var(--theme-highlight, #ffc800) !important; color: #1a1a1a !important; }
.btn.btn-info    { background-color: var(--theme-primary, #58cc02) !important; border-color: var(--theme-primary, #58cc02) !important; color: var(--theme-on-primary, #ffffff) !important; }

/* Disabled */
.btn:disabled,
.btn.disabled {
	opacity: 0.45 !important;
	cursor: not-allowed !important;
}

/* Focus ring */
.btn:focus {
	box-shadow: 0 0 0 3px color-mix(in srgb, var(--theme-primary, #58cc02) 25%, transparent) !important;
	outline: none !important;
}

/* ── Navbar ─────────────────────────────────────────────────────── */
.navbar.fixed-top {
	background: var(--theme-page, #ffffff) !important;
	border-bottom: 1px solid var(--theme-edge, #e5e5e5) !important;
	box-shadow: none !important;
	border-radius: 0 !important;
	padding: 0 12px !important;
	min-height: 48px !important;
}

.navbar-brand {
	color: var(--theme-primary, #58cc02) !important;
	padding: 0 8px !important;
	display: inline-flex !important;
	align-items: center !important;
}

.navbar .nav-link {
	color: var(--theme-content-muted, #afafaf) !important;
}

.navbar .nav-link:hover,
.navbar .nav-link:focus {
	color: var(--theme-primary, #58cc02) !important;
}

.navbar .dropdown-menu {
	border-color: var(--theme-edge, #e5e5e5) !important;
	background: var(--theme-page, #ffffff) !important;
	box-shadow: 0 4px 16px rgba(0,0,0,0.08) !important;
}

.navbar .dropdown-item {
	color: var(--theme-content, #3c3c3c) !important;
	font-size: 12px !important;
}

.navbar .dropdown-item:hover {
	background: var(--theme-page-secondary, #f7f7f7) !important;
	color: var(--theme-primary, #58cc02) !important;
}

/* ── Sceless theme select in navbar ─────────────────────────────── */
.sceless-theme-li {
	display: flex !important;
	align-items: center !important;
	padding: 0 6px !important;
}

.sceless-theme-select {
	appearance: none !important;
	padding: 4px 9px !important;
	border: 1px solid var(--theme-edge, #e5e5e5) !important;
	border-radius: 8px !important;
	background: var(--theme-page-secondary, #f7f7f7) !important;
	color: var(--theme-content-muted, #afafaf) !important;
	font-size: 10px !important;
	font-weight: 700 !important;
	letter-spacing: 0.04em !important;
	cursor: pointer !important;
	font-family: "Plus Jakarta Sans", "Segoe UI", sans-serif !important;
}

.sceless-theme-select:hover {
	border-color: var(--theme-primary, #58cc02) !important;
}

/* ── Scrollbar ───────────────────────────────────────────────────── */
* {
	scrollbar-width: thin;
	scrollbar-color: var(--theme-edge, #e5e5e5) transparent;
}

*::-webkit-scrollbar {
	width: 6px;
	height: 6px;
}

*::-webkit-scrollbar-track {
	background: transparent;
}

*::-webkit-scrollbar-thumb {
	background: var(--theme-edge, #e5e5e5);
	border-radius: 3px;
}

*::-webkit-scrollbar-thumb:hover {
	background: var(--theme-content-muted, #afafaf);
}

/* Footer / server clock */
#page-footer,
#page-footer *,
.servertime,
.footer,
.footer * {
	color: var(--theme-content-muted, #afafaf) !important;
	background-color: transparent !important;
}

/* Moodle block_progress server time input */
input.clock,
#block_progress_serverTime {
	color: var(--theme-content, #3c3c3c) !important;
	background-color: transparent !important;
	border: none !important;
}

/* Preserve Moodle's original text color inside status-tinted cells */
.generaltable td[class*="overdue"],
.generaltable td[class*="overdue"] *,
.generaltable td[class*="submission"],
.generaltable td[class*="submission"] *,
.generaltable td[class*="graded"],
.generaltable td[class*="graded"] *,
.generaltable td[class*="early"],
.generaltable td[class*="early"] *,
.submissionsummarytable td[class*="overdue"],
.submissionsummarytable td[class*="overdue"] *,
.submissionsummarytable td[class*="submission"],
.submissionsummarytable td[class*="submission"] *,
.submissionsummarytable td[class*="graded"],
.submissionsummarytable td[class*="graded"] *,
.submissionsummarytable td[class*="early"],
.submissionsummarytable td[class*="early"] * {
	color: #333333 !important;
}
	`;

	document.head.appendChild(style);
}

function injectNavbarMods() {
	// ── Replace brand with Sceless logo ───────────────────────────
	const brand = document.querySelector<HTMLAnchorElement>(".navbar-brand");
	if (brand) {
		brand.innerHTML = "";
		const logoMount = document.createElement("span");
		logoMount.style.cssText = "display:inline-flex;align-items:center;height:100%;color:inherit;";
		renderPreact(
			h(Logo, {
				style: "width:80px;height:auto;display:block;",
				"aria-hidden": "true",
			}),
			logoMount,
		);
		brand.appendChild(logoMount);
	}

	// ── Inject theme selector into usernav ────────────────────────
	const usernav = document.querySelector<HTMLElement>("ul.usernav");
	if (!usernav) return;

	const li = document.createElement("li");
	li.className = "nav-item sceless-theme-li";

	const select = document.createElement("select");
	select.className = "sceless-theme-select";

	defaultThemes.forEach((t) => {
		const opt = document.createElement("option");
		opt.value = t.name;
		opt.textContent = t.name;
		select.appendChild(opt);
	});

	select.value = theme.value.name;

	select.addEventListener("change", () => {
		const found = defaultThemes.find((t) => t.name === select.value);
		if (found) changeTheme(found);
	});

	// Keep select in sync if theme changes from elsewhere
	theme.subscribe((t) => {
		select.value = t.name;
	});

	li.appendChild(select);
	usernav.prepend(li);
}

export default defineContentScript({
	matches: [
		"*://scele.cs.ui.ac.id/mod/**",
		"*://scele.cs.ui.ac.id/course/**",
		"*://scele.cs.ui.ac.id/enrol/**",
		"*://scele.cs.ui.ac.id/user/**",
	],
	excludeMatches: ["*://scele.cs.ui.ac.id/mod/quiz/review.php*"],
	runAt: "document_end",
	cssInjectionMode: "manual",

	async main() {
		// Don't run on pages where the Sceless SPA has taken over
		if (document.documentElement.hasAttribute('data-sceless-spa')) return;

		const enabled = (await sceleModStorage.getValue()) ?? true;
		if (!enabled) return;

		await initializeTheme();
		injectFont();
		injectStyles();
		injectNavbarMods();
	},
});
