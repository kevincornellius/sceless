import { useEffect, useState } from "preact/compat";
import { SCELE_URL } from "../config";
import { navigateTab } from "../routing/router";
import { Tab } from "../types/state";
import { CourseDetailTab } from "./CourseDetailPage";
import { TasksTab } from "../helper/tabs";
import { AllCoursesTab } from "./AllCoursesPage";
import { Course } from "../types/course";
import { loadCourses, forceRefreshCourses } from "../stores/indexeddb/course";
import { loadDeadlines } from "../stores/indexeddb/deadline";
import { loadNotifications } from "../stores/indexeddb/notification";
import { Deadline, AppNotification, Announcement } from "../types/scele";
import { Clock, Bell, AlertCircle, Pin, BookOpen, CheckCircle, MessageSquare, Calendar, Star, ChevronRight, FileText, Sparkles, Megaphone, RefreshCw } from "lucide-preact";
import { pinnedCourses, togglePin, isPinned } from "../stores/pinned";
import { wsToken } from "../stores/auth";
import { getAllCachedNewModuleCounts } from "../stores/seenModules";
import { loadAnnouncements } from "../stores/indexeddb/announcements";

function parseLinks(html: string): { href: string; text: string }[] {
    try {
        const doc = new DOMParser().parseFromString(html, "text/html");
        return Array.from(doc.querySelectorAll("a[href]"))
            .map(a => ({ href: (a as HTMLAnchorElement).href, text: a.textContent?.trim() ?? "" }))
            .filter(({ href, text }) => href && text && !href.startsWith("javascript"));
    } catch {
        return [];
    }
}

// Helper: get next deadline for a course
function getNextDeadline(courseId: number, deadlines: Deadline[]): Deadline | null {
    const now = Date.now();
    const courseDeadlines = deadlines
        .filter(d => d.courseId === courseId && d.dueTimestamp * 1000 > now)
        .sort((a, b) => a.dueTimestamp - b.dueTimestamp);
    return courseDeadlines[0] ?? null;
}

function formatDeadline(ts: number): string {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    if (diffHours < 0) return "Overdue";
    if (diffHours <= 24) return `Today, ${date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
    if (diffHours <= 48) return "Tomorrow";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface CourseCardProps {
    course: Course;
    isPinned: boolean;
    newModules: number;
    nextDeadline: Deadline | null;
    onPin: () => void;
    onUnpin: () => void;
    animationDelay?: string;
}

function CourseCard({ course, isPinned, newModules, nextDeadline, onPin, onUnpin, animationDelay }: CourseCardProps) {
    const isUrgent = nextDeadline && (nextDeadline.dueTimestamp * 1000 - Date.now()) <= 48 * 60 * 60 * 1000;

    return (
        <div
            class={`group rounded-xl border-2 border-edge bg-page hover:border-primary transition-all cursor-pointer animate-fade-slide-up ${animationDelay ?? ""}`}
            onClick={() => navigateTab(CourseDetailTab(String(course.id), course.code))}
        >
            <div class="flex items-center gap-3 p-3">
                {/* Left: Icon */}
                <div class="w-10 h-10 rounded-xl flex items-center justify-center bg-primary shrink-0">
                    <BookOpen class="w-5 h-5 text-on-primary" />
                </div>

                {/* Center: Title + Progress */}
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-0.5">
                        <p class="font-semibold text-sm text-content truncate flex-1">{course.title}</p>
                        {newModules > 0 && (
                            <span class="shrink-0 text-[10px] px-1.5 py-0.5 rounded font-bold bg-primary text-on-primary uppercase">
                                +{newModules} new
                            </span>
                        )}
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="flex-1 h-1.5 rounded-full overflow-hidden bg-edge">
                            <div
                                class="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${course.progress}%` }}
                            />
                        </div>
                        <span class="text-[11px] text-content-muted font-medium shrink-0">{course.progress}%</span>
                    </div>
                </div>

                {/* Right: Deadline + Actions */}
                <div class="flex items-center gap-2 shrink-0">
                    {nextDeadline && (
                        <div class={`hidden sm:flex flex-col items-end gap-0.5 text-[11px] px-2 py-1 rounded-lg ${isUrgent ? "bg-danger text-white" : "bg-edge text-content-muted"}`}>
                            <span class="font-semibold truncate max-w-30">{nextDeadline.title}</span>
                            <span class="opacity-80">{formatDeadline(nextDeadline.dueTimestamp * 1000)}</span>
                        </div>
                    )}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            isPinned ? onUnpin() : onPin();
                        }}
                        class={`p-1.5 rounded-lg transition-all ${
                            isPinned
                                ? "text-danger bg-danger/10 hover:bg-danger/20"
                                : "text-content-muted hover:text-danger hover:bg-danger/10 opacity-0 group-hover:opacity-100"
                        }`}
                        title={isPinned ? "Unpin" : "Pin course"}
                    >
                        <Pin width={16} class={isPinned ? "fill-current" : ""} />
                    </button>
                    <ChevronRight class="w-4 h-4 text-content-muted group-hover:text-primary transition-colors" />
                </div>
            </div>

            {/* Bottom: Progress bar + deadline on mobile */}
            <div class="sm:hidden px-4 pb-3 flex items-center gap-3">
                <div class="flex-1 h-1.5 rounded-full overflow-hidden bg-edge">
                    <div class="h-full rounded-full bg-primary" style={{ width: `${course.progress}%` }} />
                </div>
                {nextDeadline && (
                    <span class={`text-[11px] font-medium ${isUrgent ? "text-danger" : "text-content-muted"}`}>
                        {formatDeadline(nextDeadline.dueTimestamp * 1000)}
                    </span>
                )}
            </div>
        </div>
    );
}

