import { useEffect, useState } from "preact/compat";
import { SCELE_URL } from "../config";
import { navigateTab } from "../routing/router";
import { Tab } from "../types/state";
import { CourseDetailTab } from "./CourseDetailPage";
import { Course } from "../types/course";
import { loadCourses, forceRefreshCourses } from "../stores/indexeddb/course";

export default function DashboardPage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const init = async () => {
            try {
                const { courses } = await loadCourses();
                setCourses(courses);
            } catch (err: any) {
                setError(err.message || "Failed to load courses.");
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, []);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            const courses = await forceRefreshCourses();
            setCourses(courses);
        } catch (err: any) {
            setError(err.message || "Failed to refresh courses.");
        } finally {
            setIsRefreshing(false);
        }
    };

    return (
        <div class="p-6">
            <div class="flex items-center justify-between mb-6">
                <h1 class="text-2xl font-bold text-content">My Courses</h1>
                <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    class="p-2 rounded-lg border border-edge hover:border-accent transition-colors disabled:opacity-50"
                    title="Refresh courses"
                >
                    <svg
                        class={`w-5 h-5 text-content-muted ${isRefreshing ? 'animate-spin' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>

            {isLoading ? (
                <div class="flex flex-col gap-4">
                    <div class="h-24 bg-panel animate-pulse rounded-xl border border-edge" />
                    <div class="h-24 bg-panel animate-pulse rounded-xl border border-edge" />
                </div>
            ) : error ? (
                <div class="p-4 bg-danger/10 text-danger rounded-lg border border-danger/20">
                    {error}
                </div>
            ) : (
                <div class="grid grid-cols-1 gap-4">
                    {courses.map((course) => (
                        <div
                            key={course.id}
                            onClick={() => navigateTab(CourseDetailTab(String(course.id), course.title))}
                            class="group p-4 bg-panel border border-edge rounded-xl hover:border-accent transition-all cursor-pointer"
                        >
                            <div class="text-xs font-bold text-accent uppercase mb-1">
                                {course.code}
                            </div>
                            <div class="text-base font-semibold text-content group-hover:text-accent transition-colors">
                                {course.title}
                            </div>
                            
                            <div class="mt-4 flex items-center gap-3">
                                <div class="flex-1 h-1.5 bg-page rounded-full overflow-hidden">
                                    <div 
                                        class="h-full bg-accent transition-all" 
                                        style={{ width: `${course.progress}%` }} 
                                    />
                                </div>
                                <span class="text-[10px] font-bold text-content-muted">
                                    {Math.round(course.progress)}%
                                </span>
                            </div>
                        </div>
                    ))}
                    
                    {courses.length === 0 && (
                        <p class="text-center text-content-muted py-10">
							You have no in-progress courses. 
						</p>
                    )}
                </div>
            )}
        </div>
    );
}

export const DashboardTab: Tab = {
	type: "dashboard",
	id: "page",
	title: "Dashboard",
	url: `${SCELE_URL}/my/`,
};
