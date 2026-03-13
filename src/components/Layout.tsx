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
			<div class="flex flex-col flex-1 min-w-0">
				<Navbar />
				<div className="flex-1 overflow-hidden p-4 pt-0">
					<div className="rounded-2xl overflow-hidden border-2 border-edge h-full">
						<main className="flex-1 overflow-y-auto bg-page scrollbar-thin h-full">
							{children}
						</main>
					</div>
				</div>
			</div>
		</div>
	);
}