export default function DashboardPage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [deadlines, setDeadlines] = useState<Deadline[]>([]);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [newModuleCounts, setNewModuleCounts] = useState<Record<string, number>>({});
    const [refreshing, setRefreshing] = useState(false);

    const handleRefreshCourses = () => {
        setRefreshing(true);
        forceRefreshCourses()
            .then(fresh => {
                const pinnedIds = new Set(pinnedCourses.value.map(c => c.id));
                setCourses(fresh.map(c => ({ ...c, isPinned: pinnedIds.has(c.id) }))
                    .sort((a, b) => (a.isPinned === b.isPinned ? 0 : a.isPinned ? -1 : 1)));
            })
            .finally(() => setRefreshing(false));
    };

    // Stats
    const dueToday = deadlines.filter(d => {
        const now = Date.now();
        const due = d.dueTimestamp * 1000;
        const todayEnd = new Date().setHours(23, 59, 59, 999);
        return due <= todayEnd && due >= now;
    }).length;
    
    const dueThisWeek = deadlines.filter(d => {
        const now = Date.now();
        const due = d.dueTimestamp * 1000;
        const weekEnd = now + 7 * 24 * 60 * 60 * 1000;
        return due > now && due <= weekEnd;
    }).length;

    const unreadNotifs = notifications.filter(n => !n.isRead).length;

    useEffect(() => {
        const init = async () => {
            try {
                const [coursesResult, deadlinesResult, notificationsResult, announcementsResult] = await Promise.all([
                    loadCourses(),
                    loadDeadlines(),
                    loadNotifications(),
                    loadAnnouncements(),
                ]);

                const pinnedIds = new Set(pinnedCourses.value.map(c => c.id));
                const sortedCourses = coursesResult.courses
                    .map(c => ({ ...c, isPinned: pinnedIds.has(c.id) }))
                    .sort((a, b) => (a.isPinned === b.isPinned ? 0 : a.isPinned ? -1 : 1));

                setCourses(sortedCourses);
                setDeadlines(deadlinesResult.deadlines);
                setNotifications(notificationsResult.notifications);
                setAnnouncements(announcementsResult.announcements);

                const counts = await getAllCachedNewModuleCounts();
                setNewModuleCounts(counts);
            } catch (_) {}
        };
        init();
    }, []);

    const formatDueDate = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = date.getTime() - now.getTime();
        const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));

        if (diffHours < 0) return "Overdue";
        if (diffHours <= 48) return `In ${diffHours} hours`;
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };

    return (
        <div class="p-4 lg:p-6 h-full overflow-y-auto">
            {/* Stats Strip */}
            <div class="flex gap-2 mb-4 overflow-x-auto scrollbar-thin">
                <div class={`flex-shrink-0 px-4 py-3 rounded-xl border-2 bg-page animate-fade-slide-up ${dueToday > 0 ? 'border-danger' : 'border-edge'}`}>
                    <div class="flex items-center gap-2">
                        <div class={`w-8 h-8 rounded-lg flex items-center justify-center ${dueToday > 0 ? 'bg-danger' : 'bg-edge'}`}>
                            {dueToday > 0 ? <AlertCircle class="w-4 h-4 text-on-primary" /> : <Clock class="w-4 h-4 text-content-muted" />}
                        </div>
                        <div class="flex items-baseline gap-2">
                            <span class={`text-2xl font-bold ${dueToday > 0 ? 'text-danger' : 'text-content'}`}>{dueToday}</span>
                            <span class={`text-xs font-semibold ${dueToday > 0 ? 'text-danger' : 'text-content-muted'}`}>Due Today</span>
                        </div>
                    </div>
                </div>
                <div class="flex-shrink-0 px-4 py-3 rounded-xl border-2 border-edge bg-page animate-fade-slide-up delay-1">
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-edge">
                            <Calendar class="w-4 h-4 text-content-muted" />
                        </div>
                        <div class="flex items-baseline gap-2">
                            <span class="text-2xl font-bold text-content">{dueThisWeek}</span>
                            <span class="text-xs font-semibold text-content-muted">This Week</span>
                        </div>
                    </div>
                </div>
                <div class="flex-shrink-0 px-4 py-3 rounded-xl border-2 border-edge bg-page animate-fade-slide-up delay-2">
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-edge">
                            <Bell class="w-4 h-4 text-content-muted" />
                        </div>
                        <div class="flex items-baseline gap-2">
                            <span class="text-2xl font-bold text-content">{unreadNotifs}</span>
                            <span class="text-xs font-semibold text-content-muted">Unread</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* New Modules Since Last Visit */}
            {(() => {
                const coursesWithNew = courses.filter(c => (newModuleCounts[c.id] ?? 0) > 0);
                if (coursesWithNew.length === 0) return null;
                const totalNew = coursesWithNew.reduce((sum, c) => sum + (newModuleCounts[c.id] ?? 0), 0);
                return (
                    <div class="mb-4 animate-fade-slide-up">
                        <div class="flex items-center gap-2 mb-3">
                            <Sparkles class="w-4 h-4 text-primary" />
                            <h3 class="font-semibold text-sm text-content">New in Your Courses</h3>
                            <span class="text-xs px-2 py-0.5 rounded-lg font-semibold bg-primary text-on-primary">
                                {totalNew} new
                            </span>
                        </div>
                        <div class="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                            {coursesWithNew.map((course) => (
                                <div
                                    key={course.id}
                                    class="group relative shrink-0 rounded-xl border-2 border-primary/40 bg-primary/5 p-4 cursor-pointer hover:border-primary transition-colors"
                                    onClick={() => navigateTab(CourseDetailTab(String(course.id), course.code))}
                                >
                                    <div class="flex items-start gap-3">
                                        <div class="w-10 h-10 rounded-xl flex items-center justify-center bg-primary shrink-0">
                                            <BookOpen class="w-5 h-5 text-on-primary" />
                                        </div>
                                        <div class="flex-1 min-w-0">
                                            <p class="font-semibold text-sm text-content truncate" title={course.title}>{course.title}</p>
                                            <p class="text-xs font-medium text-content-muted">{course.code}</p>
                                        </div>
                                        <span class="shrink-0 text-xs font-bold px-2 py-1 rounded-lg bg-primary text-on-primary">
                                            +{newModuleCounts[course.id]}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })()}

            {/* 2-Column Layout */}
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left Column - Wide */}
                <div class="lg:col-span-2 space-y-4">
                    {/* Upcoming Tasks */}
                    <div class="rounded-xl border-2 border-edge bg-page animate-fade-slide-up delay-3">
                        <div class="flex items-center justify-between px-4 py-3 border-b-2 border-edge">
                            <div class="flex items-center gap-2">
                                <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-primary">
                                    <CheckCircle class="w-4 h-4 text-on-primary" />
                                </div>
                                <h3 class="font-semibold text-sm text-content">Tasks Due</h3>
                            </div>
                            <button
                                onClick={() => navigateTab(TasksTab)}
                                class="text-xs font-semibold px-2 py-1 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors cursor-pointer"
                            >
                                View all
                            </button>
                        </div>
                        <div class="divide-y-2 divide-edge">
                            {deadlines.slice(0, 4).map((task) => (
                                <div
                                    key={task.id}
                                    class="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-page-secondary"
                                    onClick={() => window.open(task.url, "_blank")}
                                >
                                    {(() => {
                                        const now = Date.now();
                                        const due = task.dueTimestamp * 1000;
                                        const isUrgent = due <= now + 48 * 60 * 60 * 1000;
                                        return (
                                            <>
                                                <div class={`w-10 h-10 rounded-xl flex items-center justify-center ${isUrgent ? 'bg-danger' : 'bg-primary/10'}`}>
                                                    {isUrgent ? <AlertCircle class="w-5 h-5 text-on-primary" /> : <FileText class="w-5 h-5 text-primary" />}
                                                </div>
                                                <div class="flex-1 min-w-0">
                                                    <p class="font-semibold text-sm text-content truncate">{task.title}</p>
                                                    <p class="text-xs font-medium text-content-muted">{task.courseCode}</p>
                                                </div>
                                                <div class="flex flex-col items-end gap-1">
                                                    <span class={`text-xs px-2 py-1 rounded-lg font-semibold ${isUrgent ? 'bg-danger text-on-primary' : 'bg-primary/10 text-primary'}`}>
                                                        {formatDueDate(task.dueTimestamp * 1000)}
                                                    </span>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            ))}
                            {deadlines.length === 0 && (
                                <div class="px-4 py-6 text-center text-content-muted text-sm">
                                    No upcoming tasks
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Courses List */}
                    {courses.length > 0 && (
                        <div class="space-y-2">
                            {/* Pinned header + cards */}
                            {pinnedCourses.value.length > 0 && (
                                <>
                                    <div class="flex items-center gap-2 mb-1">
                                        <Star class="w-4 h-4 text-highlight fill-current" />
                                        <h3 class="font-semibold text-sm text-content">Pinned</h3>
                                        <span class="text-xs px-2 py-0.5 rounded-lg font-semibold bg-primary/20 text-primary">
                                            {pinnedCourses.value.length}
                                        </span>
                                    </div>
                                    {pinnedCourses.value.map((course, i) => (
                                        <CourseCard
                                            key={course.id}
                                            course={course}
                                            isPinned={true}
                                            newModules={newModuleCounts[course.id] ?? 0}
                                            nextDeadline={getNextDeadline(course.id, deadlines)}
                                            onPin={() => {}}
                                            onUnpin={() => togglePin(course)}
                                            animationDelay={`delay-${Math.min(i + 3, 6)}`}
                                        />
                                    ))}
                                </>
                            )}

                            {/* Unpinned courses — scrollable */}
                            {courses.filter(c => !isPinned(c.id)).length > 0 && (
                                <>
                                    <div class="flex items-center gap-2 mt-4 mb-1">
                                        <BookOpen class="w-4 h-4 text-content-muted" />
                                        <h3 class="font-semibold text-sm text-content">Your Active Courses</h3>
                                        <span class="text-xs px-2 py-0.5 rounded-lg font-semibold bg-edge text-content-muted">
                                            {courses.filter(c => !isPinned(c.id)).length}
                                        </span>
                                        <button
                                            onClick={handleRefreshCourses}
                                            disabled={refreshing}
                                            class="p-1 rounded-lg hover:bg-edge transition-colors cursor-pointer disabled:opacity-50"
                                            title="Refresh courses"
                                        >
                                            <RefreshCw class={`w-3.5 h-3.5 text-content-muted ${refreshing ? "animate-spin" : ""}`} />
                                        </button>
                                        <button
                                            onClick={() => navigateTab(AllCoursesTab)}
                                            class="ml-auto text-xs font-semibold text-primary hover:underline"
                                        >
                                            View All Courses
                                        </button>
                                    </div>
                                    <div class="space-y-2 overflow-y-auto scrollbar-thin max-h-[55vh] pr-1">
                                        {courses.filter(c => !isPinned(c.id)).map((course, i) => (
                                            <CourseCard
                                                key={course.id}
                                                course={course}
                                                isPinned={false}
                                                newModules={newModuleCounts[course.id] ?? 0}
                                                nextDeadline={getNextDeadline(course.id, deadlines)}
                                                onPin={() => togglePin(course)}
                                                onUnpin={() => {}}
                                                animationDelay={`delay-${Math.min(i + 3, 6)}`}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Column - Narrow */}
                <div class="space-y-4">
                    {/* Announcements */}
                    <div class="rounded-xl border-2 border-edge bg-page animate-fade-slide-up delay-3">
                        <div class="flex items-center justify-between px-4 py-3 border-b-2 border-edge">
                            <div class="flex items-center gap-2">
                                <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-primary">
                                    <Megaphone class="w-4 h-4 text-on-primary" />
                                </div>
                                <h3 class="font-semibold text-sm text-content">Announcements</h3>
                            </div>
                            {announcements.length > 0 && (
                                <span class="text-xs font-semibold px-2 py-1 rounded-lg bg-edge text-content-muted">
                                    {announcements.length}
                                </span>
                            )}
                        </div>
                        <div class="divide-y-2 divide-edge">
                            {announcements.map((a) => {
                                const token = wsToken.value ?? "";
                                const items: { href: string; text: string }[] =
                                    a.attachments.length > 0
                                        ? a.attachments.slice(0, 3).map(f => ({ href: `${f.fileurl}?token=${token}`, text: f.filename }))
                                        : parseLinks(a.message).slice(0, 3);
                                return (
                                    <div key={a.id} class="px-4 py-3 hover:bg-page-secondary cursor-pointer" onClick={() => window.open(a.url, "_blank")}>
                                        <div class="flex items-start gap-3">
                                            {a.userpictureurl ? (
                                                <img src={a.userpictureurl} class="w-8 h-8 rounded-lg object-cover shrink-0 mt-0.5" />
                                            ) : (
                                                <div class="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                                                    <MessageSquare class="w-4 h-4 text-primary" />
                                                </div>
                                            )}
                                            <div class="flex-1 min-w-0">
                                                <p class="font-semibold text-sm text-content truncate leading-snug">{a.name}</p>
                                                <p class="text-xs text-content-muted mt-0.5">
                                                    {a.userfullname} · {new Date(a.timecreated * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                                </p>
                                                {items.length > 0 && (
                                                    <div class="flex flex-wrap gap-1 mt-1.5">
                                                        {items.map((item, i) => (
                                                            <a
                                                                key={i}
                                                                href={item.href}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={(e) => e.stopPropagation()}
                                                                class="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors max-w-40 truncate"
                                                            >
                                                                <FileText class="w-3 h-3 shrink-0" />
                                                                <span class="truncate">{item.text}</span>
                                                            </a>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {announcements.length === 0 && (
                                <div class="px-4 py-6 text-center text-content-muted text-sm">No announcements</div>
                            )}
                        </div>
                    </div>
                    
                </div>
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
