import { render } from "preact";
import App from "@/src/App";
import { enabledStorage } from "@/src/storage";
import { scrapeSceleData } from "@/src/utils/scraper";
import { SCELE_MATCHES } from "@/src/config";
import tailwindCss from "@/src/assets/tailwind.css?inline";

export default defineContentScript({
	matches: SCELE_MATCHES,
	runAt: "document_start",
	cssInjectionMode: "manual",

	async main() {
		// Synchronously hide the page before any paint to prevent FOUC.
		// document.head is null at document_start, so we use documentElement directly.
		document.documentElement.style.setProperty(
			"display",
			"none",
			"important",
		);

		const enabled = (await enabledStorage.getValue()) ?? true;

		if (!enabled) {
			document.documentElement.style.removeProperty("display"); // unhide — SCELE loads as normal
			console.log("[sceless] Extension disabled. Skipping.");
			return;
		}

		console.log("[sceless] Content script loaded.");

		const executePurge = () => {
			console.log("[sceless] Executing Clean Purge...");

			window.stop();

			const data = scrapeSceleData();

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
				render(<App data={data} />, root);
			}
		};

		if (document.readyState === "loading") {
			document.addEventListener("DOMContentLoaded", executePurge);
		} else {
			executePurge();
		}
	},
});
