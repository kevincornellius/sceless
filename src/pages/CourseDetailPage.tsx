import { useEffect, useState, useMemo } from "preact/hooks";
import { SCELE_URL } from "../config";
import { Tab } from "../types/state";
import { CourseSection } from "../types/course";
import { loadCourseContents } from "../stores/indexeddb/courseContents";
import { activeTabKey, getTabKey, openTabs } from "../stores/tabs";
import { ViewModeSelector, ChronologicalView, GroupedView } from "../components/course/CourseContentView";
import { Search } from "lucide-preact";
import { getCourseTitle } from "../stores/indexeddb/course";

const CourseDetailPage = ({ courseId }: { courseId: string }) => {
    const [contents, setContents] = useState<CourseSection[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<string>("chronological");
    const [searchQuery, setSearchQuery] = useState("");

    // Get course title from tabs store
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
        const fetchContents = async () => {
            setLoading(true);
            try {
                const { contents: data } = await loadCourseContents(courseId);
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
        <div class="p-4 lg:p-6 h-full overflow-y-auto">
            {/* Course Title */}
            <h1 class="text-xl font-bold text-content mb-6">{courseTitle}</h1>
            
            {contents.length === 0 ? (
                <div class="text-content-muted">No course content available</div>
            ) : (
                <>
                    {/* Search and View Mode */}
                    <div class="flex items-center justify-between gap-4 mb-6">
                        <h2 class="text-lg font-bold text-content">Course Content</h2>
                        <ViewModeSelector mode={viewMode} onChange={setViewMode} />
                    </div>

                    {/* Search Bar */}
                    <div class="relative mb-4">
                        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
                        <input 
                            type="text"
                            placeholder="Search modules..."
                            value={searchQuery}
                            onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
                            class="w-full pl-9 pr-3 py-2 rounded-lg text-sm border-2 transition-all focus:outline-none bg-surface text-content border-edge focus:border-primary"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                class="absolute right-3 top-1/2 -translate-y-1/2 text-content-muted hover:text-content"
                            >
                                ×
                            </button>
                        )}
                    </div>

                    {searchQuery && (
                        <div class="mb-4 text-sm text-content-muted">
                            Found {filteredContents.reduce((acc, s) => acc + s.modules.length, 0)} modules
                        </div>
                    )}

                    {/* Content */}
                    {viewMode === "chronological" ? (
                        <ChronologicalView sections={filteredContents} expandAll={!!searchQuery} />
                    ) : (
                        <GroupedView sections={filteredContents} expandAll={!!searchQuery} />
                    )}
                </>
            )}
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
