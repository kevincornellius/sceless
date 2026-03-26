import { useState, useEffect, useMemo } from "preact/hooks";
import { loadDeadlinesByTimesort } from "../stores/indexeddb/deadline";
import { Deadline } from "../types/scele";
import {
    Clock, AlertCircle, FileText, Calendar,
    ChevronLeft, ChevronRight, X,
} from "lucide-preact";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

function formatDueDate(ts: number): string {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    if (diffHours < 0) return "Overdue";
    if (diffHours <= 24) return `Today ${date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
    if (diffHours <= 48) return "Tomorrow";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isSameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getMonthDays(year: number, month: number) {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
}

interface TaskPillProps {
    task: Deadline;
    compact?: boolean;
}

function TaskPill({ task, compact = false }: TaskPillProps) {
    const diff = task.dueTimestamp * 1000 - Date.now();
    const isUrgent = diff > 0 && diff <= 48 * 60 * 60 * 1000;
    const isOverdue = diff < 0;

    const colorClass = isOverdue
        ? "bg-danger/20 text-danger"
        : isUrgent
        ? "bg-danger text-white"
        : "bg-primary/20 text-primary";

    if (compact) {
        return (
            <div
                class={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold truncate ${colorClass} cursor-pointer hover:opacity-80 transition-opacity`}
                onClick={(e) => { e.stopPropagation(); window.open(task.url, "_blank"); }}
                title={task.title}
            >
                <span class="shrink-0">{isOverdue ? <AlertCircle class="w-2.5 h-2.5" /> : isUrgent ? <AlertCircle class="w-2.5 h-2.5" /> : <FileText class="w-2.5 h-2.5" />}</span>
                <span class="truncate">{task.title}</span>
            </div>
        );
    }

    return (
        <div
            class={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold cursor-pointer hover:opacity-80 transition-opacity ${colorClass}`}
            onClick={(e) => { e.stopPropagation(); window.open(task.url, "_blank"); }}
        >
            <span class="shrink-0">{isOverdue ? <Clock class="w-3 h-3" /> : isUrgent ? <AlertCircle class="w-3 h-3" /> : <FileText class="w-3 h-3" />}</span>
            <span class="truncate flex-1">{task.title}</span>
            <span class="shrink-0 text-[10px] opacity-75">{task.courseCode}</span>
        </div>
    );
}

// Notion/Google-style calendar: week strip at top, full month grid, click day to expand
export default function TasksPage() {
    const [deadlines, setDeadlines] = useState<Deadline[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDay, setSelectedDay] = useState<number | null>(null); // YYYYMMDD number

    useEffect(() => {
        loadDeadlinesByTimesort().then(({ deadlines: d }) => {
            setDeadlines(d);
            setIsLoading(false);
        }).catch(() => setIsLoading(false));
    }, []);

    const [viewYear, setViewYear] = useState(new Date().getFullYear());
    const [viewMonth, setViewMonth] = useState(new Date().getMonth());

    const prevMonth = () => {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
        else setViewMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
        else setViewMonth(m => m + 1);
    };

    const goToday = () => {
        const t = new Date();
        setViewYear(t.getFullYear());
        setViewMonth(t.getMonth());
        setSelectedDay(t.getDate());
    };

    const monthCells = useMemo(() => getMonthDays(viewYear, viewMonth), [viewYear, viewMonth]);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Group deadlines by "YYYYMMDD" number key
    const deadlinesByDay = useMemo(() => {
        const map: Record<number, Deadline[]> = {};
        for (const d of deadlines) {
            const date = new Date(d.dueTimestamp * 1000);
            const key = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
            if (!map[key]) map[key] = [];
            map[key].push(d);
        }
        // Sort each day's tasks by time
        for (const k in map) {
            map[k].sort((a, b) => a.dueTimestamp - b.dueTimestamp);
        }
        return map;
    }, [deadlines]);

    const overdue = deadlines.filter(d => d.dueTimestamp * 1000 < Date.now());

    // Build week strip (Sun–Sat of current week containing today)
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        return d;
    });

    // When a day is selected, show its full task list
    const selectedDayKey = selectedDay
        ? viewYear * 10000 + (viewMonth + 1) * 100 + selectedDay
        : null;
    const selectedTasks = selectedDayKey ? (deadlinesByDay[selectedDayKey] ?? []) : null;

    if (isLoading) {
        return (
            <div class="flex items-center justify-center h-full">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    return (
        <div class="p-4 lg:p-6 flex flex-col gap-4 font-sans">
            {/* Header — full width row above both panels */}
            <div class="flex items-center justify-between shrink-0">
                <div>
                    <h1 class="text-xl font-bold text-content">Tasks</h1>
                    <div class="flex items-center gap-3 mt-0.5">
                        {overdue.length > 0 && (
                            <span class="text-xs font-semibold text-danger">{overdue.length} overdue</span>
                        )}
                        <span class="text-xs text-content-muted">{deadlines.length} total</span>
                    </div>
                </div>
                <button
                    onClick={goToday}
                    class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-on-primary hover:bg-primary/90 transition-colors cursor-pointer"
                >
                    Today
                </button>
            </div>

            <div class="flex flex-col lg:flex-row gap-4">
                {/* Left: Calendar */}
                <div class="flex flex-col lg:w-80 xl:w-96 shrink-0 bg-page-secondary rounded-2xl border-2 border-edge overflow-hidden">

                    {/* Month header */}
                    <div class="flex items-center justify-between px-4 py-3 border-b-2 border-edge shrink-0">
                        <button onClick={prevMonth} class="p-1.5 rounded-lg hover:bg-edge transition-colors cursor-pointer">
                            <ChevronLeft class="w-4 h-4 text-content-muted" />
                        </button>
                        <div class="flex items-center gap-2">
                            <h2 class="font-bold text-base text-content">{MONTHS[viewMonth]}</h2>
                            <span class="font-bold text-base text-content-muted">{viewYear}</span>
                        </div>
                        <button onClick={nextMonth} class="p-1.5 rounded-lg hover:bg-edge transition-colors cursor-pointer">
                            <ChevronRight class="w-4 h-4 text-content-muted" />
                        </button>
                    </div>

                    {/* Week strip */}
                    <div class="grid grid-cols-7 border-b-2 border-edge shrink-0">
                        {weekDays.map((d, i) => {
                            const key = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
                            const dayTasks = deadlinesByDay[key] ?? [];
                            const isToday = isSameDay(d, today);
                            const isSelected = selectedDay === d.getDate() &&
                                viewYear === d.getFullYear() && viewMonth === d.getMonth();

                            return (
                                <button
                                    key={i}
                                    onClick={() => setSelectedDay(isSelected && selectedTasks ? null : d.getDate())}
                                    class={[
                                        "flex flex-col items-center justify-center py-2 gap-0.5 border-b-2 transition-all cursor-pointer",
                                        isToday ? "border-primary" : "border-transparent",
                                        isSelected ? "bg-primary/10" : "hover:bg-edge/50",
                                    ].join(" ")}
                                >
                                    <span class="text-[10px] font-semibold uppercase tracking-wide text-content-muted">
                                        {DAYS[i]}
                                    </span>
                                    <span class={[
                                        "w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold transition-colors",
                                        isToday && !isSelected ? "bg-primary text-on-primary" : "",
                                        isToday && isSelected ? "bg-primary text-on-primary ring-2 ring-primary ring-offset-1 ring-offset-surface-elevated" : "",
                                        !isToday && isSelected ? "bg-primary/20 text-primary font-bold" : "",
                                        !isToday && !isSelected ? "text-content" : "",
                                    ].join(" ")}>
                                        {d.getDate()}
                                    </span>
                                    {dayTasks.length > 0 && (
                                        <div class="flex gap-0.5">
                                            {dayTasks.slice(0, 3).map((_, ti) => (
                                                <span key={ti} class="w-1.5 h-1.5 rounded-full bg-primary" />
                                            ))}
                                            {dayTasks.length > 3 && (
                                                <span class="text-[8px] text-content-muted">+</span>
                                            )}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Day headers */}
                    <div class="grid grid-cols-7 border-b border-edge shrink-0">
                        {DAYS.map(d => (
                            <div key={d} class="text-center text-[10px] font-bold uppercase tracking-wide text-content-muted py-1.5">
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* Month grid */}
                    <div class="grid grid-cols-7">
                        {monthCells.map((day, idx) => {
                            if (day === null) return <div key={idx} class="h-12 border-b border-r border-edge/50" />;

                            const dayKey = viewYear * 10000 + (viewMonth + 1) * 100 + day;
                            const dayTasks = deadlinesByDay[dayKey] ?? [];
                            const isToday = today.getFullYear() === viewYear &&
                                today.getMonth() === viewMonth &&
                                today.getDate() === day;
                            const isSelected = selectedDay === day;

                            return (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedDay(isSelected ? null : day)}
                                    class={[
                                        "w-full h-12 text-left p-1 border-b border-r border-edge/50 transition-colors cursor-pointer flex flex-col",
                                        isSelected ? "bg-primary/5 ring-1 ring-inset ring-primary" : "hover:bg-edge/30",
                                    ].join(" ")}
                                >
                                    <span class={[
                                        "inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold",
                                        isToday ? "bg-primary text-on-primary" : "text-content-muted",
                                    ].join(" ")}>
                                        {day}
                                    </span>
                                    {/* Task pills */}
                                    <div class="mt-0.5 space-y-0.5 overflow-hidden">
                                        {dayTasks.slice(0, 2).map((task, ti) => {
                                            const diff = task.dueTimestamp * 1000 - Date.now();
                                            const isUrgent = diff > 0 && diff <= 48 * 60 * 60 * 1000;
                                            const isOverdue = diff < 0;
                                            return (
                                                <div
                                                    key={ti}
                                                    class={[
                                                        "flex items-center gap-0.5 px-1 rounded text-[8px] font-semibold truncate cursor-pointer hover:opacity-80 transition-opacity leading-tight",
                                                        isOverdue ? "bg-danger/15 text-danger" : "",
                                                        isUrgent && !isOverdue ? "bg-danger/15 text-danger" : "",
                                                        !isUrgent && !isOverdue ? "bg-primary/15 text-primary" : "",
                                                    ].join(" ")}
                                                    onClick={(e) => { e.stopPropagation(); window.open(task.url, "_blank"); }}
                                                    title={task.title}
                                                >
                                                    <span class="shrink-0 w-2.5 h-2.5 flex items-center justify-center">
                                                        {isOverdue ? <Clock class="w-2 h-2" /> : isUrgent ? <AlertCircle class="w-2 h-2" /> : <FileText class="w-2 h-2" />}
                                                    </span>
                                                    <span class="truncate">{task.title}</span>
                                                </div>
                                            );
                                        })}
                                        {dayTasks.length > 2 && (
                                            <span class="text-[8px] text-content-muted pl-1 font-medium">+{dayTasks.length - 2}</span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Right: Full task list always visible */}
                <div class="flex-1 flex flex-col bg-page-secondary rounded-2xl border-2 border-edge h-112.5">
                    {/* List header */}
                    <div class="px-4 py-3 border-b-2 border-edge shrink-0">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <h3 class="font-bold text-sm text-content">
                                    {selectedDay
                                        ? new Date(viewYear, viewMonth, selectedDay).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
                                        : "All Tasks"}
                                </h3>
                                <span class="text-xs px-2 py-0.5 rounded-lg bg-edge text-content-muted font-medium">
                                    {selectedTasks ? selectedTasks.length : deadlines.length}
                                </span>
                            </div>
                            {selectedDay && (
                                <button
                                    onClick={() => setSelectedDay(null)}
                                    class="flex items-center gap-1 text-xs text-content-muted hover:text-content transition-colors cursor-pointer"
                                >
                                    <X class="w-3 h-3" />
                                    Show all
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Task list */}
                    <div class="flex-1 overflow-y-auto scrollbar-thin">
                        <div class="space-y-1.5 p-3">
                        {(selectedTasks ?? deadlines.slice().sort((a, b) => a.dueTimestamp - b.dueTimestamp)).map(task => {
                            const diff = task.dueTimestamp * 1000 - Date.now();
                            const isUrgent = diff > 0 && diff <= 48 * 60 * 60 * 1000;
                            const isOverdue = diff < 0;

                            return (
                                <div
                                    key={task.id}
                                    class="flex items-start gap-3 p-3 rounded-xl border-2 border-edge bg-page hover:border-primary cursor-pointer transition-colors group"
                                    onClick={() => window.open(task.url, "_blank")}
                                >
                                    <div class={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                        isOverdue
                                            ? "bg-danger/20"
                                            : isUrgent
                                            ? "bg-danger"
                                            : "bg-primary/15"
                                    }`}>
                                        {isOverdue
                                            ? <Clock class="w-4 h-4 text-danger" />
                                            : isUrgent
                                            ? <AlertCircle class="w-4 h-4 text-white" />
                                            : <FileText class="w-4 h-4 text-primary" />
                                        }
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <p class="font-bold text-sm text-content">{task.title}</p>
                                        <div class="flex items-center gap-2 mt-1">
                                            <span class="text-xs font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">
                                                {task.courseCode}
                                            </span>
                                            <span class="text-xs text-content-muted">·</span>
                                            <span class="text-xs text-content-muted">{task.module}</span>
                                        </div>
                                    </div>
                                    <span class={`text-xs font-bold shrink-0 mt-1 ${
                                        isOverdue ? "text-danger" : isUrgent ? "text-danger" : "text-content-muted"
                                    }`}>
                                        {formatDueDate(task.dueTimestamp * 1000)}
                                    </span>
                                </div>
                            );
                        })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
