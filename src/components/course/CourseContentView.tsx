import { useState, useEffect, useRef } from "preact/hooks";
import {
	ChevronDown,
	ChevronRight,
	FileText,
	ClipboardList,
	MessageSquare,
	PlayCircle,
	FolderOpen,
	Lock,
	Hash,
	FileQuestion,
	Check,
	Info,
	ExternalLink,
	GraduationCap,
	FileDown,
	ListChecks,
	BookMarked,
} from "lucide-preact";
import { SCELE_URL } from "../../config";
import { sanitizeHtml } from "../../utils/sanitize";
import { CourseSection, CourseModule, getModuleDueDate, formatDueDate } from "../../types/course";
import { theme } from "../../stores/theme";
import type { ModuleTypeColors } from "../../types/themes";

interface ModuleTypeConfig {
	icon: any;
	label: string;
	colorKey: keyof ModuleTypeColors;
}

const moduleTypeConfigs: Record<string, ModuleTypeConfig> = {
	assign:        { icon: ClipboardList, label: "Assignment",    colorKey: "assign"        },
	quiz:          { icon: FileQuestion,  label: "Quiz",          colorKey: "quiz"          },
	forum:         { icon: MessageSquare, label: "Forum",         colorKey: "forum"         },
	resource:      { icon: FileDown,      label: "File",          colorKey: "resource"      },
	folder:        { icon: FolderOpen,    label: "Folder",        colorKey: "folder"        },
	page:          { icon: FileText,      label: "Page",          colorKey: "page"          },
	url:           { icon: ExternalLink,  label: "External Link", colorKey: "url"           },
	lesson:        { icon: GraduationCap, label: "Lesson",        colorKey: "lesson"        },
	choice:        { icon: ListChecks,    label: "Choice",        colorKey: "choice"        },
	book:          { icon: BookMarked,    label: "Book",          colorKey: "book"          },
	imscp:         { icon: PlayCircle,    label: "Media",         colorKey: "media"         },
	questionnaire: { icon: ListChecks,    label: "Questionnaire", colorKey: "questionnaire" },
	label:         { icon: FileText,      label: "Label",         colorKey: "unknown"       },
};

const fallbackConfig: ModuleTypeConfig = { icon: FileText, label: "Resource", colorKey: "unknown" };

function getTypeConfig(modname: string): ModuleTypeConfig {
	return moduleTypeConfigs[modname.toLowerCase()] ?? fallbackConfig;
}

