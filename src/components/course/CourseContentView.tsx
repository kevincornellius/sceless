import { useState, useEffect } from "preact/hooks";
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
import { Image } from "lucide-preact";
import { SCELE_URL } from "../../config";
import { CourseSection, CourseModule, getModuleDueDate, formatDueDate } from "../../types/course";

function replaceImagesWithPlaceholder(html: string): string {
	return html.replace(
		/<img([^>]*)>/gi,
		'<div class="flex items-center gap-2 p-2 my-2 bg-surface rounded-lg text-sm text-content-muted"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg><span>Image (not supported by Sceless)</span></div>'
	);
}

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

// Chronological View
export function ChronologicalView({ sections, expandAll = false }: { sections: CourseSection[]; expandAll?: boolean }) {
	const [expandedSections, setExpandedSections] = useState<number[]>(expandAll ? sections.map((s) => s.id) : []);

	// Expand all when expandAll changes to true
	useEffect(() => {
		if (expandAll) {
			setExpandedSections(sections.map((s) => s.id));
		}
	}, [expandAll, sections]);

	const toggleSection = (id: number) => {
		setExpandedSections((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
	};

	// Filter out invisible sections
	const visibleSections = sections.filter((s) => s.visible);

	return (
		<div class="space-y-3">
			{visibleSections.map((section) => {
				// Filter visible modules
				const visibleModules = section.modules.filter((m) => m.visible);
				const moduleCount = visibleModules.length;

				return (
					<div key={section.id} class="rounded-xl border-2 border-edge overflow-hidden bg-surface-elevated">
						<button
							onClick={() => toggleSection(section.id)}
							class="w-full flex items-center justify-between px-4 py-3 bg-surface-elevated hover:bg-surface-elevated/80 transition-colors"
						>
							<div class="flex-1 text-left">
								<div class="flex items-center gap-2">
									<span class="font-semibold text-sm text-content">{section.name}</span>
									{moduleCount > 0 && (
										<span class="text-xs px-2 py-0.5 rounded font-semibold bg-primary/20 text-primary">
											{moduleCount} items
										</span>
									)}
								</div>
								{/* Description could go here */}
							</div>
							{expandedSections.includes(section.id) ? (
								<ChevronDown class="w-4 h-4 flex-shrink-0 text-content-muted" />
							) : (
								<ChevronRight class="w-4 h-4 flex-shrink-0 text-content-muted" />
							)}
						</button>

						{expandedSections.includes(section.id) && (
							<div class="divide-y-2 divide-edge">
								{/* Summary */}
								{section.summary && (
									<div 
										class="px-4 py-3 text-sm text-content-muted bg-page/50"
										dangerouslySetInnerHTML={{ __html: replaceImagesWithPlaceholder(section.summary) }}
									/>
								)}
								{moduleCount === 0 ? (
									<div class="px-4 py-6 text-center text-sm text-content-muted">
										No content in this section
									</div>
								) : (
									visibleModules.map((module) => (
										<ModuleItem key={module.id} module={module} />
									))
								)}
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
}

// Grouped View
export function GroupedView({ sections, expandAll = false }: { sections: CourseSection[]; expandAll?: boolean }) {
	// Get unique types from sections
	const uniqueTypes = [...new Set(
		sections
			.filter((s) => s.visible)
			.flatMap((s) => s.modules.filter((m) => m.visible).map((m) => m.modname.toLowerCase()))
	)];

	const [expandedTypes, setExpandedTypes] = useState<string[]>(expandAll ? uniqueTypes : []);

	// Expand all when expandAll changes to true
	useEffect(() => {
		if (expandAll) {
			setExpandedTypes(uniqueTypes);
		}
	}, [expandAll, uniqueTypes]);

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
				<div key={type} class="rounded-xl border-2 border-edge overflow-hidden bg-surface-elevated">
					<button
						onClick={() => toggleType(type)}
						class="w-full flex items-center justify-between px-4 py-3 bg-surface-elevated hover:bg-surface-elevated/80 transition-colors"
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
								<ModuleItem key={module.id} module={module} showSection={sections.length > 1} sectionName={sectionName} />
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
}: {
	module: CourseModule;
	showSection?: boolean;
	sectionName?: string;
}) {
	const Icon = getModuleIcon(module.modname);
	const modUrl = `${SCELE_URL}/mod/${module.modname}/view.php?id=${module.id}`;
	const dueDate = getModuleDueDate(module);
	const isOverdue = dueDate && dueDate < new Date();

	return (
		<a
			href={modUrl}
			target="_blank"
			rel="noopener noreferrer"
			class="flex items-center gap-3 px-4 py-3 hover:bg-primary/5 transition-colors cursor-pointer"
		>
			<div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-surface">
				<Icon class="w-5 h-5 text-content-muted" />
			</div>
			<div class="flex-1 min-w-0">
				<div class="flex items-center gap-2">
					<p class="font-semibold text-sm text-content truncate">{module.name}</p>
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
