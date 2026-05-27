import { useState, useEffect, useMemo } from "preact/hooks";
import { loadDeadlinesByTimesort } from "../stores/indexeddb/deadline";
import { Deadline } from "../types/scele";
import { Clock, AlertCircle, FileText, ChevronLeft, ChevronRight, X } from "lucide-preact";

const DAYS    = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS  = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function isSameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getMonthCells(year: number, month: number): (Date | null)[] {
    const firstDay    = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++)         cells.push(null);
    for (let d = 1; d <= daysInMonth; d++)      cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0)              cells.push(null);
    return cells;
}

function dayKey(d: Date) { return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }

function formatRelative(ts: number): string {
    const date = new Date(ts * 1000);
    const diff = date.getTime() - Date.now();
    const h = Math.ceil(diff / 3600000);
    if (diff < 0)   return "Overdue";
    if (h <= 24)    return `Today ${date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
    if (h <= 48)    return "Tomorrow";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function TasksPage() {
    const [deadlines, setDeadlines] = useState<Deadline[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
    const [viewYear,  setViewYear]  = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());

    useEffect(() => {
        loadDeadlinesByTimesort()
            .then(({ deadlines: d }) => { setDeadlines(d); setIsLoading(false); })
            .catch(() => setIsLoading(false));
    }, []);

    const prevMonth = () => viewMonth === 0  ? (setViewMonth(11), setViewYear(y => y - 1)) : setViewMonth(m => m - 1);
    const nextMonth = () => viewMonth === 11 ? (setViewMonth(0),  setViewYear(y => y + 1)) : setViewMonth(m => m + 1);
    const goToday   = () => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); setSelectedDate(today); };

    const cells    = useMemo(() => getMonthCells(viewYear, viewMonth), [viewYear, viewMonth]);
    const numWeeks = cells.length / 7;

    const byDay = useMemo(() => {
        const map = new Map<string, Deadline[]>();
        for (const d of deadlines) {
            const k = dayKey(new Date(d.dueTimestamp * 1000));
            if (!map.has(k)) map.set(k, []);
            map.get(k)!.push(d);
        }
        map.forEach(arr => arr.sort((a, b) => a.dueTimestamp - b.dueTimestamp));
        return map;
    }, [deadlines]);

    const overdue  = deadlines.filter(d => d.dueTimestamp * 1000 < Date.now());
    const upcoming = useMemo(() =>
        deadlines
            .filter(d => d.dueTimestamp * 1000 >= Date.now() - 86400000)
            .sort((a, b) => a.dueTimestamp - b.dueTimestamp),
        [deadlines]
    );

    const selectedTasks = selectedDate ? (byDay.get(dayKey(selectedDate)) ?? []) : null;
    const panelTasks    = selectedTasks ?? upcoming;

    if (isLoading) {
        return (
            <div class="flex items-center justify-center h-full">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    return (
        <div class="h-full flex flex-col">
            {/* Top bar */}
            <div class="px-4 py-2.5 flex items-center gap-3 shrink-0 border-b-2 border-edge">
                <div class="flex items-center gap-1">
                    <button onClick={prevMonth} class="p-1.5 rounded-lg hover:bg-edge transition-colors cursor-pointer">
                        <ChevronLeft class="w-4 h-4 text-content-muted" />
                    </button>
                    <span class="font-bold text-base text-content w-44 text-center">
                        {MONTHS[viewMonth]} {viewYear}
                    </span>
                    <button onClick={nextMonth} class="p-1.5 rounded-lg hover:bg-edge transition-colors cursor-pointer">
                        <ChevronRight class="w-4 h-4 text-content-muted" />
                    </button>
                </div>
                <button
                    onClick={goToday}
                    class="px-3 py-1.5 text-xs font-semibold rounded-lg border-2 border-edge hover:bg-edge transition-colors cursor-pointer text-content"
                >
                    Today
                </button>
                <div class="flex items-center gap-3 ml-auto text-xs">
                    {overdue.length > 0 && (
                        <span class="font-semibold text-danger">{overdue.length} overdue</span>
                    )}
                    <span class="text-content-muted">{deadlines.length} tasks total</span>
                </div>
            </div>

            {/* Calendar + side panel */}
            <div class="flex flex-1 min-h-0">
                {/* Calendar */}
                <div class="flex-1 flex flex-col min-w-0">
                    {/* Day name header row */}
                    <div class="grid grid-cols-7 border-b-2 border-edge shrink-0 bg-primary">
                        {DAYS.map(d => (
                            <div key={d} class="py-2 text-center text-[11px] font-bold uppercase tracking-wide text-on-primary">
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* Month grid — fills remaining height */}
                    <div
                        class="flex-1 grid grid-cols-7"
                        style={{ gridTemplateRows: `repeat(${numWeeks}, 1fr)` }}
                    >
                        {cells.map((date, idx) => {
                            if (!date) return (
                                <div key={idx} class="border-r border-b border-edge/40 bg-page-secondary/30" />
                            );

                            const tasks     = byDay.get(dayKey(date)) ?? [];
                            const isToday   = isSameDay(date, today);
                            const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;

                            return (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedDate(isSelected ? null : date)}
                                    class={[
                                        "border-r border-b border-edge/40 p-1 text-left transition-colors cursor-pointer flex flex-col gap-0.5 overflow-hidden",
                                        isSelected ? "bg-primary/10 ring-1 ring-inset ring-primary" : "hover:bg-edge/20",
                                    ].join(" ")}
                                >
                                    <span class={[
                                        "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold self-end shrink-0",
                                        isToday ? "bg-primary text-on-primary" : "text-content-muted",
                                    ].join(" ")}>
                                        {date.getDate()}
                                    </span>
                                    <div class="flex flex-col gap-0.5 w-full min-h-0">
                                        {tasks.slice(0, 3).map((task, ti) => {
                                            const diff    = task.dueTimestamp * 1000 - Date.now();
                                            const isOv    = diff < 0;
                                            const urgent  = diff > 0 && diff <= 48 * 3600000;
                                            return (
                                                <div
                                                    key={ti}
                                                    title={task.title}
                                                    onClick={(e) => { e.stopPropagation(); window.open(task.url, "_blank"); }}
                                                    class={[
                                                        "text-[10px] font-semibold px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-75 transition-opacity leading-tight",
                                                        isOv || urgent ? "bg-danger/15 text-danger" : "bg-primary/15 text-primary",
                                                    ].join(" ")}
                                                >
                                                    {task.title}
                                                </div>
                                            );
                                        })}
                                        {tasks.length > 3 && (
                                            <span class="text-[10px] text-content-muted pl-1 leading-tight">
                                                +{tasks.length - 3} more
                                            </span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Right panel */}
                <div class="w-72 shrink-0 border-l-2 border-edge flex flex-col">
                    <div class="px-4 py-3 border-b-2 border-edge shrink-0 flex items-center justify-between">
                        <div>
                            <h3 class="font-bold text-sm text-content">
                                {selectedDate
                                    ? selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
                                    : "Upcoming"}
                            </h3>
                            <span class="text-xs text-content-muted">
                                {panelTasks.length} task{panelTasks.length !== 1 ? "s" : ""}
                            </span>
                        </div>
                        {selectedDate && (
                            <button
                                onClick={() => setSelectedDate(null)}
                                class="p-1 rounded-lg hover:bg-edge transition-colors cursor-pointer"
                            >
                                <X class="w-3.5 h-3.5 text-content-muted" />
                            </button>
                        )}
                    </div>

                    <div class="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">
                        {panelTasks.length === 0 ? (
                            <div class="text-center py-8 text-sm text-content-muted">No tasks</div>
                        ) : panelTasks.map(task => {
                            const diff   = task.dueTimestamp * 1000 - Date.now();
                            const isOv   = diff < 0;
                            const urgent = diff > 0 && diff <= 48 * 3600000;
                            return (
                                <div
                                    key={task.id}
                                    class="flex items-start gap-3 p-3 rounded-xl border-2 border-edge bg-page hover:border-primary cursor-pointer transition-colors"
                                    onClick={() => window.open(task.url, "_blank")}
                                >
                                    <div class={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                        isOv || urgent ? "bg-danger/15" : "bg-primary/15"
                                    }`}>
                                        {isOv
                                            ? <Clock class="w-4 h-4 text-danger" />
                                            : urgent
                                            ? <AlertCircle class="w-4 h-4 text-danger" />
                                            : <FileText class="w-4 h-4 text-primary" />
                                        }
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <p class="font-bold text-sm text-content leading-snug">{task.title}</p>
                                        <div class="flex items-center gap-1.5 mt-1 flex-wrap">
                                            <span class="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                                {task.courseCode}
                                            </span>
                                            <span class={`text-[10px] font-semibold ${isOv ? "text-danger" : "text-content-muted"}`}>
                                                {formatRelative(task.dueTimestamp)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
