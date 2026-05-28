import { useState, useRef, useCallback } from "preact/hooks";
import {
    Trophy, Flame, BookOpen, AlertCircle, CheckCircle,
    Zap, Star, TrendingUp, Download, Share2, ChevronDown, Moon, Sun,
} from "lucide-preact";
import { theme } from "../stores/theme";

// ── Mock data ─────────────────────────────────────────────────────────────────
// Real shape: derived from deadline cache + block_recentlyaccesseditems + core_course_get_recent_courses

const MOCK = {
    semester:       "Even 2024/2025",
    userName:       "Kevin",
    totalCourses:   8,
    totalDeadlines: 47,
    onTime:         38,
    overdue:        9,
    busiestMonth:   { name: "October", count: 14 },
    busiestWeek:    "Week 3 of October",
    topCourses: [
        { name: "Basis Data",        count: 12 },
        { name: "Sistem Operasi",    count: 10 },
        { name: "Pemrogaman Lanjut", count:  8 },
    ],
    // from block_recentlyaccesseditems_get_recent_items (timeaccess timestamps)
    accessByHour: [
        // index = hour 0–23, value = relative frequency 0–100
        5, 2, 8, 14, 3, 1, 2, 4, 12, 18, 22, 25,
        30, 28, 20, 18, 22, 35, 48, 60, 72, 55, 38, 20,
    ],
    midnightSessions: 23,       // accesses between 00:00–04:00
    peakHour:         21,       // 21:00 = 9 PM
    mostVisitedCourse: "Basis Data",
    mostAccessedModule: { type: "assign", label: "Assignments" },
    nightOwlPct: 42,            // % of accesses after 10 PM
    longestStreak:  { value: "18 days", month: "November" },
    personality:    "Night Owl",
    personalityDesc: "42% of your SCELE activity happens after 10 PM. The night is your study hall.",
};

const onTimePct = Math.round((MOCK.onTime / MOCK.totalDeadlines) * 100);

// ── Theme CSS variable shortcuts ──────────────────────────────────────────────

const css = {
    primary:         "var(--theme-primary)",
    onPrimary:       "var(--theme-on-primary)",
    page:            "var(--theme-page)",
    pageSec:         "var(--theme-page-secondary)",
    edge:            "var(--theme-edge)",
    content:         "var(--theme-content)",
    muted:           "var(--theme-content-muted)",
    danger:          "var(--theme-danger)",
    highlight:       "var(--theme-highlight)",
    primaryA12:      "color-mix(in srgb, var(--theme-primary) 12%, transparent)",
    primaryA20:      "color-mix(in srgb, var(--theme-primary) 20%, transparent)",
    onPrimaryA60:    "color-mix(in srgb, var(--theme-on-primary) 60%, transparent)",
    onPrimaryA30:    "color-mix(in srgb, var(--theme-on-primary) 30%, transparent)",
    dangerA12:       "color-mix(in srgb, var(--theme-danger) 12%, transparent)",
    highlightA20:    "color-mix(in srgb, var(--theme-highlight) 20%, transparent)",
};

// ── Layout helpers ────────────────────────────────────────────────────────────

function Slide({ children, bg }: { children: any; bg?: string }) {
    return (
        <div
            class="snap-start min-h-screen w-full flex flex-col items-center justify-center px-8 py-20"
            style={{ backgroundColor: bg ?? css.page }}
        >
            {children}
        </div>
    );
}

function Tag({ children }: { children: any }) {
    return (
        <span
            class="self-start text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
            style={{ backgroundColor: css.primaryA12, color: css.primary }}
        >
            {children}
        </span>
    );
}

// ── Slides ────────────────────────────────────────────────────────────────────

