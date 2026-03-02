import { defineConfig } from "wxt";
import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";
import { h } from "preact";

// See https://wxt.dev/api/config.html
export default defineConfig({
	vite: () => ({
		css: {
			devSourcemap: false,
		},
		build: {
			assetsInlineLimit: 100000,
			sourcemap: false,
		},
		plugins: [preact(), tailwindcss()],
	}),
	webExt: {
		startUrls: [
			"https://scele.cs.ui.ac.id/",
			"https://scele.cs.ui.ac.id/login/index.php",
		],

		chromiumProfile: "./.wxt/chrome-profile",

		firefoxProfile: "./.wxt/firefox-profile",
		keepProfileChanges: true,
	},
	manifest: {
		permissions: ["storage", "tabs"],
	},
});
