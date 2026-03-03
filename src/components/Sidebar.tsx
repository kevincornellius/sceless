import { useEffect, useRef, useState } from "preact/hooks";
import type { InitialData } from "@/src/types/scele";
import {
	activeTab,
	closeTab,
	DashboardTab,
	navigate,
	openTabs,
	Tab,
} from "@/src/routing/router";

import {
	ChevronLeftIcon,
	ChevronRightIcon,
	LogOut,
	Moon,
	Sun,
	XIcon,
} from "lucide-preact";
import { Scroll } from "lucide-preact";
import { theme, toggleTheme } from "@/src/stores/theme";

const MIN_W = 64;
const MAX_W = 280;
const COLLAPSE_THRESHOLD = 72;
const DEFAULT_W = 192;

interface NavItemProps {
	icon: preact.VNode;
	label: string;
	active?: boolean;
	expanded: boolean;
	onClick: () => void;
}

const NavItem = ({ icon, label, active, expanded, onClick }: NavItemProps) => (
	<button
		type="button"
		onClick={onClick}
		title={!expanded ? label : undefined}
		class={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm font-medium transition-colors overflow-hidden cursor-pointer ${
			active
				? "bg-accent-soft text-accent-fg"
				: "text-content-secondary hover:bg-subtle hover:text-content"
		}`}
	>
		<span class="shrink-0">{icon}</span>
		{expanded && <span class="truncate text-left">{label}</span>}
	</button>
);

// --- Sidebar ---

const Sidebar = ({ data }: { data: InitialData }) => {
	const [width, setWidth] = useState(DEFAULT_W);
	const [animate, setAnimate] = useState(false);
	const dragging = useRef(false);
	const startX = useRef(0);
	const startW = useRef(0);

	const expanded = width > COLLAPSE_THRESHOLD;

	// Reading .value auto-subscribes this component to signal updates
	const currentTab = activeTab.value;
	const tabs = openTabs.value;

	const isActive = (tab: Tab) => {
		return tab.url === currentTab.url;
	};

	useEffect(() => {
		const onMouseMove = (e: MouseEvent) => {
			if (!dragging.current) return;
			const delta = e.clientX - startX.current;
			setWidth(Math.min(MAX_W, Math.max(MIN_W, startW.current + delta)));
		};
		const onMouseUp = () => {
			if (!dragging.current) return;
			dragging.current = false;
			document.body.style.cursor = "";
			document.body.style.userSelect = "";
			setWidth((w) => (w < COLLAPSE_THRESHOLD ? MIN_W : w));
		};
		document.addEventListener("mousemove", onMouseMove);
		document.addEventListener("mouseup", onMouseUp);
		return () => {
			document.removeEventListener("mousemove", onMouseMove);
			document.removeEventListener("mouseup", onMouseUp);
		};
	}, []);

	const onDragHandleMouseDown = (e: MouseEvent) => {
		e.preventDefault();
		setAnimate(false);
		dragging.current = true;
		startX.current = e.clientX;
		startW.current = width;
		document.body.style.cursor = "col-resize";
		document.body.style.userSelect = "none";
	};

	const toggleCollapse = () => {
		setAnimate(true);
		setWidth((w) => (w > COLLAPSE_THRESHOLD ? MIN_W : DEFAULT_W));
	};

	return (
		<aside
			style={{ width: `${width}px` }}
			class={`relative shrink-0 flex flex-col py-4 gap-1 overflow-hidden ${animate ? " transition-[width] duration-200" : ""}`}
		>
			{/* Brand + collapse */}
			<div class="flex items-center justify-between px-3 pb-3 mb-1">
				<button
					type="button"
					onClick={toggleCollapse}
					aria-label={
						expanded ? "Collapse sidebar" : "Expand sidebar"
					}
					class="shrink-0 p-1 rounded-md text-content-dim hover:text-content hover:bg-subtle transition-colors cursor-pointer"
				>
					{expanded ? (
						<ChevronLeftIcon size={16} />
					) : (
						<ChevronRightIcon size={16} />
					)}
				</button>
			</div>

			<div class="px-2 flex flex-col gap-0.5">
				<NavItem
					icon={<Scroll size={16} />}
					label="Dashboard"
					active={isActive(DashboardTab)}
					expanded={expanded}
					onClick={() => navigate(DashboardTab)}
				/>
			</div>

			{tabs.length > 0 && (
				<div class="flex flex-col px-2 mt-2">
					{expanded && (
						<p class="px-2 mb-1 text-xs font-medium text-content-dim uppercase tracking-wider">
							Open
						</p>
					)}
					{tabs.map((tab) => (
						<div
							key={tab.url}
							class={`group flex items-center gap-1 rounded-lg overflow-hidden transition-colors ${
								isActive(tab)
									? "bg-accent-soft"
									: "hover:bg-subtle"
							}`}
						>
							<button
								type="button"
								onClick={() => navigate(tab)}
								title={!expanded ? tab.title : undefined}
								class={`flex-1 flex items-center gap-2 px-2 py-2 text-sm font-medium overflow-hidden cursor-pointer ${
									isActive(tab)
										? "text-accent-fg"
										: "text-content-secondary"
								}`}
							>
								<span class="shrink-0">
									<Scroll size={16} />
								</span>
								{expanded && (
									<span class="truncate text-left">
										{tab.title}
									</span>
								)}
							</button>
							{expanded && (
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										closeTab(tab);
									}}
									class="shrink-0 mr-1 p-1 rounded text-content-dim hover:text-content-secondary hover:bg-subtle opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
									aria-label={`Close ${tab.title}`}
								>
									<XIcon size={16} />{" "}
								</button>
							)}
						</div>
					))}
				</div>
			)}

			<div class="flex-1" />

			<div class=" pt-3 px-2 flex flex-col gap-0.5">
				{expanded ? (
					<>
						<p class="px-2 text-xs font-semibold text-content truncate">
							{data.username}
						</p>
						<button
							type="button"
							onClick={toggleTheme}
							class="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-content-secondary hover:text-content hover:bg-subtle transition-colors cursor-pointer"
						>
							<span class="shrink-0">
								{theme.value === "dark" ? (
									<Sun size={16} />
								) : (
									<Moon size={16} />
								)}
							</span>
							{theme.value === "dark"
								? "Light mode"
								: "Dark mode"}
						</button>
						<a
							href={data.logoutUrl}
							class="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-danger hover:text-danger-hover hover:bg-danger-soft transition-colors"
						>
							<span class="shrink-0">
								<LogOut size={16} />
							</span>
							Log out
						</a>
					</>
				) : (
					<>
						<button
							type="button"
							onClick={toggleTheme}
							title={
								theme.value === "dark"
									? "Light mode"
									: "Dark mode"
							}
							class="flex justify-center p-1.5 rounded-lg text-content-secondary hover:text-content hover:bg-subtle transition-colors cursor-pointer"
						>
							{theme.value === "dark" ? (
								<Sun size={16} />
							) : (
								<Moon size={16} />
							)}
						</button>
						<a
							href={data.logoutUrl}
							title="Log out"
							class="flex justify-center p-1.5 rounded-lg text-danger hover:text-danger-hover hover:bg-danger-soft transition-colors cursor-pointer"
						>
							<LogOut size={16} />
						</a>
					</>
				)}
			</div>

			<div
				onMouseDown={onDragHandleMouseDown}
				class="absolute top-0 right-0 h-full w-1 cursor-col-resize hover:bg-edge-strong active:bg-accent transition-colors"
			/>
		</aside>
	);
};

export default Sidebar;