function HeroSlide() {
    return (
        <Slide bg={css.primary}>
            <div class="flex flex-col items-center gap-8 text-center max-w-xs">
                <div class="w-24 h-24 rounded-3xl flex items-center justify-center" style={{ backgroundColor: css.onPrimaryA30 }}>
                    <Star class="w-12 h-12" style={{ color: css.onPrimary }} />
                </div>
                <div class="flex flex-col gap-3">
                    <span class="text-[10px] font-black uppercase tracking-widest" style={{ color: css.onPrimaryA60 }}>
                        Your Semester Recap
                    </span>
                    <h1 class="text-5xl font-black leading-tight" style={{ color: css.onPrimary }}>
                        Sceless<br />Wrapped
                    </h1>
                    <p class="text-sm font-semibold" style={{ color: css.onPrimaryA60 }}>
                        {MOCK.semester} · {MOCK.userName}
                    </p>
                </div>
                <div class="flex flex-col items-center gap-1 animate-bounce">
                    <ChevronDown class="w-5 h-5" style={{ color: css.onPrimaryA60 }} />
                    <span class="text-[10px]" style={{ color: css.onPrimaryA30 }}>scroll</span>
                </div>
            </div>
        </Slide>
    );
}

function OverviewSlide() {
    return (
        <Slide>
            <div class="flex flex-col gap-8 max-w-sm w-full">
                <div class="flex flex-col gap-3">
                    <Tag>This semester</Tag>
                    <h2 class="text-4xl font-black leading-snug" style={{ color: css.content }}>
                        You faced<br />{MOCK.totalDeadlines} deadlines
                    </h2>
                </div>
                <div class="flex flex-col gap-4">
                    <div class="p-6 rounded-2xl flex items-center gap-5" style={{ backgroundColor: css.primary }}>
                        <BookOpen class="w-10 h-10 shrink-0" style={{ color: css.onPrimary, opacity: 0.8 }} />
                        <div>
                            <p class="text-6xl font-black" style={{ color: css.onPrimary }}>{MOCK.totalCourses}</p>
                            <p class="text-sm font-semibold" style={{ color: css.onPrimaryA60 }}>active courses</p>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div class="p-4 rounded-xl flex flex-col gap-1.5" style={{ backgroundColor: css.primaryA12, border: `1px solid ${css.edge}` }}>
                            <CheckCircle class="w-5 h-5" style={{ color: css.primary }} />
                            <p class="text-3xl font-black" style={{ color: css.content }}>{MOCK.onTime}</p>
                            <p class="text-xs font-semibold" style={{ color: css.muted }}>on time</p>
                        </div>
                        <div class="p-4 rounded-xl flex flex-col gap-1.5" style={{ backgroundColor: css.dangerA12, border: `1px solid ${css.edge}` }}>
                            <AlertCircle class="w-5 h-5" style={{ color: css.danger }} />
                            <p class="text-3xl font-black" style={{ color: css.danger }}>{MOCK.overdue}</p>
                            <p class="text-xs font-semibold" style={{ color: css.muted }}>overdue</p>
                        </div>
                    </div>
                    <div class="space-y-2">
                        <div class="relative h-2 rounded-full overflow-hidden" style={{ backgroundColor: css.edge }}>
                            <div class="absolute left-0 top-0 h-full rounded-full" style={{ width: `${onTimePct}%`, backgroundColor: css.primary }} />
                        </div>
                        <p class="text-xs text-center font-semibold" style={{ color: css.muted }}>{onTimePct}% on-time rate</p>
                    </div>
                </div>
            </div>
        </Slide>
    );
}

function BusiestSlide() {
    return (
        <Slide bg={css.pageSec}>
            <div class="flex flex-col gap-8 max-w-sm w-full">
                <div class="flex flex-col gap-3">
                    <Tag>Peak chaos</Tag>
                    <h2 class="text-4xl font-black leading-snug" style={{ color: css.content }}>
                        Your craziest<br />month
                    </h2>
                </div>
                <div class="p-10 rounded-2xl flex flex-col items-center gap-4 text-center" style={{ backgroundColor: css.primary }}>
                    <Flame class="w-12 h-12" style={{ color: css.onPrimary, opacity: 0.9 }} />
                    <p class="text-7xl font-black leading-none" style={{ color: css.onPrimary }}>{MOCK.busiestMonth.name}</p>
                    <p class="font-semibold text-base" style={{ color: css.onPrimaryA60 }}>
                        {MOCK.busiestMonth.count} deadlines — {MOCK.busiestWeek} was brutal
                    </p>
                </div>
                <p class="text-sm text-center" style={{ color: css.muted }}>
                    That's more than 3 deadlines a week. You survived.
                </p>
            </div>
        </Slide>
    );
}

