import { defineConfig } from "wxt";
import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

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
			"https://scele.cs.ui.ac.id/my",
			"https://scele.cs.ui.ac.id/login/index.php",
		],

		chromiumProfile: path.resolve(process.cwd(), "./.chrome-profile"),

		firefoxProfile: path.resolve(process.cwd(), "./.firefox-profile"),
		keepProfileChanges: true,
	},
	manifest: {
		name: "Sceless",
		permissions: ["storage", "tabs"],
		icons: {
			16: "icon-16.png",
			48: "icon-48.png",
			128: "icon-128.png",
		},
		browser_specific_settings: {
			gecko: {
				id: "sceless@cornellius.dev",
				data_collection_permissions: {
					required: ["none"],
					optional: [],
				},
			} as object,
		},
	},
});
