import { useEffect, useState } from "preact/compat";
import { SCELE_URL } from "../config";
import { navigateTab } from "../routing/router";
import { Tab } from "../types/state";
import { CourseDetailTab } from "./CourseDetailPage";
import { Course } from "../types/course";
import { loadCourses, forceRefreshCourses } from "../stores/indexeddb/course";
import { loadDeadlines, forceRefreshDeadlines } from "../stores/indexeddb/deadline";
import { loadNotifications } from "../stores/indexeddb/notification";
import { Deadline } from "../types/scele";
import { AppNotification } from "../types/scele";
import { Clock, Bell, AlertCircle } from "lucide-preact";

export default function DashboardPage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [deadlines, setDeadlines] = useState<Deadline[]>([]);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const init = async () => {
            try {
                const [coursesResult, deadlinesResult, notificationsResult] = await Promise.all([
                    loadCourses(),
                    loadDeadlines(),
                    loadNotifications(),
                ]);
                setCourses(coursesResult.courses);
                setDeadlines(deadlinesResult.deadlines);
                setNotifications(notificationsResult.notifications);
            } catch (err: any) {
                setError(err.message || "Failed to load dashboard.");
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, []);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            const [coursesResult, deadlinesResult, notificationsResult] = await Promise.all([
                forceRefreshCourses(),
                forceRefreshDeadlines(),
                loadNotifications(),
            ]);
            setCourses(coursesResult);
            setDeadlines(deadlinesResult);
            setNotifications(notificationsResult.notifications);
        } catch (err: any) {
            setError(err.message || "Failed to refresh.");
        } finally {
            setIsRefreshing(false);
        }
    };

    const formatDueDate = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = date.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return "Overdue";
        if (diffDays === 0) return "Today";
        if (diffDays === 1) return "Tomorrow";
        if (diffDays <= 7) return `In ${diffDays} days`;
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };

    return (
        <div class="p-6 space-y-6">
            {/* Deadlines Section */}
            {deadlines.length > 0 && (
                <div>
                    <div class="flex items-center gap-2 mb-3">
                        <AlertCircle class="w-5 h-5 text-danger" />
                        <h2 class="text-lg font-bold text-content">Upcoming Deadlines</h2>
                    </div>
                    <div class="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                        {deadlines.slice(0, 5).map((deadline) => (
                            <div
                                key={deadline.id}
                                onClick={() => window.open(deadline.url, "_blank")}
                                class="shrink-0 w-48 p-3 bg-danger/10 border border-danger/20 rounded-lg cursor-pointer hover:bg-danger/20 transition-colors"
                            >
                                <div class="text-xs font-bold text-danger uppercase mb-1">
                                    {deadline.courseCode}
                                </div>
                                <div class="text-sm font-medium text-content truncate" title={deadline.title}>
                                    {deadline.title}
                                </div>
                                <div class="text-xs text-danger mt-2 font-semibold">
                                    {formatDueDate(deadline.dueTimestamp * 1000)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Notifications Section */}
            {notifications.length > 0 && (
                <div>
                    <div class="flex items-center gap-2 mb-3">
                        <Bell class="w-5 h-5 text-accent" />
                        <h2 class="text-lg font-bold text-content">Recent Notifications</h2>
                    </div>
                    <div class="space-y-2">
                        {notifications.slice(0, 5).map((notif) => (
                            <div
                                key={notif.id}
                                onClick={() => window.open(notif.url, "_blank")}
                                class={`p-3 bg-panel border border-edge rounded-lg cursor-pointer hover:border-accent transition-colors ${
                                    !notif.isRead ? "bg-accent/5 border-accent/30" : ""
                                }`}
                            >
                                <div class="flex items-start gap-2">
                                    {!notif.isRead && (
                                        <span class="w-2 h-2 rounded-full bg-accent mt-1.5 shrink-0" />
                                    )}
                                    <div class="flex-1 min-w-0">
                                        <div class={`text-sm truncate ${notif.isRead ? "text-content-muted" : "text-content font-medium"}`}>
                                            {notif.title}
                                        </div>
                                        <div class="text-xs text-content-muted mt-0.5">
                                            {notif.module}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Courses Section */}
            <div>
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-lg font-bold text-content">My Courses</h2>
                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        class="p-2 rounded-lg border border-edge hover:border-accent transition-colors disabled:opacity-50"
                        title="Refresh"
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
        </div>
    );
}

export const DashboardTab: Tab = {
	type: "dashboard",
	id: "page",
	title: "Dashboard",
	url: `${SCELE_URL}/`,
};
