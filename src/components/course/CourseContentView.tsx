import { useState, useEffect, useRef } from "preact/hooks";
import {
	BookOpen,
	ChevronDown,
	ChevronRight,
	FileText,
	ClipboardList,
	MessageSquare,
	Video,
	Download,
	Link,
	PlayCircle,
	Folder,
	Lock,
	HelpCircle,
	FileQuestion,
	AlertCircle,
	CheckCircle,
	Clock,
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

// Get icon for module type
function getModuleIcon(modname: string) {
	return moduleIcons[modname.toLowerCase()] || FileText;
}

// Get label for module type
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
	// Filter out invisible sections
	const visibleSections = sections.filter((s) => s.visible);
	const scrollRef = useRef<HTMLDivElement>(null);

	// Scroll to #section-N on mount if hash is present
	useEffect(() => {
		const hash = window.location.hash;
		if (hash && hash.startsWith("#section-")) {
			// section.section is the sequential number (e.g. 5 in #section-5)
			const el = scrollRef.current?.querySelector(hash);
			if (el) {
				setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
			}
		}
	}, []);

	// Event delegation: intercept anchor clicks in injected HTML for hash navigation
	const handleContainerClick = (e: MouseEvent) => {
		const target = (e.target as HTMLElement).closest("a");
		if (!target) return;

		const href = target.getAttribute("href");
		if (!href) return;

		// Hash navigation within the page (e.g. href="#section-5")
		if (href.startsWith("#section-")) {
			e.preventDefault();
			const el = scrollRef.current?.querySelector(href);
			if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
			return;
		}

		// External/other links: let browser handle them normally
	};

	return (
		<div ref={scrollRef} class="space-y-3" onClick={handleContainerClick}>
			{visibleSections.map((section) => {
				// Filter visible modules
				const visibleModules = section.modules.filter((m) => m.visible);
				const moduleCount = visibleModules.length;
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
							</div>
						</div>

						<div class="divide-y-2 divide-edge">
							{/* Summary — images replaced with placeholder (require auth token) */}
							{cleanSummary && (
								<div
									class="px-4 py-3 text-sm text-content-muted bg-page/50 [&_a]:text-primary [&_a]:underline"
									dangerouslySetInnerHTML={{ __html: cleanSummary }}
								/>
							)}
							{moduleCount === 0 && !cleanSummary ? (
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
	// Get unique types from sections
	const uniqueTypes = [...new Set(
		sections
			.filter((s) => s.visible)
			.flatMap((s) => s.modules.filter((m) => m.visible).map((m) => m.modname.toLowerCase()))
	)];

	const [expandedTypes, setExpandedTypes] = useState<string[]>(uniqueTypes);

	const toggleType = (type: string) => {
		setExpandedTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
	};

	// Flatten and group modules by type
	const modulesByType: Record<string, { module: CourseModule; sectionName: string }[]> = {};

	sections
		.filter((s) => s.visible)
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

	// Sort by type priority
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
	const Icon = getModuleIcon(module.modname);
	const modUrl = `${SCELE_URL}/mod/${module.modname}/view.php?id=${module.id}`;
	const dueDate = getModuleDueDate(module);
	const isOverdue = dueDate && dueDate < new Date();

	// Labels render their HTML content inline — no clickable link
	if (module.modname.toLowerCase() === "label") {
		return (
			<div class="px-4 py-3 border-b-2 border-edge last:border-b-0">
				<div
					class="text-sm text-content [&_h3]:font-bold [&_h3]:mb-2 [&_p]:mb-2 [&_table]:border-collapse [&_td]:border [&_td]:border-edge [&_td]:px-2 [&_td]:py-1 [&_strong]:font-semibold [&_a]:text-primary [&_a]:underline"
					dangerouslySetInnerHTML={{ __html: module.description || "" }}
				/>
			</div>
		);
	}

	return (
		<a
			href={modUrl}
			target="_blank"
			rel="noopener noreferrer"
			class="flex items-center gap-3 px-4 py-3 hover:bg-primary/5 transition-colors cursor-pointer"
		>
			<div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-page">
				<Icon class="w-5 h-5 text-content-muted" />
			</div>
			<div class="flex-1 min-w-0">
				<div class="flex items-center gap-2">
					<p class="font-semibold text-sm text-content truncate">{module.name}</p>
					{isNew && (
						<span class="shrink-0 text-[10px] px-1.5 py-0.5 rounded font-bold bg-primary text-on-primary uppercase">
							New
						</span>
					)}
				</div>
				<p class="text-xs font-medium text-content-muted">{getModuleTypeLabel(module.modname)}{showSection && sectionName ? ` · ${sectionName}` : ""}</p>
			</div>
			{dueDate && (
				<span class={`text-xs px-2 py-1 rounded-lg font-semibold flex-shrink-0 ${isOverdue ? "bg-danger text-white" : "bg-primary/20 text-primary"}`}>
					{formatDueDate(dueDate)}
				</span>
			)}
			{module.availability && module.availability.includes("unavailable") && (
				<Lock class="w-4 h-4 text-content-muted flex-shrink-0" />
			)}
		</a>
	);
}
