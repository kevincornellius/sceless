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
				<div class="flex-1 overflow-hidden p-4 pl-0 pt-0">
					<div class="rounded-2xl overflow-hidden border-2 border-edge h-full">
						<main class="flex-1 overflow-y-auto bg-page h-full scrollbar-thin">
							{children}
						</main>
					</div>
				</div>
			</div>
		</div>
	);
}
