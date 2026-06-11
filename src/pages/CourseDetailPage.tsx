import { useEffect, useState, useMemo } from "preact/hooks";
import { SCELE_URL } from "../config";
import { Tab } from "../types/state";
import { CourseSection } from "../types/course";
import { loadCourseContents } from "../stores/indexeddb/courseContents";
import { activeTabKey, getTabKey, openTabs } from "../stores/tabs";
import { ViewModeSelector, ChronologicalView, GroupedView, NewestView } from "../components/course/CourseContentView";
import { Search, ChevronDown, ChevronRight, Sparkles } from "lucide-preact";
import { getCourseTitle } from "../stores/indexeddb/course";
import { markCourseSeen, clearNewModuleCount, getNewModuleIds } from "../stores/seenModules";
import { trackCourseVisit } from "../stores/indexeddb/activity";

const CourseDetailPage = ({ courseId }: { courseId: string }) => {
    const [contents, setContents] = useState<CourseSection[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<string>("chronological");
    const [searchQuery, setSearchQuery] = useState("");
    const [newModuleIds, setNewModuleIds] = useState<number[]>([]);
    const [showNew, setShowNew] = useState(false);

    const courseTitle = getCourseTitle(courseId) || openTabs.value.find(tab => getTabKey(tab) === `course:${courseId}`)?.title || `Course ${courseId}`;
    // Filter sections/modules based on search query
    const filteredContents = useMemo(() => {
        if (!searchQuery.trim()) return contents;
        
        const query = searchQuery.toLowerCase();
        
        return contents
            .map(section => ({
                ...section,
                modules: section.modules.filter(m => 
                    m.name.toLowerCase().includes(query) ||
                    (m.description && m.description.toLowerCase().includes(query))
                )
            }))
            .filter(section => section.modules.length > 0);
    }, [contents, searchQuery]);

    useEffect(() => {
        trackCourseVisit(Number(courseId));
        const fetchContents = async () => {
            setLoading(true);
            try {
                const { contents: data } = await loadCourseContents(courseId);
                if (data.length > 0) {
                    // Get unseen IDs before marking as seen (so we can show badges)
                    const unseen = await getNewModuleIds(courseId, data);
                    setNewModuleIds(unseen);
                    // Now mark as seen and clear badge
                    await markCourseSeen(courseId, data);
                    await clearNewModuleCount(courseId);
                }
                setContents(data);
            } catch (error) {
                console.error("Failed to load course contents:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchContents();
    }, [courseId]);

    if (loading) {
        return (
            <div class="flex items-center justify-center h-full">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div class="flex flex-col h-full">
            {/* Fixed header */}
            <div class="px-4 lg:px-6 pt-3 shrink-0">
                <h1 class="text-base font-bold text-content mb-2">{courseTitle}</h1>

                {/* What's New */}
                {newModuleIds.length > 0 && (
                    <div class="rounded-xl border-2 border-edge overflow-hidden mb-2">
                        <button
                            onClick={() => setShowNew(v => !v)}
                            class="w-full flex items-center gap-3 px-3 py-2 bg-page-secondary hover:bg-edge/30 transition-colors cursor-pointer"
                        >
                            <Sparkles class="w-4 h-4 text-primary shrink-0" />
                            <span class="text-sm font-semibold text-content">What's New</span>
                            <span class="text-xs px-2 py-0.5 rounded font-bold bg-primary text-on-primary">{newModuleIds.length}</span>
                            {showNew
                                ? <ChevronDown class="w-4 h-4 text-content-muted ml-auto" />
                                : <ChevronRight class="w-4 h-4 text-content-muted ml-auto" />
                            }
                        </button>
                        {showNew && (
                            <div class="divide-y-2 divide-edge">
                                {contents.map(section => {
                                    const sectionNew = section.modules.filter(m => newModuleIds.includes(m.id));
                                    if (sectionNew.length === 0) return null;
                                    return (
                                        <div key={section.id}>
                                            <div class="px-4 py-2 bg-page/50">
                                                <span class="text-xs font-semibold text-content-muted">{section.name}</span>
                                            </div>
                                            {sectionNew.map(m => (
                                                <a
                                                    key={m.id}
                                                    href={`${SCELE_URL}/mod/${m.modname}/view.php?id=${m.id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    class="flex items-center gap-3 px-4 py-3 hover:bg-primary/5 transition-colors"
                                                >
                                                    <span class="text-[10px] px-1.5 py-0.5 rounded font-bold bg-primary text-on-primary uppercase shrink-0">New</span>
                                                    <span class="text-sm font-semibold text-content">{m.name}</span>
                                                </a>
                                            ))}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {contents.length > 0 && (
                    <div class="flex items-center gap-2 mb-2">
                        <div class="relative flex-1">
                            <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-content-muted" />
                            <input
                                type="text"
                                placeholder="Search modules..."
                                value={searchQuery}
                                onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
                                class="w-full pl-8 pr-3 py-1.5 rounded-lg text-sm border-2 transition-all focus:outline-none bg-page text-content border-edge focus:border-primary"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    class="absolute right-2.5 top-1/2 -translate-y-1/2 text-content-muted hover:text-content"
                                >×</button>
                            )}
                        </div>
                        <ViewModeSelector mode={viewMode} onChange={setViewMode} />
                    </div>
                )}
            </div>

            {/* Scrollable content area */}
            <div class="flex-1 min-h-0 px-4 lg:px-6 pb-3 overflow-hidden">
                {contents.length === 0 ? (
                    <div class="text-content-muted">No course content available</div>
                ) : viewMode === "chronological" ? (
                    <ChronologicalView sections={filteredContents} newModuleIds={newModuleIds} />
                ) : viewMode === "grouped" ? (
                    <GroupedView sections={filteredContents} newModuleIds={newModuleIds} />
                ) : (
                    <NewestView sections={filteredContents} newModuleIds={newModuleIds} />
                )}
            </div>
        </div>
    );
};

export default CourseDetailPage;

export const CourseDetailTab = (courseId: string, courseCode: string, courseUrl? :string|undefined): Tab => {
	return {
		type: "course",
		id: courseId,
		title: courseCode,
		url: courseUrl || `${SCELE_URL}/course/view.php?id=${courseId}`,
	} as Tab;
};
