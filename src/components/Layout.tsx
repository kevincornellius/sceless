import type { ComponentChildren } from "preact";
import type { InitialData } from "@/src/types/scele";
import Sidebar from "./Sidebar";

interface LayoutProps {
	data: InitialData;
	children: ComponentChildren;
}

export function Layout({ data, children }: LayoutProps) {
	return (
		<div class="flex h-screen overflow-hidden bg-page text-content">
			<Sidebar data={data} />

			<main class="flex-1 overflow-y-auto bg-panel mr-4 my-4 rounded-lg shadow-sm">
				<div class="p-6">{children}</div>
			</main>
		</div>
	);
}
