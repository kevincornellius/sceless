import { render } from "preact";
import App from "@/src/App";
import tailwindCss from "@/src/assets/tailwind.css?inline";
import { enabledStorage } from "@/src/storage";

export default defineContentScript({
	matches: ["*://scele.cs.ui.ac.id/mod/quiz/review.php*"],
	runAt: "document_start",
	cssInjectionMode: "manual",

	async main() {
		const enabled = (await enabledStorage.getValue()) ?? true;

		if (!enabled) {
			return;
		}

		document.documentElement.style.setProperty("display", "none", "important");

		const executePurge = () => {
			window.stop();
			document.body.innerHTML = '<div id="sceless-root"></div>';

			document.head
				.querySelectorAll('link[rel="stylesheet"], script, style')
				.forEach((el) => el.remove());

			document.documentElement.style.removeProperty("display");

			const styleElement = document.createElement("style");
			styleElement.textContent = tailwindCss;
			document.head.appendChild(styleElement);

			const root = document.getElementById("sceless-root");
			if (root) {
				render(<App />, root);
			}
		};

		if (document.body) {
			executePurge();
		} else {
			document.addEventListener("DOMContentLoaded", executePurge);
		}
	},
});