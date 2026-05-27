import { useState, useEffect, useRef } from "preact/hooks";
import {
	BookOpen,
	ChevronDown,
	ChevronRight,
	FileText,
	ClipboardList,
	MessageSquare,
	Link,
	PlayCircle,
	Folder,
	Lock,
	HelpCircle,
	FileQuestion,
	Check,
	Info,
} from "lucide-preact";
import { SCELE_URL } from "../../config";
import { CourseSection, CourseModule, getModuleDueDate, formatDueDate } from "../../types/course";

// Module type to icon mapping
const moduleIcons: Record<string, any> = {
	resource: FileText,
	folder: Folder,
	page: FileText,
	assign: ClipboardList,
	quiz: FileQuestion,
	forum: MessageSquare,
	lesson: BookOpen,
	choice: HelpCircle,
	url: Link,
	book: BookOpen,
	imscp: PlayCircle,
	label: FileText,
};

const moduleTypeLabels: Record<string, string> = {
	resource: "Resources",
	folder: "Folders",
	page: "Pages",
	assign: "Assignments",
	quiz: "Quizzes",
	forum: "Forums",
	lesson: "Lessons",
	choice: "Choices",
	url: "External Links",
	book: "Books",
	imscp: "Media",
	label: "Labels",
};

function getModuleIcon(modname: string) {
	return moduleIcons[modname.toLowerCase()] || FileText;
}

function getModuleTypeLabel(modname: string) {
	return moduleTypeLabels[modname.toLowerCase()] || modname;
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
				<button
					onClick={() => onChange("chronological")}
					class={`px-3 py-1.5 text-sm font-semibold transition-colors ${
						mode === "chronological" ? "bg-primary text-on-primary" : "text-content-muted hover:bg-primary/10"
					}`}
				>
					Normal
				</button>
				<button
					onClick={() => onChange("grouped")}
					class={`px-3 py-1.5 text-sm font-semibold transition-colors ${
						mode === "grouped" ? "bg-primary text-on-primary" : "text-content-muted hover:bg-primary/10"
					}`}
				>
					By Type
				</button>
			</div>
		</div>
	);
}

// Replace images in injected HTML with placeholder (images require auth token)
function replaceImagesWithPlaceholder(html: string): string {
	return html.replace(
		/<img([^>]*)>/gi,
		'<div class="flex items-center gap-2 p-2 my-2 bg-page rounded-lg text-sm text-content-muted"><svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg><span>Image (not supported by Sceless)</span></div>'
	);
}

