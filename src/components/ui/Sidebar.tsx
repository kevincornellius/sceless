import { deleteTab, navigateTab } from "@/src/routing/router";
import { TabToUrl } from "@/src/helper/tabs";
import {
	activeTabKey,
	getTabKey,
	openTabs,
	openTabsLoaded,
	removeAll,
} from "@/src/stores/tabs";
import { pinnedCourses, pinnedCoursesLoaded } from "@/src/stores/pinned";
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
import { newModuleCounts } from "@/src/stores/seenModules";

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
		const newCount = tab.type === "course" ? ((newModuleCounts.value ?? {})[tab.id] ?? 0) : 0;
		const [tooltip, setTooltip] = useState<{ top: number; left: number } | null>(null);

		const handleMouseEnter = (e: MouseEvent) => {
			const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
			setTooltip({ top: rect.top + rect.height / 2, left: rect.right + 8 });
		};

		const handleMouseLeave = () => setTooltip(null);

		const handleClick = (e: MouseEvent) => {
			// Open in new tab with ctrl/cmd key
			if (e.ctrlKey || e.metaKey) {
				e.preventDefault();
				const url = TabToUrl(tab);
				window.open(url, "_blank");
				return;
			}
			// Prevent navigation if clicking on close button
			if ((e.target as HTMLElement).closest("button")) {
				return;
			}
			navigateTab(tab);
		};

		return (
			<>
			<a
				href={TabToUrl(tab)}
				onClick={(e) => {
					e.preventDefault();
					handleClick(e);
				}}
				onMouseEnter={handleMouseEnter}
				onMouseLeave={handleMouseLeave}
				target="_blank"
				class={`group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
					active
						? "bg-primary text-on-primary"
						: "text-content-muted hover:text-content hover:bg-primary/10"
				}`}
			>
				<Icon width={18} class="shrink-0" />
				{!expanded && newCount > 0 && (
					<span class="absolute bottom-1 right-1 w-3 h-3 text-[8px] font-bold rounded-full bg-primary text-on-primary flex items-center justify-center">
						{newCount > 9 ? "9+" : newCount}
					</span>
				)}
				{expanded ? (
					<>
						<span class="flex-1 text-left truncate pr-6">
							{tab.title}
						</span>
						{newCount > 0 && (
							<span class="shrink-0 min-w-4.5 h-4.5 text-[10px] font-bold rounded-full bg-primary text-on-primary flex items-center justify-center px-1">
								{newCount > 99 ? "99+" : newCount}
							</span>
						)}
						{closable && (
							<button
								onClick={(e) => {
									e.preventDefault();
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
								e.preventDefault();
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
			</a>
			{tooltip && (
				<div
					style={{
						position: "fixed",
						top: `${tooltip.top}px`,
						left: `${tooltip.left}px`,
						transform: "translateY(-50%)",
						zIndex: 9999,
					}}
					class="px-2.5 py-1 bg-content text-page text-xs font-semibold rounded-md shadow-lg pointer-events-none whitespace-nowrap"
				>
					{tab.title}
				</div>
			)}
			</>
		);
	};

	const Actions = () => {
		return (
			<div class="flex flex-col">
				{expanded && (
					<button
						type="button"
						class="text-xs font-semibold text-content-muted px-3 py-2 text-left hover:text-content transition-colors cursor-pointer"
					>
						OVERVIEW
					</button>
				)}
				<div class="flex flex-col gap-0.5 px-2">
					{ACTION_TABS.map((tab) => (
						<TabBar tab={tab} icon={LayoutDashboardIcon} closable={false} />
					))}
				</div>
				<span class="border-t border-edge mx-2 my-2" />
			</div>
		);
	};

	const PinnedTabs = () => {
			if (!pinnedCoursesLoaded.value || (pinnedCourses.value ?? []).length === 0) return null;

		const pinnedTabs = (pinnedCourses.value ?? []).map((course) => ({
			type: "course",
			id: String(course.id),
			title: course.code || course.title,
			url: TabToUrl({ type: "course", id: String(course.id), title: "", url: "" }),
		}));


		return (
			<div class="flex flex-col">
				{expanded && (
					<button
						type="button"
						class="text-xs font-semibold text-content-muted px-3 py-2 text-left hover:text-content transition-colors cursor-pointer"
					>
						PINNED COURSES
					</button>
				)}
				<div class="flex flex-col gap-0.5 px-2">
					{pinnedTabs.map((tab) => (
						<TabBar tab={tab} icon={BookOpen} closable={false} />
					))}
				</div>
				<span class="border-t border-edge mx-2 my-2" />
			</div>
		);
	};

	const OpenTabs = () => {
        if (!openTabsLoaded.value || !pinnedCoursesLoaded.value) return null;
		
        const pinnedTabKeys = new Set(
            (pinnedCourses.value ?? []).map((course) => {
                const dummyTab: Tab = { type: "course", id: String(course.id), title: "", url: "" };
                return getTabKey(dummyTab);
            })
        );

        const actionTabKeys = new Set(ACTION_TABS.map((t) => getTabKey(t)));

        const shownTabs = openTabs.value.filter((tab) => {
            const currentTabKey = getTabKey(tab);
            return !actionTabKeys.has(currentTabKey) && !pinnedTabKeys.has(currentTabKey);
        });

        if (shownTabs.length === 0) return null;
		return (
			<div class="flex flex-col">
				{expanded && (
					<div class="flex items-center justify-between px-3 py-2">
						<span class="text-xs font-semibold text-content-muted">
							OPENED
						</span>
						<button
							type="button"
							onClick={() => removeAll()}
							class="text-xs text-content-muted hover:text-danger transition-colors cursor-pointer"
							title="Close all tabs"
						>
							Close all
						</button>
					</div>
				)}
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
			<div class="flex-1 flex flex-col gap-1 overflow-y-auto scrollbar-thin" >
			<Actions />
			<PinnedTabs />
			<OpenTabs />
			</div>
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
