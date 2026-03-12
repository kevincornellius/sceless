import type { ComponentChildren } from "preact";
import Sidebar from "./ui/Sidebar";
import Navbar from "./ui/Navbar";

interface LayoutProps {
	children: ComponentChildren;
}

export function Layout({ children }: LayoutProps) {
	return (
		<div class="flex h-screen overflow-hidden bg-page-secondary text-content">
			<Sidebar />
			<div class="flex flex-col w-full h-full">
				<Navbar />
				<main class="flex-1 overflow-y-auto bg-page mr-4 my-2 rounded-2xl border-2 border-edge">
					<div class="p-6">{children}</div>
				</main>
			</div>
		</div>
	);
}