// Chronological View — always expanded (like normal Moodle)
export function ChronologicalView({ sections, newModuleIds = [] }: { sections: CourseSection[]; newModuleIds?: number[] }) {
	const visibleSections = sections.filter((s) => s.visible && s.uservisible !== false);
	const scrollRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const hash = window.location.hash;
		if (hash && hash.startsWith("#section-")) {
			const el = scrollRef.current?.querySelector(hash);
			if (el) {
				setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
			}
		}
	}, []);

	const handleContainerClick = (e: MouseEvent) => {
		const target = (e.target as HTMLElement).closest("a");
		if (!target) return;

		const href = target.getAttribute("href");
		if (!href) return;

		if (href.startsWith("#section-")) {
			e.preventDefault();
			const el = scrollRef.current?.querySelector(href);
			if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
			return;
		}
	};

	return (
		<div ref={scrollRef} class="space-y-3" onClick={handleContainerClick}>
			{visibleSections.map((section) => {
				const visibleModules = section.modules.filter((m) => m.visible);
				const moduleCount = visibleModules.filter((m) => m.uservisible !== false).length;
				const restrictedCount = visibleModules.filter((m) => m.uservisible === false).length;
				const cleanSummary = replaceImagesWithPlaceholder(section.summary || "");

				return (
					<div key={section.id} id={`section-${section.section}`} class="rounded-xl border-2 border-edge overflow-hidden bg-page-secondary">
						<div class="px-4 py-3 bg-page-secondary">
							<div class="flex items-center gap-2">
								<span class="font-semibold text-sm text-content">{section.name}</span>
								{moduleCount > 0 && (
									<span class="text-xs px-2 py-0.5 rounded font-semibold bg-primary/20 text-primary">
										{moduleCount} items
									</span>
								)}
								{restrictedCount > 0 && (
									<span class="text-xs px-2 py-0.5 rounded font-semibold bg-edge text-content-muted flex items-center gap-1">
										<Lock class="w-3 h-3" />
										{restrictedCount}
									</span>
								)}
							</div>
						</div>

						<div class="divide-y-2 divide-edge">
							{cleanSummary && (
								<div
									class="px-4 py-3 text-sm text-content-muted bg-page/50 [&_a]:text-primary [&_a]:underline"
									dangerouslySetInnerHTML={{ __html: cleanSummary }}
								/>
							)}
							{visibleModules.length === 0 && !cleanSummary ? (
								<div class="px-4 py-6 text-center text-sm text-content-muted">
									No content in this section
								</div>
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
	);
}

// Grouped View
export function GroupedView({ sections, newModuleIds = [] }: { sections: CourseSection[]; newModuleIds?: number[] }) {
	const uniqueTypes = [...new Set(
		sections
			.filter((s) => s.visible && s.uservisible !== false)
			.flatMap((s) => s.modules.filter((m) => m.visible).map((m) => m.modname.toLowerCase()))
	)];

	const [expandedTypes, setExpandedTypes] = useState<string[]>(uniqueTypes);

	const toggleType = (type: string) => {
		setExpandedTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
	};

	const modulesByType: Record<string, { module: CourseModule; sectionName: string }[]> = {};

	sections
		.filter((s) => s.visible && s.uservisible !== false)
		.forEach((section) => {
			section.modules
				.filter((m) => m.visible)
				.forEach((module) => {
					const type = module.modname.toLowerCase();
					if (!modulesByType[type]) {
						modulesByType[type] = [];
					}
					modulesByType[type].push({ module, sectionName: section.name });
				});
		});

	const typeInfoList = Object.entries(modulesByType).map(([type, items]) => ({
		type,
		label: getModuleTypeLabel(type),
		icon: getModuleIcon(type),
		items,
		count: items.length,
	}));

	const typeOrder = ["resource", "folder", "page", "assign", "quiz", "forum", "lesson", "choice", "url", "book", "imscp", "label"];
	typeInfoList.sort((a, b) => {
		const aIndex = typeOrder.indexOf(a.type);
		const bIndex = typeOrder.indexOf(b.type);
		return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
	});

	if (typeInfoList.length === 0) {
		return <div class="text-center py-8 text-content-muted">No course content available</div>;
	}

	return (
		<div class="space-y-3">
			{typeInfoList.map(({ type, label, icon: Icon, items, count }) => (
				<div key={type} class="rounded-xl border-2 border-edge overflow-hidden bg-page-secondary">
					<button
						onClick={() => toggleType(type)}
						class="w-full flex items-center justify-between px-4 py-3 bg-page-secondary hover:bg-page-secondary/80 transition-colors"
					>
						<div class="flex items-center gap-2">
							<div class="w-8 h-8 rounded-lg flex items-center justify-center bg-primary">
								<Icon class="w-4 h-4 text-on-primary" />
							</div>
							<span class="font-semibold text-sm text-content">{label}</span>
							<span class="text-xs px-2 py-0.5 rounded font-semibold bg-primary/20 text-primary">
								{count}
							</span>
						</div>
						{expandedTypes.includes(type) ? (
							<ChevronDown class="w-4 h-4 text-content-muted" />
						) : (
							<ChevronRight class="w-4 h-4 text-content-muted" />
						)}
					</button>

					{expandedTypes.includes(type) && (
						<div class="divide-y-2 divide-edge">
							{items.map(({ module, sectionName }) => (
								<ModuleItem key={module.id} module={module} showSection={sections.length > 1} sectionName={sectionName} isNew={newModuleIds.includes(module.id)} />
							))}
						</div>
					)}
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
	const Icon = getModuleIcon(module.modname);
	const isRestricted = module.uservisible === false;
	const hasCompletion = module.completiondata?.hascompletion;
	const isCompleted = hasCompletion && module.completiondata!.state === 1;
	const indentClass = (module.indent ?? 0) > 0 ? "pl-10" : "";
	const dueDate = getModuleDueDate(module);
	const isOverdue = dueDate && dueDate < new Date();
	const modUrl = module.url || `${SCELE_URL}/mod/${module.modname}/view.php?id=${module.id}`;
	const cleanDesc = module.description ? replaceImagesWithPlaceholder(module.description) : null;

	// Labels render their HTML content inline — no clickable link
	if (module.modname.toLowerCase() === "label") {
		return (
			<div class={`px-4 py-3 border-b-2 border-edge last:border-b-0 ${indentClass}`}>
				<div
					class="text-sm text-content [&_h3]:font-bold [&_h3]:mb-2 [&_p]:mb-2 [&_table]:border-collapse [&_td]:border [&_td]:border-edge [&_td]:px-2 [&_td]:py-1 [&_strong]:font-semibold [&_a]:text-primary [&_a]:underline"
					dangerouslySetInnerHTML={{ __html: module.description || "" }}
				/>
			</div>
		);
	}

	return (
		<div class={`${indentClass}`}>
			<a
				href={modUrl}
				target="_blank"
				rel="noopener noreferrer"
				class={`flex items-start gap-3 px-4 py-3 transition-colors ${
					isRestricted
						? "opacity-60 cursor-default pointer-events-none"
						: "hover:bg-primary/5 cursor-pointer"
				}`}
				onClick={isRestricted ? (e) => e.preventDefault() : undefined}
			>
				{/* Icon with completion state */}
				<div class={`relative w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
					isCompleted ? "bg-primary/15" : "bg-page"
				}`}>
					<Icon class={`w-5 h-5 ${isCompleted ? "text-primary" : "text-content-muted"}`} />
					{isCompleted && (
						<span class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
							<Check class="w-2.5 h-2.5 text-on-primary" strokeWidth={3} />
						</span>
					)}
				</div>

				{/* Content */}
				<div class="flex-1 min-w-0">
					<div class="flex items-center gap-2 flex-wrap">
						<p class="font-semibold text-sm text-content truncate">{module.name}</p>
						{isNew && (
							<span class="shrink-0 text-[10px] px-1.5 py-0.5 rounded font-bold bg-primary text-on-primary uppercase">
								New
							</span>
						)}
					</div>
					<div class="flex items-center gap-2 mt-0.5 flex-wrap">
						<p class="text-xs font-medium text-content-muted">
							{getModuleTypeLabel(module.modname)}{showSection && sectionName ? ` · ${sectionName}` : ""}
						</p>
						{cleanDesc && !isRestricted && (
							<button
								onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowDesc(v => !v); }}
								class="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-0.5 pointer-events-auto"
							>
								<Info class="w-3 h-3" />
								{showDesc ? "less" : "info"}
							</button>
						)}
					</div>

					{/* Expandable description */}
					{showDesc && cleanDesc && (
						<div
							class="mt-2 p-3 rounded-lg bg-page text-sm text-content [&_a]:text-primary [&_a]:underline [&_p]:mb-1.5 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:mb-1.5 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:mb-1.5 [&_strong]:font-semibold [&_h3]:font-bold [&_h3]:mb-1 [&_table]:border-collapse [&_td]:border [&_td]:border-edge [&_td]:px-2 [&_td]:py-1 [&_li]:mb-0.5"
							dangerouslySetInnerHTML={{ __html: cleanDesc }}
						/>
					)}

					{/* Availability restriction info */}
					{isRestricted && module.availabilityinfo && (
						<div
							class="mt-1 text-xs text-content-muted [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-3 [&_li]:mt-0.5"
							dangerouslySetInnerHTML={{ __html: module.availabilityinfo }}
						/>
					)}
				</div>

				{/* Due date */}
				{dueDate && !isRestricted && (
					<span class={`text-xs px-2 py-1 rounded-lg font-semibold flex-shrink-0 self-center ${
						isOverdue ? "bg-danger text-white" : "bg-primary/20 text-primary"
					}`}>
						{formatDueDate(dueDate)}
					</span>
				)}

				{/* Lock icon for restricted modules */}
				{isRestricted && <Lock class="w-4 h-4 text-content-muted flex-shrink-0 self-center" />}
			</a>
		</div>
	);
}
