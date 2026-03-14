import { useEffect, useState } from "preact/hooks";
import { SCELE_URL } from "../config";
import { Tab } from "../types/state";
import { CourseSection } from "../types/course";
import { loadCourseContents } from "../stores/indexeddb/courseContents";
import { ViewModeSelector, ChronologicalView, GroupedView } from "../components/course/CourseContentView";

const CourseDetailPage = ({ courseId }: { courseId: string }) => {
    const [contents, setContents] = useState<CourseSection[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFromCache, setIsFromCache] = useState(false);
    const [viewMode, setViewMode] = useState<string>("chronological");

    useEffect(() => {
        const fetchContents = async () => {
            setLoading(true);
            try {
                const { contents: data, isFromCache: fromCache } = await loadCourseContents(courseId);
                setContents(data);
                setIsFromCache(fromCache);
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
            {isFromCache && (
                <div class="mb-4 text-xs text-content-muted bg-surface-elevated px-3 py-2 rounded-md flex items-center gap-2">
                    <span>Showing cached data</span>
                </div>
            )}
            
            {contents.length === 0 ? (
                <div class="text-content-muted">No course content available</div>
            ) : (
                <>
                    {/* View Mode Selector */}
                    <div class="flex items-center justify-between mb-6">
                        <h2 class="text-lg font-bold text-content">Course Content</h2>
                        <ViewModeSelector mode={viewMode} onChange={setViewMode} />
                    </div>

                    {/* Content */}
                    {viewMode === "chronological" ? (
                        <ChronologicalView sections={contents} />
                    ) : (
                        <GroupedView sections={contents} />
                    )}
                </>
            )}
        </div>
    );
};

export default CourseDetailPage;

export const CourseDetailTab = (courseId: string, courseTitle: string, courseUrl? :string|undefined): Tab => {
	return {
		type: "course",
		id: courseId,
		title: courseTitle,
		url: courseUrl || `${SCELE_URL}/course/view.php?id=${courseId}`,
	} as Tab;
};
