import type { ComponentChildren } from "preact";
import type { initialData } from "@/src/types/scele";
import Sidebar from "./Sidebar";

interface LayoutProps {
	data: initialData;
	children: ComponentChildren;
}

export function Layout({ data, children }: LayoutProps) {
	return (
		<div class="flex min-h-screen bg-gray-50 text-gray-900">
			<Sidebar data={data} />

			<main class="flex-1 overflow-auto  bg-white mr-4 my-4 rounded-lg ">
				{children}
			</main>
		</div>
	);
}
