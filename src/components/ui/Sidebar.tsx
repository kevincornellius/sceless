import { deleteTab, navigateTab } from "@/src/routing/router";
import {
	activeTabKey,
	getTabKey,
	openTabs,
	openTabsLoaded,
} from "@/src/stores/tabs";
import { useEffect, useState } from "preact/hooks";
import { Logo, LogoL } from "./Logo";
import {
	BookOpen,
	ChevronLeft,
	LayoutDashboardIcon,
	Menu,
	X,
} from "lucide-preact";
import { ACTION_TABS } from "@/src/constants/navigation";
import { Tab } from "@/src/types/state";

const MIN_W = 56;
const MAX_W = 280;
const COLLAPSE_THRESHOLD = 150;
const DEFAULT_W = 210;

const Sidebar = () => {
	const [width, setWidth] = useState(DEFAULT_W);
	const [animate, setAnimate] = useState(false);
	const [isDragging, setIsDragging] = useState(false);

	const expanded = width > MIN_W;

	const handleMouseDown = (e: MouseEvent) => {
		if (!expanded) return;

		e.preventDefault();
		setAnimate(false);
		setIsDragging(true);

		document.body.style.cursor = "col-resize";
		document.body.style.userSelect = "none";
	};

	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			if (!isDragging) return;

			const newWidth = e.clientX;

			setWidth(Math.min(MAX_W, Math.max(COLLAPSE_THRESHOLD, newWidth)));
		};

		const handleMouseUp = () => {
			setIsDragging(false);
			document.body.style.cursor = "";
			document.body.style.userSelect = "";
		};

		if (isDragging) {
			document.addEventListener("mousemove", handleMouseMove);
			document.addEventListener("mouseup", handleMouseUp);
		}

		return () => {
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
		};
	}, [isDragging]);

	const toggleCollapse = () => {
		setAnimate(true);
		setWidth((w) => (w > MIN_W ? MIN_W : DEFAULT_W));
	};

	const Top = () => (
		<div
			class={`px-4 flex ${expanded ? "" : "pt-2 flex-col gap-4"} justify-between items-center overflow-hidden`}
		>
			{expanded ? (
				<Logo class="text-primary w-24 shrink-0" />
			) : (
				<LogoL class="text-primary w-24 shrink-0" />
			)}
			<div class="flex items-center justify-center">
				<button
					type="button"
					onClick={toggleCollapse}
					aria-label={
						expanded ? "Collapse sidebar" : "Expand sidebar"
					}
					class="shrink-0 p-1 rounded-md text-content-muted hover:text-content hover:bg-primary/20 transition-colors cursor-pointer"
				>
					{expanded ? (
						<ChevronLeft width={18} />
					) : (
						<Menu width={18} />
					)}
				</button>
			</div>
		</div>
	);

	const TabBar = ({ tab, icon, closable }: { tab: Tab; icon: any, closable: boolean }) => {
		const key = getTabKey(tab);
		const active = activeTabKey.value === key;
		const Icon = icon;

		return (
			<div
				onClick={() => navigateTab(tab)}
				class={`group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
					active
						? "bg-primary text-on-primary"
						: "text-content-muted hover:text-content hover:bg-primary/10"
				}`}
                title={tab.title}
			>
				<Icon width={18} class="shrink-0" />
				{expanded ? (
					<>
						<span class="flex-1 text-left truncate pr-6">
							{tab.title}
						</span>
						{closable && (
							<button
								onClick={(e) => {
									e.stopPropagation();
									deleteTab(key);
								}}
								class={`absolute right-2 p-1 rounded-md ${
									active 
										? "text-white/70 hover:text-white hover:bg-white/20" 
										: "text-content-muted hover:text-content hover:bg-primary/20"
								} transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center`}
								aria-label={`Close ${tab.title} tab`}
							>
								<X width={14} />
							</button>
						)}
					</>
				) : (
					closable && (
						<button
							onClick={(e) => {
								e.stopPropagation();
								deleteTab(key);
							}}
							class={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] flex items-center justify-center transition-all opacity-0 group-hover:opacity-100
								bg-danger text-white hover:bg-danger/80`}
							aria-label={`Close ${tab.title} tab`}
						>
							<X width={8} />
						</button>
					)
				)}
			</div>
		);
	};

	const Actions = () => {
		return (
			<div class="flex flex-col">
				{expanded && (
					<h1 class="text-xs font-semibold text-content-muted px-3 py-2">
						OVERVIEW
					</h1>
				)}
				<div class="flex flex-col gap-0.5 px-2">
					{ACTION_TABS.map((tab) => (
						<TabBar tab={tab} icon={LayoutDashboardIcon} closable={false} />
					))}
				</div>
			</div>
		);
	};

	const OpenTabs = () => {
		if (!openTabsLoaded.value) return null;

		const shownTabs = openTabs.value.filter(
			(tab) =>
				!ACTION_TABS.some((t) => getTabKey(t) === getTabKey(tab)) &&
				tab.type !== "pinned",
		);
		if (shownTabs.length === 0) return null;

		return (
			<div class="flex flex-col">
				<div class="flex flex-col gap-0.5 px-2">
					{shownTabs.map((tab) => (
						<TabBar
							key={getTabKey(tab)}
							tab={tab}
							icon={BookOpen}
							closable={true}
						/>
					))}
				</div>
			</div>
		);
	};

	return (
		<aside
			style={{ width: `${width}px` }}
			class={`relative shrink-0 flex flex-col py-2 gap-1 overflow-hidden ${animate ? " transition-[width] duration-200" : ""}`}
		>
			<Top />
			<Actions />
			<span class="border-t border-edge mx-2 my-2" />
			<OpenTabs />
			<div
				onMouseDown={handleMouseDown}
				class={`absolute top-0 right-0 h-full w-1 transition-colors ${
					expanded
						? "cursor-col-resize hover:bg-edge active:bg-primary"
						: "pointer-events-none opacity-0"
				}`}
			/>
		</aside>
	);
};

export default Sidebar;