function CoursesSlide() {
    const barColors = [css.primary, css.highlight, css.danger];
    const max = Math.max(...MOCK.topCourses.map(c => c.count));
    return (
        <Slide>
            <div class="flex flex-col gap-8 max-w-sm w-full">
                <div class="flex flex-col gap-3">
                    <Tag>Most demanding</Tag>
                    <h2 class="text-4xl font-black leading-snug" style={{ color: css.content }}>
                        Your top<br />courses
                    </h2>
                </div>
                <div class="flex flex-col gap-4">
                    {MOCK.topCourses.map((c, i) => (
                        <div key={c.name} class="flex flex-col gap-1.5">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-2">
                                    <span class="text-xs font-black" style={{ color: barColors[i] }}>#{i + 1}</span>
                                    <span class="text-sm font-bold" style={{ color: css.content }}>{c.name}</span>
                                </div>
                                <span class="text-sm font-black" style={{ color: css.content }}>{c.count}</span>
                            </div>
                            <div class="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: css.edge }}>
                                <div
                                    class="h-full rounded-full"
                                    style={{ width: `${(c.count / max) * 100}%`, backgroundColor: barColors[i] }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
                <p class="text-xs text-center" style={{ color: css.muted }}>by number of deadlines</p>
            </div>
        </Slide>
    );
}

function NightOwlSlide() {
    const peak = MOCK.peakHour;
    const peakLabel = peak === 0 ? "midnight" : peak < 12 ? `${peak} AM` : peak === 12 ? "noon" : `${peak - 12} PM`;
    const maxBar = Math.max(...MOCK.accessByHour);

    // only render every-other hour label to avoid crowding
    const hourLabels = ["12a","","2a","","4a","","6a","","8a","","10a","","12p","","2p","","4p","","6p","","8p","","10p",""];

    return (
        <Slide bg={css.pageSec}>
            <div class="flex flex-col gap-8 max-w-sm w-full">
                <div class="flex flex-col gap-3">
                    <Tag>Your rhythm</Tag>
                    <h2 class="text-4xl font-black leading-snug" style={{ color: css.content }}>
                        You peak at<br />{peakLabel} 🌙
                    </h2>
                </div>

                {/* 24-hour activity bar chart */}
                <div class="flex flex-col gap-2">
                    <div class="flex items-end gap-px h-20 w-full">
                        {MOCK.accessByHour.map((v, h) => {
                            const isNight = h >= 22 || h < 4;
                            const isPeak  = h === peak;
                            return (
                                <div
                                    key={h}
                                    class="flex-1 rounded-sm transition-all"
                                    style={{
                                        height: `${Math.max(4, (v / maxBar) * 100)}%`,
                                        backgroundColor: isPeak ? css.primary : isNight ? css.highlight : css.edge,
                                        opacity: isPeak ? 1 : 0.7,
                                    }}
                                />
                            );
                        })}
                    </div>
                    <div class="flex w-full">
                        {hourLabels.map((l, i) => (
                            <span key={i} class="flex-1 text-[8px] text-center" style={{ color: css.muted }}>{l}</span>
                        ))}
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div class="p-4 rounded-xl flex flex-col gap-1" style={{ backgroundColor: css.primaryA12 }}>
                        <Moon class="w-5 h-5" style={{ color: css.primary }} />
                        <p class="text-2xl font-black" style={{ color: css.content }}>{MOCK.nightOwlPct}%</p>
                        <p class="text-xs font-semibold" style={{ color: css.muted }}>activity after 10 PM</p>
                    </div>
                    <div class="p-4 rounded-xl flex flex-col gap-1" style={{ backgroundColor: css.highlightA20 }}>
                        <Sun class="w-5 h-5" style={{ color: css.highlight }} />
                        <p class="text-2xl font-black" style={{ color: css.content }}>{MOCK.midnightSessions}</p>
                        <p class="text-xs font-semibold" style={{ color: css.muted }}>midnight sessions</p>
                    </div>
                </div>
            </div>
        </Slide>
    );
}

function MidnightSlide() {
    return (
        <Slide bg={css.primary}>
            <div class="flex flex-col gap-8 max-w-sm w-full items-center text-center">
                <div class="text-7xl">🌙</div>
                <div class="flex flex-col gap-4">
                    <span class="text-[10px] font-black uppercase tracking-widest" style={{ color: css.onPrimaryA60 }}>
                        Midnight grind
                    </span>
                    <h2 class="text-6xl font-black leading-tight" style={{ color: css.onPrimary }}>
                        {MOCK.midnightSessions}<br /><span class="text-3xl">late nights</span>
                    </h2>
                    <p class="font-medium text-base" style={{ color: css.onPrimaryA60 }}>
                        You opened SCELE between<br />
                        <strong style={{ color: css.onPrimary }}>midnight and 4 AM</strong> this semester.<br />
                        Sleep is optional apparently.
                    </p>
                </div>
                <div class="flex gap-3">
                    {["🍵", "☕", "💻"].map(e => (
                        <span key={e} class="text-3xl">{e}</span>
                    ))}
                </div>
            </div>
        </Slide>
    );
}

function StreakSlide() {
    return (
        <Slide bg={css.pageSec}>
            <div class="flex flex-col gap-8 max-w-sm w-full items-center text-center">
                <div class="w-28 h-28 rounded-3xl flex items-center justify-center" style={{ backgroundColor: css.primaryA12 }}>
                    <TrendingUp class="w-14 h-14" style={{ color: css.primary }} />
                </div>
                <div class="flex flex-col gap-3 items-center">
                    <Tag>Best streak</Tag>
                    <h2 class="text-6xl font-black" style={{ color: css.content }}>{MOCK.longestStreak.value}</h2>
                    <p class="font-medium" style={{ color: css.muted }}>without a single overdue deadline</p>
                    <span class="text-sm font-black" style={{ color: css.primary }}>{MOCK.longestStreak.month}</span>
                </div>
            </div>
        </Slide>
    );
}

function PersonalitySlide() {
    const isNight = MOCK.personality === "Night Owl";
    return (
        <Slide>
            <div class="flex flex-col gap-8 max-w-sm w-full items-center text-center">
                <div class="text-8xl">{isNight ? "🦉" : "☀️"}</div>
                <div class="flex flex-col gap-3 items-center">
                    <Tag>You are a</Tag>
                    <h2 class="text-4xl font-black mt-1" style={{ color: css.primary }}>{MOCK.personality}</h2>
                    <p class="text-sm leading-relaxed max-w-xs" style={{ color: css.muted }}>{MOCK.personalityDesc}</p>
                </div>
                <div class="grid grid-cols-3 gap-3 w-full">
                    {[
                        { icon: Moon,   label: "Night grinder" },
                        { icon: Zap,    label: "Deadline fighter" },
                        { icon: Trophy, label: "Survivor" },
                    ].map(({ icon: Icon, label }) => (
                        <div key={label} class="p-4 rounded-xl flex flex-col items-center gap-2" style={{ backgroundColor: css.primaryA12 }}>
                            <Icon class="w-6 h-6" style={{ color: css.primary }} />
                            <span class="text-[10px] font-bold text-center leading-tight" style={{ color: css.content }}>{label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </Slide>
    );
}

function EndSlide() {
    return (
        <Slide bg={css.primary}>
            <div class="flex flex-col items-center gap-8 text-center max-w-sm">
                <Trophy class="w-20 h-20" style={{ color: css.onPrimary, opacity: 0.9 }} />
                <div class="flex flex-col gap-4">
                    <h2 class="text-5xl font-black leading-tight" style={{ color: css.onPrimary }}>
                        See you next<br />semester 👋
                    </h2>
                    <p class="text-base font-medium" style={{ color: css.onPrimaryA60 }}>
                        {MOCK.totalDeadlines} deadlines down. {MOCK.midnightSessions} midnight sessions.<br />You made it.
                    </p>
                </div>
                <p class="text-xs" style={{ color: css.onPrimaryA30 }}>
                    Sceless · {MOCK.semester}
                </p>
            </div>
        </Slide>
    );
}

// ── Registry ──────────────────────────────────────────────────────────────────

const SLIDES = [
    HeroSlide, OverviewSlide, BusiestSlide, CoursesSlide,
    NightOwlSlide, MidnightSlide, StreakSlide, PersonalitySlide, EndSlide,
];

const SLIDE_LABELS = [
    "Cover", "Overview", "Busiest Month", "Top Courses",
    "Your Rhythm", "Midnight Grind", "Best Streak", "Personality", "Finale",
];

// ── Compact export card (hidden, captured by html-to-image) ──────────────────

// ── Root ──────────────────────────────────────────────────────────────────────

export default function WrappedPage() {
    const [current,   setCurrent]   = useState(0);
    const [exporting, setExporting] = useState(false);
    const compactRef = useRef<HTMLDivElement>(null);
    const scrollRef  = useRef<HTMLDivElement>(null);

    const handleScroll = (e: Event) => {
        const el = e.target as HTMLElement;
        setCurrent(Math.round(el.scrollTop / el.clientHeight));
    };

    const scrollTo = (i: number) => {
        scrollRef.current?.scrollTo({ top: i * (scrollRef.current.clientHeight), behavior: "smooth" });
    };

    const captureCard = useCallback(async (): Promise<string> => {
        const el = compactRef.current!;
        el.style.left = "0";
        el.style.zIndex = "-1";
        const { toPng } = await import("html-to-image");
        const url = await toPng(el, { width: el.offsetWidth, height: el.offsetHeight, pixelRatio: 2 });
        el.style.left = "-9999px";
        el.style.zIndex = "";
        return url;
    }, []);

    const handleSaveImage = useCallback(async () => {
        if (!compactRef.current) return;
        setExporting(true);
        try {
            const url = await captureCard();
            const a = document.createElement("a");
            a.href = url;
            a.download = "sceless-wrapped.png";
            a.click();
        } finally {
            setExporting(false);
        }
    }, [captureCard]);

    const handleShare = useCallback(async () => {
        if (!compactRef.current) return;
        setExporting(true);
        try {
            const dataUrl = await captureCard();
            const blob = await (await fetch(dataUrl)).blob();
            const file = new File([blob], "sceless-wrapped.png", { type: "image/png" });
            await navigator.share({ files: [file] });
        } catch {
            // share not supported — fall back to download
            const dataUrl = await captureCard();
            const a = document.createElement("a");
            a.href = dataUrl;
            a.download = "sceless-wrapped.png";
            a.click();
        } finally {
            setExporting(false);
        }
    }, [captureCard]);

    // Use actual hex colors from theme signal — html-to-image can't resolve color-mix() or CSS vars
    const t = theme.value;

    return (
        <div class="relative h-screen w-screen overflow-hidden" style={{ backgroundColor: css.page }}>
            {/* Compact export card — off-screen, captured by html-to-image with real hex colors */}
            <div
                ref={compactRef}
                style={{
                    position: "fixed", left: "-9999px", top: "0",
                    width: "540px",
                    backgroundColor: t.bg,
                    borderRadius: "20px",
                    overflow: "hidden",
                    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                }}
            >
                {/* Header */}
                <div style={{ backgroundColor: t.primary, padding: "24px 28px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                            <p style={{ color: t.onPrimary, opacity: 0.6, fontSize: "10px", fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", margin: 0 }}>
                                Sceless Wrapped · {MOCK.semester}
                            </p>
                            <p style={{ color: t.onPrimary, fontSize: "22px", fontWeight: 900, margin: "4px 0 0" }}>
                                {MOCK.userName}'s semester
                            </p>
                        </div>
                        <div style={{ fontSize: "36px" }}>🦉</div>
                    </div>
                    <div style={{ marginTop: "16px" }}>
                        <div style={{ background: t.onPrimary, opacity: 0.25, borderRadius: "4px", height: "6px", overflow: "hidden" }}>
                            <div style={{ width: `${onTimePct}%`, height: "100%", backgroundColor: t.onPrimary, borderRadius: "4px", opacity: 1 }} />
                        </div>
                        <p style={{ color: t.onPrimary, opacity: 0.6, fontSize: "10px", fontWeight: 700, margin: "6px 0 0" }}>
                            {onTimePct}% on-time · {MOCK.totalDeadlines} total deadlines
                        </p>
                    </div>
                </div>

                {/* Stat grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1px", background: t.border }}>
                    {[
                        { label: "Courses",        value: MOCK.totalCourses,                       color: t.primary  },
                        { label: "On Time",         value: `${MOCK.onTime}/${MOCK.totalDeadlines}`, color: t.primary  },
                        { label: "Overdue",         value: MOCK.overdue,                            color: t.danger   },
                        { label: "Busiest Month",   value: MOCK.busiestMonth.name,                  color: t.primary  },
                        { label: "Midnight Nights", value: MOCK.midnightSessions,                   color: t.highlight},
                        { label: "Best Streak",     value: MOCK.longestStreak.value,                color: t.primary  },
                        { label: "Peak Hour",       value: `${MOCK.peakHour > 12 ? MOCK.peakHour - 12 : MOCK.peakHour}${MOCK.peakHour >= 12 ? "PM" : "AM"}`, color: t.primary },
                        { label: "Personality",     value: MOCK.personality,                        color: t.primary  },
                    ].map(({ label, value, color }) => (
                        <div key={label} style={{ backgroundColor: t.bg, padding: "14px 12px", display: "flex", flexDirection: "column", gap: "4px" }}>
                            <p style={{ color, fontSize: "15px", fontWeight: 900, margin: 0, lineHeight: 1.1 }}>{value}</p>
                            <p style={{ color: t.textMuted, fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>{label}</p>
                        </div>
                    ))}
                </div>

                {/* Top courses */}
                <div style={{ padding: "16px 20px", borderTop: `1px solid ${t.border}` }}>
                    <p style={{ color: t.textMuted, fontSize: "9px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 10px" }}>
                        Most demanding courses
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {MOCK.topCourses.map((c, i) => (
                            <div key={c.name} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <span style={{ color: t.textMuted, fontSize: "10px", fontWeight: 900, width: "14px" }}>#{i + 1}</span>
                                <span style={{ color: t.text, fontSize: "11px", fontWeight: 700, flex: 1 }}>{c.name}</span>
                                <div style={{ width: "80px", height: "4px", borderRadius: "2px", background: t.border, overflow: "hidden" }}>
                                    <div style={{ width: `${Math.round((c.count / MOCK.topCourses[0].count) * 100)}%`, height: "100%", backgroundColor: t.primary, borderRadius: "2px" }} />
                                </div>
                                <span style={{ color: t.text, fontSize: "11px", fontWeight: 900, width: "20px", textAlign: "right" }}>{c.count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div style={{ padding: "10px 20px", borderTop: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between" }}>
                    <p style={{ color: t.textMuted, fontSize: "9px", fontWeight: 700, margin: 0 }}>sceless.cornellius.dev</p>
                    <p style={{ color: t.textMuted, fontSize: "9px", fontWeight: 700, margin: 0 }}>{MOCK.semester}</p>
                </div>
            </div>

            {/* Scroll container */}
            <div
                ref={scrollRef}
                id="wrapped-scroll"
                class="h-full w-full overflow-y-scroll snap-y snap-mandatory"
                style={{ scrollbarWidth: "none" }}
                onScroll={handleScroll}
            >
                {SLIDES.map((S, i) => (
                    <div key={i}>
                        <S />
                    </div>
                ))}
            </div>

            {/* Dot nav */}
            <div class="no-print absolute right-5 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-10">
                {SLIDES.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => scrollTo(i)}
                        class="w-1.5 rounded-full transition-all cursor-pointer"
                        style={{
                            height:          i === current ? "24px" : "6px",
                            backgroundColor: i === current ? css.primary : css.edge,
                        }}
                        title={SLIDE_LABELS[i]}
                    />
                ))}
            </div>

            {/* Toolbar */}
            <div
                class="no-print absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2.5 rounded-2xl z-10"
                style={{ backgroundColor: css.page, border: `2px solid ${css.edge}`, boxShadow: "0 4px 24px rgba(0,0,0,0.12)" }}
            >
                <span class="text-xs font-bold" style={{ color: css.muted }}>
                    {current + 1} / {SLIDES.length}
                </span>
                <div class="w-px h-4 mx-1" style={{ backgroundColor: css.edge }} />
                <button
                    onClick={handleSaveImage}
                    disabled={exporting}
                    class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                    style={{ backgroundColor: css.primaryA12, color: css.primary }}
                >
                    <Download class="w-3.5 h-3.5" />
                    {exporting ? "Saving…" : "Save"}
                </button>
                <button
                    onClick={handleShare}
                    disabled={exporting}
                    class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                    style={{ backgroundColor: "#000", color: "#fff" }}
                >
                    <Share2 class="w-3.5 h-3.5" />
                    Share
                </button>
            </div>
        </div>
    );
}