function hexToRgba(hex: string, alpha: number): string {
	const h = hex.replace("#", "");
	const r = parseInt(h.slice(0, 2), 16);
	const g = parseInt(h.slice(2, 4), 16);
	const b = parseInt(h.slice(4, 6), 16);
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getModuleColor(colorKey: keyof ModuleTypeColors): string {
	return theme.value.moduleColors[colorKey];
}

function decodeHtml(html: string): string {
	const txt = document.createElement("textarea");
	txt.innerHTML = html;
	return txt.value;
}

// View Mode Selector
export function ViewModeSelector({
	mode,
	onChange,
}: {
	mode: string;
	onChange: (mode: string) => void;
}) {
	return (
		<div class="flex items-center gap-2">
			<span class="text-sm font-medium text-content-muted">View:</span>
			<div class="flex rounded-lg border-2 border-edge overflow-hidden">
				{[
					{ key: "chronological", label: "Normal" },
					{ key: "grouped",       label: "By Type" },
					{ key: "newest",        label: "By Newest" },
				].map(({ key, label }) => (
					<button
						key={key}
						onClick={() => onChange(key)}
						class={`px-3 py-1.5 text-sm font-semibold transition-colors ${
							mode === key ? "bg-primary text-on-primary" : "text-content-muted hover:bg-primary/10"
						}`}
					>
						{label}
					</button>
				))}
			</div>
		</div>
	);
}

function fastScrollTo(el: Element, duration = 150) {
	let parent = el.parentElement;
	while (parent) {
		const ov = getComputedStyle(parent).overflowY;
		if (ov === "auto" || ov === "scroll") break;
		parent = parent.parentElement;
	}
	const container = parent ?? document.documentElement;
	const containerRect = container.getBoundingClientRect();
	const elRect = el.getBoundingClientRect();
	const start = container.scrollTop;
	const target = start + elRect.top - containerRect.top - 16;
	const diff = target - start;
	let t0: number | null = null;
	const step = (ts: number) => {
		if (!t0) t0 = ts;
		const p = Math.min((ts - t0) / duration, 1);
		container.scrollTop = start + diff * (1 - (1 - p) ** 3);
		if (p < 1) requestAnimationFrame(step);
	};
	requestAnimationFrame(step);
}

function replaceImagesWithPlaceholder(html: string): string {
	return html.replace(
		/<img([^>]*)>/gi,
		'<div class="flex items-center gap-2 p-2 my-2 bg-page rounded-lg text-sm text-content-muted"><svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg><span>Image (not supported by Sceless)</span></div>'
	);
}

// Chronological View
export function ChronologicalView({ sections, newModuleIds = [] }: { sections: CourseSection[]; newModuleIds?: number[] }) {
	const visibleSections = sections.filter((s) => s.visible && s.uservisible !== false);
	const scrollRef = useRef<HTMLDivElement>(null);
	const tocRef = useRef<HTMLDivElement>(null);
	const [activeSection, setActiveSection] = useState<number | null>(visibleSections[0]?.section ?? null);
	const scrollLockRef = useRef(false);

	// Auto-scroll TOC to keep active item visible
	useEffect(() => {
		if (!tocRef.current || activeSection === null) return;
		const btn = tocRef.current.querySelector(`[data-section="${activeSection}"]`);
		if (btn) (btn as HTMLElement).scrollIntoView({ block: "nearest", behavior: "smooth" });
	}, [activeSection]);

	// Track active section while scrolling via IntersectionObserver
	useEffect(() => {
		if (!scrollRef.current) return;
		const els = visibleSections.map((s) => scrollRef.current!.querySelector(`#section-${s.section}`)).filter(Boolean) as Element[];
		if (!els.length) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (scrollLockRef.current) return;
				for (const entry of entries) {
					if (entry.isIntersecting) {
						const sectionNum = parseInt(entry.target.id.replace("section-", ""), 10);
						setActiveSection(sectionNum);
					}
				}
			},
			{ root: scrollRef.current, threshold: 0.15 }
		);
		els.forEach((el) => observer.observe(el));
		return () => observer.disconnect();
	}, [visibleSections.length]);

	const scrollToSection = (sectionNum: number) => {
		const el = scrollRef.current?.querySelector(`#section-${sectionNum}`);
		if (!el) return;
		setActiveSection(sectionNum);
		scrollLockRef.current = true;
		fastScrollTo(el);
		setTimeout(() => { scrollLockRef.current = false; }, 300);
	};

	return (
		<div class="flex gap-4 h-full">
			{/* Independent TOC panel */}
			{visibleSections.length > 1 && (
				<div ref={tocRef} class="hidden lg:flex flex-col gap-1 shrink-0 w-36 overflow-y-auto scrollbar-thin py-0.5">
					{visibleSections.map((s) => (
						<button
							key={s.id}
							data-section={s.section}
							onClick={() => scrollToSection(s.section)}
							title={decodeHtml(s.name)}
							class={`cursor-pointer text-left text-xs px-2.5 py-1.5 rounded-lg truncate transition-all font-medium shrink-0 ${
								activeSection === s.section
									? "bg-primary text-on-primary"
									: "text-content-muted hover:bg-primary/10 hover:text-content"
							}`}
						>
							{decodeHtml(s.name)}
						</button>
					))}
				</div>
			)}

			{/* Section list — independent scroll */}
			<div ref={scrollRef} class="flex-1 min-w-0 overflow-y-auto scrollbar-thin space-y-3 pb-2">
				{visibleSections.map((section) => {
					const visibleModules = section.modules.filter((m) => m.visible);
					const accessibleCount = visibleModules.filter((m) => m.uservisible !== false).length;
					const restrictedCount = visibleModules.filter((m) => m.uservisible === false).length;
					const cleanSummary = replaceImagesWithPlaceholder(section.summary || "");

					return (
						<div key={section.id} id={`section-${section.section}`} class="rounded-xl border-2 border-edge overflow-hidden">
							{/* Section header */}
							<div class="px-4 py-3 bg-primary group/header">
								<div class="flex items-center gap-2">
									<span class="font-bold text-base text-on-primary">{decodeHtml(section.name)}</span>
									{accessibleCount > 0 && (
										<span class="text-xs px-2 py-0.5 rounded-full font-semibold bg-on-primary/15 text-on-primary">
											{accessibleCount}
										</span>
									)}
									{restrictedCount > 0 && (
										<span class="text-xs px-2 py-0.5 rounded-full font-semibold bg-on-primary/15 text-on-primary flex items-center gap-1">
											<Lock class="w-3 h-3" />{restrictedCount}
										</span>
									)}
									<a
										href={`#section-${section.section}`}
										onClick={(e) => {
											e.preventDefault();
											scrollToSection(section.section);
										}}
										class="ml-auto opacity-0 group-hover/header:opacity-100 transition-opacity text-on-primary/60 hover:text-on-primary"
										title="Jump to section"
									>
										<Hash class="w-4 h-4" />
									</a>
								</div>
							</div>

							<div class="divide-y-2 divide-edge bg-page-secondary">
								{cleanSummary && (
									<div
										class="px-4 py-3 text-sm text-content-muted bg-page/50 [&_a]:text-primary [&_a]:underline"
										dangerouslySetInnerHTML={{ __html: sanitizeHtml(cleanSummary) }}
									/>
								)}
								{visibleModules.length === 0 && !cleanSummary ? (
									<div class="px-4 py-6 text-center text-sm text-content-muted">No content in this section</div>
								) : (
									visibleModules.map((module) => (
										<ModuleItem key={module.id} module={module} isNew={newModuleIds.includes(module.id)} />
									))
								)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

// Grouped View
export function GroupedView({ sections, newModuleIds = [] }: { sections: CourseSection[]; newModuleIds?: number[] }) {
	const accessibleSections = sections.filter((s) => s.visible && s.uservisible !== false);

	const [expandedTypes, setExpandedTypes] = useState<string[]>([]);
	const toggleType = (type: string) =>
		setExpandedTypes((prev) => prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]);

	const modulesByType: Record<string, { module: CourseModule; sectionName: string }[]> = {};
	accessibleSections.forEach((section) => {
		section.modules.filter((m) => m.visible).forEach((module) => {
			const type = module.modname.toLowerCase();
			if (!modulesByType[type]) modulesByType[type] = [];
			modulesByType[type].push({ module, sectionName: section.name });
		});
	});

	const typeOrder = ["assign", "quiz", "resource", "folder", "page", "url", "lesson", "book", "imscp", "forum", "choice", "questionnaire", "label"];
	const typeInfoList = Object.entries(modulesByType)
		.map(([type, items]) => ({ type, config: getTypeConfig(type), items, count: items.length }))
		.sort((a, b) => {
			const ai = typeOrder.indexOf(a.type), bi = typeOrder.indexOf(b.type);
			return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
		});

	if (typeInfoList.length === 0) {
		return <div class="text-center py-8 text-content-muted">No course content available</div>;
	}

	return (
		<div class="h-full overflow-y-auto scrollbar-thin space-y-3 pb-2">
			{typeInfoList.map(({ type, config, items, count }) => {
				const Icon = config.icon;
				return (
					<div key={type} class="rounded-xl border-2 border-edge overflow-hidden">
						<button
							onClick={() => toggleType(type)}
							class="w-full flex items-center justify-between px-4 py-3 transition-colors"
						style={{ backgroundColor: hexToRgba(getModuleColor(config.colorKey), 0.12) }}
						>
							<div class="flex items-center gap-3">
								<div class="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: hexToRgba(getModuleColor(config.colorKey), 0.2) }}>
									<Icon class="w-4.5 h-4.5" style={{ color: getModuleColor(config.colorKey) }} />
								</div>
								<span class="font-bold text-sm text-content">{config.label}</span>
								<span class="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: hexToRgba(getModuleColor(config.colorKey), 0.2), color: getModuleColor(config.colorKey) }}>
									{count}
								</span>
							</div>
							{expandedTypes.includes(type)
								? <ChevronDown class="w-4 h-4 text-content-muted" />
								: <ChevronRight class="w-4 h-4 text-content-muted" />
							}
						</button>

						{expandedTypes.includes(type) && (
							<div class="divide-y-2 divide-edge bg-page-secondary">
								{items.map(({ module, sectionName }) => (
									<ModuleItem
										key={module.id}
										module={module}
										showSection={sections.length > 1}
										sectionName={sectionName}
										isNew={newModuleIds.includes(module.id)}
									/>
								))}
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
}

// Newest View
export function NewestView({ sections, newModuleIds = [] }: { sections: CourseSection[]; newModuleIds?: number[] }) {
	const now = Date.now();

	function getModuleTimestamp(module: CourseModule): number {
		if (module.dates && module.dates.length > 0)
			return Math.max(...module.dates.map((d) => d.timestamp * 1000));
		if (module.contentsinfo?.lastmodified)
			return module.contentsinfo.lastmodified * 1000;
		return 0;
	}

	const allModules = sections
		.filter((s) => s.visible && s.uservisible !== false)
		.flatMap((s) => s.modules.filter((m) => m.visible).map((m) => ({ module: m, sectionName: s.name })))
		.filter(({ module }) => module.modname.toLowerCase() !== "label")
		.map((item) => ({ ...item, ts: getModuleTimestamp(item.module) }))
		.filter(({ ts }) => ts > 0)
		.sort((a, b) => b.ts - a.ts);

	function getBucket(ts: number): string {
		const diff = now - ts;
		const day = 86400000;
		if (diff < day)         return "Today";
		if (diff < 2 * day)     return "Yesterday";
		if (diff < 7 * day)     return "This Week";
		if (diff < 14 * day)    return "Last Week";
		if (diff < 30 * day)    return "This Month";
		if (diff < 90 * day)    return "Last 3 Months";
		return "Older";
	}

	const bucketOrder = ["Today", "Yesterday", "This Week", "Last Week", "This Month", "Last 3 Months", "Older"];
	const grouped: Record<string, typeof allModules> = {};
	for (const item of allModules) {
		const b = getBucket(item.ts);
		if (!grouped[b]) grouped[b] = [];
		grouped[b].push(item);
	}

	if (allModules.length === 0) {
		return <div class="text-center py-8 text-content-muted">No dated content found</div>;
	}

	return (
		<div class="h-full overflow-y-auto scrollbar-thin space-y-3 pb-2">
			{bucketOrder.filter((b) => grouped[b]).map((bucket) => (
				<div key={bucket} class="rounded-xl border-2 border-edge overflow-hidden">
					<div class="px-4 py-2.5 bg-page-secondary border-b-2 border-edge">
						<span class="font-bold text-sm text-content">{bucket}</span>
						<span class="ml-2 text-xs text-content-muted">{grouped[bucket].length} item{grouped[bucket].length !== 1 ? "s" : ""}</span>
					</div>
					<div class="divide-y-2 divide-edge">
						{grouped[bucket].map(({ module, sectionName }) => (
							<ModuleItem
								key={module.id}
								module={module}
								showSection
								sectionName={sectionName}
								isNew={newModuleIds.includes(module.id)}
							/>
						))}
					</div>
				</div>
			))}
		</div>
	);
}

// Single Module Item
function ModuleItem({
	module,
	showSection = false,
	sectionName,
	isNew = false,
}: {
	module: CourseModule;
	showSection?: boolean;
	sectionName?: string;
	isNew?: boolean;
}) {
	const [showDesc, setShowDesc] = useState(false);
	const config = getTypeConfig(module.modname);
	const Icon = config.icon;
	const isRestricted = module.uservisible === false;
	const hasCompletion = module.completiondata?.hascompletion;
	const isCompleted = hasCompletion && module.completiondata!.state === 1;
	const indentClass = (module.indent ?? 0) > 0 ? "pl-8" : "";
	const dueDate = getModuleDueDate(module);
	const isOverdue = dueDate && dueDate < new Date();
	const modUrl = module.url || `${SCELE_URL}/mod/${module.modname}/view.php?id=${module.id}`;
	const cleanDesc = module.description ? replaceImagesWithPlaceholder(module.description) : null;

	// Labels render their HTML content inline — no link
	if (module.modname.toLowerCase() === "label") {
		return (
			<div class={`px-4 py-3 ${indentClass}`}>
				<div
					class="text-sm text-content [&_h3]:font-bold [&_h3]:mb-2 [&_h4]:font-bold [&_h4]:mb-1.5 [&_h5]:font-bold [&_h5]:mb-1 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:mb-2 [&_li]:mb-0.5 [&_table]:border-collapse [&_td]:border [&_td]:border-edge [&_td]:px-2 [&_td]:py-1 [&_strong]:font-semibold [&_a]:text-primary [&_a]:underline"
					dangerouslySetInnerHTML={{ __html: sanitizeHtml(module.description || "") }}
				/>
			</div>
		);
	}

	return (
		<div class={indentClass}>
			<a
				href={isRestricted ? undefined : modUrl}
				target="_blank"
				rel="noopener noreferrer"
				class={`flex items-start gap-3 px-4 py-3.5 transition-colors group ${
					isRestricted
						? "opacity-55 cursor-not-allowed"
						: "hover:bg-primary/5 cursor-pointer"
				}`}
				onClick={isRestricted ? (e) => e.preventDefault() : undefined}
			>
				{/* Colored type icon */}
				<div class="relative w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: hexToRgba(getModuleColor(config.colorKey), 0.15) }}>
					<Icon class="w-5 h-5" style={{ color: getModuleColor(config.colorKey) }} />
					{isCompleted && (
						<span class="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center shadow-sm">
							<Check class="w-2.5 h-2.5 text-white" strokeWidth={3} />
						</span>
					)}
				</div>

				{/* Text content */}
				<div class="flex-1 min-w-0">
					{/* Title row */}
					<div class="flex items-start gap-2">
						<p class={`font-semibold text-sm leading-snug ${isRestricted ? "text-content-muted" : "text-content"} ${module.noviewlink ? "" : "group-hover:text-primary transition-colors"}`}>
							{decodeHtml(module.name)}
						</p>
						{isNew && (
							<span class="shrink-0 mt-0.5 text-[10px] px-1.5 py-0.5 rounded font-bold bg-primary text-on-primary uppercase">
								New
							</span>
						)}
					</div>

					{/* Subtitle row */}
					<div class="flex items-center gap-2 mt-0.5 flex-wrap">
						<span class="text-xs font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: hexToRgba(getModuleColor(config.colorKey), 0.15), color: getModuleColor(config.colorKey) }}>
							{config.label}
						</span>
						{showSection && sectionName && (
							<span class="text-xs text-content-muted">· {sectionName}</span>
						)}
						{cleanDesc && !isRestricted && (
							<button
								onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowDesc(v => !v); }}
								class="text-xs text-primary hover:text-primary/70 font-medium flex items-center gap-0.5 pointer-events-auto"
							>
								<Info class="w-3 h-3" />
								{showDesc ? "less" : "info"}
							</button>
						)}
					</div>

					{/* Expandable description */}
					{showDesc && cleanDesc && (
						<div
							class="mt-2 p-3 rounded-lg bg-page text-sm text-content [&_a]:text-primary [&_a]:underline [&_p]:mb-1.5 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:mb-1.5 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:mb-1.5 [&_strong]:font-semibold [&_h3]:font-bold [&_h3]:mb-1 [&_h4]:font-semibold [&_h4]:mb-1 [&_table]:border-collapse [&_td]:border [&_td]:border-edge [&_td]:px-2 [&_td]:py-1 [&_li]:mb-0.5"
							dangerouslySetInnerHTML={{ __html: sanitizeHtml(cleanDesc) }}
						/>
					)}

					{/* Dates (Opened / Due / Closed) */}
					{module.dates && module.dates.length > 0 && !isRestricted && (
						<div class="flex items-center gap-2 mt-1.5 flex-wrap">
							{module.dates.map((d) => (
								<span key={d.label} class="text-xs text-content-muted">
									<span class="font-medium">{d.label}</span>{" "}
									{new Date(d.timestamp * 1000).toLocaleString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true })}
								</span>
							))}
						</div>
					)}

					{/* Availability restriction reason */}
					{isRestricted && module.availabilityinfo && (
						<div
							class="mt-1.5 text-xs text-content-muted italic [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-3 [&_ul]:mt-0.5 [&_li]:mt-0.5"
							dangerouslySetInnerHTML={{ __html: sanitizeHtml(module.availabilityinfo) }}
						/>
					)}
				</div>

				{/* Right side: due date + lock */}
				<div class="flex flex-col items-end gap-1.5 shrink-0 self-center">
					{dueDate && !isRestricted && (
						<span class={`text-xs px-2 py-1 rounded-lg font-semibold whitespace-nowrap ${
							isOverdue ? "bg-red-500/15 text-red-500" : "bg-primary/15 text-primary"
						}`}>
							{formatDueDate(dueDate)}
						</span>
					)}
					{isRestricted && <Lock class="w-4 h-4 text-content-muted" />}
				</div>
			</a>
		</div>
	);
}
