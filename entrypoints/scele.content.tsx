import { render } from "preact";
import App from "@/src/App";
import { ErrorBoundary } from "@/src/components/ErrorBoundary";
import { SCELE_EXCLUDES, SCELE_MATCHES } from "@/src/config";
import tailwindCss from "@/src/assets/tailwind.css?inline";
import { enabledStorage } from "@/src/storage";

export default defineContentScript({
	matches: SCELE_MATCHES,
	excludeMatches: SCELE_EXCLUDES,
	runAt: "document_start",
	cssInjectionMode: "manual",

	async main() {
		// Mark synchronously (before any await) so scele-mod can detect SPA takeover
		document.documentElement.setAttribute('data-sceless-spa', '');

		const enabled = (await enabledStorage.getValue()) ?? true;

		if (!enabled) {
			return;
		}

		document.documentElement.style.setProperty(
			"display",
			"none",
			"important",
		);

		
		const executePurge = () => {

			window.stop();

			// Initialize data

			document.body.innerHTML = '<div id="sceless-root"></div>';

			// Release memory
			document.head
				.querySelectorAll('link[rel="stylesheet"], script, style')
				.forEach((el) => el.remove());

			document.documentElement.style.removeProperty("display");

			// Inject Tailwind CSS
			const styleElement = document.createElement("style");
			styleElement.textContent = tailwindCss;
			document.head.appendChild(styleElement);

			const root = document.getElementById("sceless-root");
			if (root) {
				render(<ErrorBoundary><App /></ErrorBoundary>, root);
			}
		};

		if (document.body) {
			executePurge();
		} else {
			document.addEventListener("DOMContentLoaded", executePurge);
		}
	},
});
