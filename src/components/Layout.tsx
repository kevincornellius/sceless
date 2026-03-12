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
				<div className="rounded-2xl overflow-hidden border-2 border-edge mr-4 mb-4 h-full">
				<main className="flex-1 overflow-y-auto bg-page scrollbar-thin h-full">
					{children}
				</main>
				</div>
			</div>
		</div>
	);
}
