import { useState, useRef, useCallback, useEffect } from "preact/hooks";
import {
    Trophy, Flame, BookOpen, AlertCircle,
    Zap, Star, TrendingUp, Download, Share2, ChevronDown, Moon, Sun,
    Compass, Gamepad2, Briefcase, Coffee, Laptop, Heart,
} from "lucide-preact";
import { theme } from "../stores/theme";
import type { ThemeConfig } from "../types/themes";
import type { Tab } from "../types/state";
import { LogoL } from "../components/ui/Logo";
import { SCELE_URL, WRAPPED_ENABLED } from "../config";
import { getActivityStats } from "../stores/indexeddb/activity";
import { loadSiteInfo } from "../stores/indexeddb/siteinfo";
import { courses } from "../stores/indexeddb/course";
import { wrappedSnapshotStorage } from "../storage";

export const WrappedTab: Tab = {
    type: "wrapped",
    id: "page",
    title: "Wrapped",
    url: `${SCELE_URL}/sceless/wrapped`,
};

// ── CSS variable shortcuts ────────────────────────────────────────────────────

const css = {
    primary:      "var(--theme-primary)",
    onPrimary:    "var(--theme-on-primary)",
    page:         "var(--theme-page)",
    pageSec:      "var(--theme-page-secondary)",
    edge:         "var(--theme-edge)",
    content:      "var(--theme-content)",
    muted:        "var(--theme-content-muted)",
    danger:       "var(--theme-danger)",
    highlight:    "var(--theme-highlight)",
    primaryA12:   "color-mix(in srgb, var(--theme-primary) 12%, transparent)",
    primaryA20:   "color-mix(in srgb, var(--theme-primary) 20%, transparent)",
    onPrimaryA60: "color-mix(in srgb, var(--theme-on-primary) 60%, transparent)",
    onPrimaryA30: "color-mix(in srgb, var(--theme-on-primary) 30%, transparent)",
    dangerA12:    "color-mix(in srgb, var(--theme-danger) 12%, transparent)",
    highlightA20: "color-mix(in srgb, var(--theme-highlight) 20%, transparent)",
};

// ── Derived data helpers ──────────────────────────────────────────────────────

function calculateLongestStreak(activeDays: string[]): { days: number; monthLabel: string } {
    if (activeDays.length === 0) return { days: 0, monthLabel: "" };
    const sorted = [...activeDays].sort();
    let best = 1, current = 1, bestEnd = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
        const diff = (new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()) / 86400000;
        if (diff === 1) { current++; if (current > best) { best = current; bestEnd = sorted[i]; } }
        else current = 1;
    }
    const monthLabel = new Date(bestEnd + "T12:00:00").toLocaleDateString("en-US", { month: "long" });
    return { days: best, monthLabel };
}

function busiestMonth(dailyActivity: Record<string, number>): { name: string; count: number } {
    const byMonth: Record<string, number> = {};
    for (const [date, count] of Object.entries(dailyActivity)) {
        const key = date.slice(0, 7); // "2026-06"
        byMonth[key] = (byMonth[key] ?? 0) + count;
    }
    const top = Object.entries(byMonth).sort(([, a], [, b]) => b - a)[0];
    if (!top) return { name: "—", count: 0 };
    const [year, month] = top[0].split("-");
    const label = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-US", { month: "long" });
    return { name: label, count: top[1] };
}

interface SlideData {
    userName: string;
    userHandle: string;
    activeDays: number;
    totalActions: number;
    hourly: number[];
    weekday: number[];
    midnightSessions: number;    // raw count
    midnightPct: number;         // % of total activity
    peakHour: number;
    nightOwlPct: number;
    longestStreak: { days: number; monthLabel: string };
    busiest: { name: string; count: number };
    topCourses: { name: string; count: number }[];
    topModule: { type: string; count: number } | null;
    moduleTypeClicks: Record<string, number>;
    topTheme: string | null;
    themeBreakdown: { name: string; totalMs: number }[];
    themeChanges: number;
    quizReviews: number;
    lastMinuteOpens: number;
    lastMinuteSubmissions: number;
    tabSwitches: number;
    busiestDayCount: number;
    weekendPct: number;
    isWeekendWarrior: boolean;
    personality: string;
    personalityDesc: string;
}

async function buildSlideData(): Promise<SlideData> {
    // Snapshot mode: freeze stats on first Wrapped open so the recap doesn't drift.
    let activityStats = await (async () => {
        if (WRAPPED_ENABLED !== "true") return getActivityStats();
        const snap = await wrappedSnapshotStorage.getValue();
        if (snap) {
            // Zero out lastUsed so stale session timestamps don't bleed into theme time calc
            return {
                ...snap,
                themeUsage: Object.fromEntries(
                    Object.entries(snap.themeUsage).map(([k, v]) => [k, { ...v, lastUsed: 0 }])
                ),
            };
        }
        const live = await getActivityStats();
        await wrappedSnapshotStorage.setValue(live);
        return live;
    })();

    const [stats, { info }] = await Promise.all([Promise.resolve(activityStats), loadSiteInfo()]);

    const moduleClicksTotal = Object.values(stats.moduleTypeClicks).reduce((a, b) => a + b, 0);
    const totalActions = stats.tabSwitchCount + moduleClicksTotal + stats.quizReviewsOpened;
    const hourlyTotal = stats.hourly.reduce((a, b) => a + b, 0);
    const midnightSessions = stats.hourly.slice(0, 4).reduce((a, b) => a + b, 0);
    const midnightPct = hourlyTotal > 0 ? Math.round((midnightSessions / hourlyTotal) * 100) : 0;
    const peakHour = stats.hourly.indexOf(Math.max(...stats.hourly));
    const afterTenPm = stats.hourly.slice(22).reduce((a, b) => a + b, 0);
    const nightOwlPct = hourlyTotal > 0 ? Math.round((afterTenPm / hourlyTotal) * 100) : 0;

    const topCourseEntries = Object.entries(stats.courseVisits)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([id, count]) => ({
            name: courses.value.find(c => c.id === Number(id))?.code ?? `Course ${id}`,
            count,
        }));

    const topModuleEntry = Object.entries(stats.moduleTypeClicks).sort(([, a], [, b]) => b - a)[0];
    const topModule = topModuleEntry ? { type: topModuleEntry[0], count: topModuleEntry[1] } : null;

    const now = Date.now();
    const themeBreakdown = Object.entries(stats.themeUsage)
        .map(([name, u]) => ({ name, totalMs: u.totalMs + (u.lastUsed ? Math.min(now - u.lastUsed, 4 * 3600000) : 0) }))
        .filter(e => e.totalMs > 0)
        .sort((a, b) => b.totalMs - a.totalMs);
    const topTheme = themeBreakdown[0]?.name ?? null;

    const busiestEntry = Object.entries(stats.dailyActivity ?? {}).sort(([, a], [, b]) => b - a)[0];
    const busiestDayCount = busiestEntry?.[1] ?? 0;

    const weekendTotal = stats.weekday[0] + stats.weekday[6];
    const weekdayTotal = stats.weekday.slice(1, 6).reduce((a, b) => a + b, 0);
    const totalWeekActivity = weekendTotal + weekdayTotal;
    const weekendPct = totalWeekActivity > 0 ? Math.round((weekendTotal / totalWeekActivity) * 100) : 0;
    const isWeekendWarrior = weekdayTotal > 0 ? (weekendTotal / 2) > (weekdayTotal / 5) : false;

    const streak = calculateLongestStreak(stats.activeDays);

    const personality = nightOwlPct >= 35 ? "Night Owl"
        : (stats.lastMinuteOpens > 5 || stats.lastMinuteSubmissions > 2) ? "Deadline Fighter"
        : streak.days > 7 ? "Consistent Grinder"
        : "Steady Explorer";

    const personalityDesc = personality === "Night Owl"
        ? `${nightOwlPct}% of your SCELE activity happens after 10 PM. The night is your study hall.`
        : personality === "Deadline Fighter"
        ? `You've submitted ${stats.lastMinuteSubmissions} assignment${stats.lastMinuteSubmissions !== 1 ? "s" : ""} within 2 hours of the deadline — and opened ${stats.lastMinuteOpens} tasks last-minute. You thrive under pressure.`
        : personality === "Consistent Grinder"
        ? `You logged in for ${streak.days} days straight. Discipline is your superpower.`
        : `You've visited ${stats.activeDays.length} different days consistently${topTheme ? `, mostly with the ${topTheme} theme` : ""}. Balanced approach.`;

    return {
        userName: info?.name.split(" ")[0] ?? "You",
        userHandle: info?.username ?? "",
        activeDays: stats.activeDays.length,
        totalActions,
        hourly: stats.hourly,
        weekday: stats.weekday,
        midnightSessions,
        midnightPct,
        peakHour,
        nightOwlPct,
        longestStreak: streak,
        busiest: busiestMonth(stats.dailyActivity ?? {}),
        topCourses: topCourseEntries,
        topModule,
        moduleTypeClicks: stats.moduleTypeClicks,
        topTheme,
        themeBreakdown,
        themeChanges: stats.themeChanges,
        quizReviews: stats.quizReviewsOpened,
        lastMinuteOpens: stats.lastMinuteOpens,
        lastMinuteSubmissions: stats.lastMinuteSubmissions,
        tabSwitches: stats.tabSwitchCount,
        busiestDayCount,
        weekendPct,
        isWeekendWarrior,
        personality,
        personalityDesc,
    };
}

// ── Layout helpers ────────────────────────────────────────────────────────────

function Slide({ children, bg }: { children: any; bg?: string }) {
    return (
        <div
            class="snap-start h-full w-full flex flex-col items-center justify-center px-8 py-16"
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

function HeroSlide({ d }: { d: SlideData }) {
    return (
        <Slide bg={css.primary}>
            <div class="flex flex-col items-center gap-8 text-center max-w-xs">
                <div class="w-24 h-24 rounded-3xl flex items-center justify-center" style={{ backgroundColor: css.onPrimaryA30 }}>
                    <Star class="w-12 h-12" style={{ color: css.onPrimary }} />
                </div>
                <div class="flex flex-col gap-3">
                    <span class="text-[10px] font-black uppercase tracking-widest" style={{ color: css.onPrimaryA60 }}>
                        Your SCELE story
                    </span>
                    <h1 class="text-5xl font-black leading-tight" style={{ color: css.onPrimary }}>
                        Sceless<br />Wrapped
                    </h1>
                    <p class="text-sm font-semibold" style={{ color: css.onPrimaryA60 }}>
                        {d.activeDays} active days · {d.userName}
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

function OverviewSlide({ d }: { d: SlideData }) {
    return (
        <Slide>
            <div class="flex flex-col gap-8 max-w-sm w-full">
                <div class="flex flex-col gap-3">
                    <Tag>This semester</Tag>
                    <h2 class="text-4xl font-black leading-snug" style={{ color: css.content }}>
                        You made<br />{d.totalActions.toLocaleString()} actions
                    </h2>
                </div>
                <div class="flex flex-col gap-4">
                    <div class="p-6 rounded-2xl flex items-center gap-5" style={{ backgroundColor: css.primary }}>
                        <BookOpen class="w-10 h-10 shrink-0" style={{ color: css.onPrimary, opacity: 0.8 }} />
                        <div>
                            <p class="text-6xl font-black" style={{ color: css.onPrimary }}>{d.activeDays}</p>
                            <p class="text-sm font-semibold" style={{ color: css.onPrimaryA60 }}>active days</p>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div class="p-4 rounded-xl flex flex-col gap-1.5" style={{ backgroundColor: css.primaryA12, border: `1px solid ${css.edge}` }}>
                            <TrendingUp class="w-5 h-5" style={{ color: css.primary }} />
                            <p class="text-3xl font-black" style={{ color: css.content }}>{d.tabSwitches}</p>
                            <p class="text-xs font-semibold" style={{ color: css.muted }}>tab switches</p>
                        </div>
                        <div class="p-4 rounded-xl flex flex-col gap-1.5" style={{ backgroundColor: css.dangerA12, border: `1px solid ${css.edge}` }}>
                            <AlertCircle class="w-5 h-5" style={{ color: css.danger }} />
                            <p class="text-3xl font-black" style={{ color: css.danger }}>{d.lastMinuteOpens}</p>
                            <p class="text-xs font-semibold" style={{ color: css.muted }}>last-minute opens</p>
                        </div>
                        <div class="p-4 rounded-xl flex flex-col gap-1.5" style={{ backgroundColor: css.primaryA12, border: `1px solid ${css.edge}` }}>
                            <Flame class="w-5 h-5" style={{ color: css.primary }} />
                            <p class="text-3xl font-black" style={{ color: css.content }}>{d.busiestDayCount}</p>
                            <p class="text-xs font-semibold" style={{ color: css.muted }}>actions on best day</p>
                        </div>
                        <div class="p-4 rounded-xl flex flex-col gap-1.5" style={{ backgroundColor: css.highlightA20, border: `1px solid ${css.edge}` }}>
                            <Zap class="w-5 h-5" style={{ color: css.highlight }} />
                            <p class="text-3xl font-black" style={{ color: css.content }}>
                                {d.isWeekendWarrior ? d.weekendPct : 100 - d.weekendPct}%
                            </p>
                            <p class="text-xs font-semibold" style={{ color: css.muted }}>
                                <span class="inline-flex items-center gap-1">
                                    {d.isWeekendWarrior ? <Gamepad2 class="w-3.5 h-3.5" /> : <Briefcase class="w-3.5 h-3.5" />}
                                    {d.isWeekendWarrior ? "weekend warrior" : "weekday grinder"}
                                </span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </Slide>
    );
}

function BusiestSlide({ d }: { d: SlideData }) {
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
                    <p class="text-6xl font-black leading-none" style={{ color: css.onPrimary }}>{d.busiest.name}</p>
                    <p class="font-semibold text-base" style={{ color: css.onPrimaryA60 }}>
                        {d.busiest.count > 0 ? `${d.busiest.count} actions recorded` : "Keep using Sceless!"}
                    </p>
                </div>
            </div>
        </Slide>
    );
}

function CoursesSlide({ d }: { d: SlideData }) {
    const barColors = [css.primary, css.highlight, css.danger];
    const max = Math.max(...d.topCourses.map(c => c.count), 1);
    return (
        <Slide>
            <div class="flex flex-col gap-8 max-w-sm w-full">
                <div class="flex flex-col gap-3">
                    <Tag>Most visited</Tag>
                    <h2 class="text-4xl font-black leading-snug" style={{ color: css.content }}>
                        Your top<br />courses
                    </h2>
                </div>
                {d.topCourses.length > 0 ? (
                    <div class="flex flex-col gap-4">
                        {d.topCourses.map((c, i) => (
                            <div key={c.name} class="flex flex-col gap-1.5">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-2">
                                        <span class="text-xs font-black" style={{ color: barColors[i] }}>#{i + 1}</span>
                                        <span class="text-sm font-bold" style={{ color: css.content }}>{c.name}</span>
                                    </div>
                                    <span class="text-sm font-black" style={{ color: css.content }}>{c.count}×</span>
                                </div>
                                <div class="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: css.edge }}>
                                    <div class="h-full rounded-full" style={{ width: `${(c.count / max) * 100}%`, backgroundColor: barColors[i] }} />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p class="text-sm" style={{ color: css.muted }}>Visit some courses to see your top picks.</p>
                )}
                {d.topModule && (
                    <p class="text-xs text-center" style={{ color: css.muted }}>
                        Top module type: <strong style={{ color: css.content }}>{d.topModule.type}</strong> ({d.topModule.count}×)
                    </p>
                )}
            </div>
        </Slide>
    );
}

function NightOwlSlide({ d }: { d: SlideData }) {
    const peak = d.peakHour;
    const peakLabel = peak === 0 ? "midnight" : peak < 12 ? `${peak} AM` : peak === 12 ? "noon" : `${peak - 12} PM`;
    const maxBar = Math.max(...d.hourly, 1);
    const hourLabels = ["12a","","2a","","4a","","6a","","8a","","10a","","12p","","2p","","4p","","6p","","8p","","10p",""];
    const hourlyTotal = d.hourly.reduce((a, b) => a + b, 0);
    const morningPct   = hourlyTotal > 0 ? Math.round(d.hourly.slice(6, 12).reduce((a, b) => a + b, 0) / hourlyTotal * 100) : 0;
    const afternoonPct = hourlyTotal > 0 ? Math.round(d.hourly.slice(12, 18).reduce((a, b) => a + b, 0) / hourlyTotal * 100) : 0;
    const eveningPct   = hourlyTotal > 0 ? Math.round(d.hourly.slice(18, 22).reduce((a, b) => a + b, 0) / hourlyTotal * 100) : 0;
    const leftStat = d.nightOwlPct > 5
        ? { icon: Moon,       label: "after 10 PM",    value: `${d.nightOwlPct}%`,  bg: css.primaryA12,   color: css.primary }
        : morningPct > 20
        ? { icon: Sun,        label: "before noon",    value: `${morningPct}%`,     bg: css.highlightA20, color: css.highlight }
        : eveningPct >= afternoonPct
        ? { icon: Zap,        label: "in the evening", value: `${eveningPct}%`,     bg: css.primaryA12,   color: css.primary }
        : { icon: TrendingUp, label: "in afternoons",  value: `${afternoonPct}%`,   bg: css.highlightA20, color: css.highlight };

    return (
        <Slide bg={css.pageSec}>
            <div class="flex flex-col gap-8 max-w-sm w-full">
                <div class="flex flex-col gap-3">
                    <Tag>Your rhythm</Tag>
                    <h2 class="text-4xl font-black leading-snug" style={{ color: css.content }}>
                        You peak at<br />
                        <span class="inline-flex items-center gap-2">{peakLabel} <Moon class="w-7 h-7 inline-block align-middle" style={{ color: css.primary }} /></span>
                    </h2>
                </div>
                <div class="flex flex-col gap-2">
                    <div class="flex items-end gap-px h-20 w-full">
                        {d.hourly.map((v, h) => {
                            const isNight = h >= 22 || h < 4;
                            const isPeak  = h === peak;
                            return (
                                <div
                                    key={h}
                                    class="flex-1 rounded-sm"
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
                    <div class="p-4 rounded-xl flex flex-col gap-1" style={{ backgroundColor: leftStat.bg }}>
                        <leftStat.icon class="w-5 h-5" style={{ color: leftStat.color }} />
                        <p class="text-2xl font-black" style={{ color: css.content }}>{leftStat.value}</p>
                        <p class="text-xs font-semibold" style={{ color: css.muted }}>{leftStat.label}</p>
                    </div>
                    <div class="p-4 rounded-xl flex flex-col gap-1" style={{ backgroundColor: css.highlightA20 }}>
                        <Sun class="w-5 h-5" style={{ color: css.highlight }} />
                        <p class="text-2xl font-black" style={{ color: css.content }}>{d.midnightPct > 0 ? `${d.midnightPct}%` : `${d.busiestDayCount}`}</p>
                        <p class="text-xs font-semibold" style={{ color: css.muted }}>{d.midnightPct > 0 ? "midnight activity" : "actions on best day"}</p>
                    </div>
                </div>
            </div>
        </Slide>
    );
}

function MidnightSlide({ d }: { d: SlideData }) {
    return (
        <Slide bg={css.primary}>
            <div class="flex flex-col gap-8 max-w-sm w-full items-center text-center">
                <Moon class="w-20 h-20" style={{ color: css.onPrimary, opacity: 0.9 }} />
                <div class="flex flex-col gap-4">
                    <span class="text-[10px] font-black uppercase tracking-widest" style={{ color: css.onPrimaryA60 }}>
                        Midnight grind
                    </span>
                    <h2 class="text-6xl font-black leading-tight" style={{ color: css.onPrimary }}>
                        {d.midnightPct}%<br /><span class="text-3xl">midnight activity</span>
                    </h2>
                    <p class="font-medium text-base" style={{ color: css.onPrimaryA60 }}>
                        You opened SCELE between<br />
                        <strong style={{ color: css.onPrimary }}>midnight and 4 AM</strong>.<br />
                        Sleep is optional apparently.
                    </p>
                </div>
                <div class="flex gap-3">
                    {([Moon, Coffee, Laptop] as const).map((Icon, i) => (
                        <div key={i} class="w-12 h-12 flex items-center justify-center rounded-xl" style={{ backgroundColor: css.onPrimaryA30 }}>
                            <Icon class="w-6 h-6" style={{ color: css.onPrimary }} />
                        </div>
                    ))}
                </div>
            </div>
        </Slide>
    );
}

function StreakSlide({ d }: { d: SlideData }) {
    const { days, monthLabel } = d.longestStreak;
    return (
        <Slide bg={css.pageSec}>
            <div class="flex flex-col gap-8 max-w-sm w-full items-center text-center">
                <div class="w-28 h-28 rounded-3xl flex items-center justify-center" style={{ backgroundColor: css.primaryA12 }}>
                    <TrendingUp class="w-14 h-14" style={{ color: css.primary }} />
                </div>
                <div class="flex flex-col gap-3 items-center">
                    <Tag>Best streak</Tag>
                    <h2 class="text-6xl font-black" style={{ color: css.content }}>{days > 0 ? `${days} days` : "—"}</h2>
                    <p class="font-medium" style={{ color: css.muted }}>consecutive days on SCELE</p>
                    {monthLabel && <span class="text-sm font-black" style={{ color: css.primary }}>{monthLabel}</span>}
                </div>
            </div>
        </Slide>
    );
}

function ThemeSlide({ d }: { d: SlideData }) {
    const total = d.themeBreakdown.reduce((s, e) => s + e.totalMs, 0);
    const formatMs = (ms: number) => {
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    return (
        <Slide bg={css.pageSec}>
            <div class="flex flex-col gap-8 max-w-sm w-full">
                <div class="flex flex-col gap-3">
                    <Tag>Your aesthetic</Tag>
                    <h2 class="text-4xl font-black leading-snug" style={{ color: css.content }}>
                        Time spent<br />per theme
                    </h2>
                </div>
                {d.themeBreakdown.length === 0 ? (
                    <p class="text-sm" style={{ color: css.muted }}>No theme usage recorded yet.</p>
                ) : (
                    <div class="flex flex-col gap-4">
                        {d.themeBreakdown.map((e, i) => {
                            const pct = Math.round((e.totalMs / total) * 100);
                            const isTop = i === 0;
                            return (
                                <div key={e.name} class="flex flex-col gap-1.5">
                                    <div class="flex items-center justify-between">
                                        <div class="flex items-center gap-2">
                                            {isTop && <Star class="w-3.5 h-3.5 shrink-0" style={{ color: css.primary }} />}
                                            <span class="text-sm font-bold" style={{ color: css.content }}>{e.name}</span>
                                        </div>
                                        <div class="flex items-center gap-2">
                                            <span class="text-xs font-semibold" style={{ color: css.muted }}>{pct}%</span>
                                            <span class="text-sm font-black" style={{ color: css.content }}>{formatMs(e.totalMs)}</span>
                                        </div>
                                    </div>
                                    <div class="h-2 rounded-full overflow-hidden" style={{ backgroundColor: css.edge }}>
                                        <div
                                            class="h-full rounded-full"
                                            style={{ width: `${pct}%`, backgroundColor: isTop ? css.primary : css.highlight }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </Slide>
    );
}

function PersonalitySlide({ d }: { d: SlideData }) {
    const PersonalityIcon = d.personality === "Night Owl" ? Moon
        : d.personality === "Deadline Fighter" ? Zap
        : d.personality === "Consistent Grinder" ? Flame
        : Compass;

    return (
        <Slide>
            <div class="flex flex-col gap-8 max-w-sm w-full items-center text-center">
                <div class="w-28 h-28 rounded-3xl flex items-center justify-center" style={{ backgroundColor: css.primaryA20 }}>
                    <PersonalityIcon class="w-14 h-14" style={{ color: css.primary }} />
                </div>
                <div class="flex flex-col gap-3 items-center">
                    <Tag>You are a</Tag>
                    <h2 class="text-4xl font-black mt-1" style={{ color: css.primary }}>{d.personality}</h2>
                    <p class="text-sm leading-relaxed max-w-xs" style={{ color: css.muted }}>{d.personalityDesc}</p>
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

function EndSlide({ d }: { d: SlideData }) {
    return (
        <Slide bg={css.primary}>
            <div class="flex flex-col items-center gap-8 text-center max-w-sm">
                <Trophy class="w-20 h-20" style={{ color: css.onPrimary, opacity: 0.9 }} />
                <div class="flex flex-col gap-4">
                    <h2 class="text-5xl font-black leading-tight" style={{ color: css.onPrimary }}>
                        Keep it up
                    </h2>
                    <p class="text-base font-medium" style={{ color: css.onPrimaryA60 }}>
                        {d.totalActions.toLocaleString()} actions. {d.midnightPct}% midnight activity.<br />
                        {d.activeDays} days logged. You made it.
                    </p>
                </div>
                <p class="text-xs" style={{ color: css.onPrimaryA30 }}>
                    Sceless · {d.userName}
                </p>
            </div>
        </Slide>
    );
}

function ThankYouSlide() {
    return (
        <Slide>
            <div class="flex flex-col items-center gap-10 text-center max-w-xs">
                <div class="w-24 h-24 rounded-3xl flex items-center justify-center" style={{ backgroundColor: css.primaryA12 }}>
                    <LogoL class="w-14 h-14" style={{ color: css.primary }} />
                </div>
                <div class="flex flex-col gap-4">
                    <h2 class="text-4xl font-black leading-snug" style={{ color: css.content }}>
                        Thanks for using<br />
                        <span style={{ color: css.primary }}>Sceless</span>
                    </h2>
                    <p class="text-sm leading-relaxed" style={{ color: css.muted }}>
                        If it made your SCELE life a little better,<br />
                        consider leaving a review or starring it.
                    </p>
                </div>
                <a
                    href="https://sceless.cornellius.dev"
                    target="_blank"
                    rel="noreferrer"
                    class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-opacity hover:opacity-80"
                    style={{ backgroundColor: css.primaryA12, color: css.primary }}
                >
                    <Heart class="w-4 h-4" />
                    sceless.cornellius.dev
                </a>
            </div>
        </Slide>
    );
}

// ── Compact export card ───────────────────────────────────────────────────────
// Uses only inline styles with real hex values — html-to-image can't resolve CSS vars.

function CompactCard({ d, t }: { d: SlideData; t: ThemeConfig }) {
    const peakLabel = d.peakHour === 0 ? "12 AM" : d.peakHour < 12 ? `${d.peakHour} AM` : d.peakHour === 12 ? "12 PM" : `${d.peakHour - 12} PM`;
    const maxHourly = Math.max(...d.hourly, 1);
    const maxWeekday = Math.max(...d.weekday, 1);
    const weekdays = ["S", "M", "T", "W", "T", "F", "S"];

    const PersonalityIcon = d.personality === "Night Owl" ? Moon
        : d.personality === "Deadline Fighter" ? Zap
        : d.personality === "Consistent Grinder" ? Flame
        : Compass;
    const topCourseMax = Math.max(...d.topCourses.map(c => c.count), 1);
    const barAccents = [t.primary, t.highlight, t.danger];

    const hourlyTotal = d.hourly.reduce((a, b) => a + b, 0);
    const morningPct   = hourlyTotal > 0 ? Math.round(d.hourly.slice(6, 12).reduce((a, b) => a + b, 0) / hourlyTotal * 100) : 0;
    const afternoonPct = hourlyTotal > 0 ? Math.round(d.hourly.slice(12, 18).reduce((a, b) => a + b, 0) / hourlyTotal * 100) : 0;
    const eveningPct   = hourlyTotal > 0 ? Math.round(d.hourly.slice(18, 22).reduce((a, b) => a + b, 0) / hourlyTotal * 100) : 0;
    const avgDailyActions = d.activeDays > 0 ? Math.round(d.totalActions / d.activeDays) : 0;

    // Always show the dominant time window — never highlight a minority
    const windows = [
        { label: "Night owl",   value: `${d.nightOwlPct}%`, pct: d.nightOwlPct },
        { label: "Early bird",  value: `${morningPct}%`,    pct: morningPct },
        { label: "Afternoon",   value: `${afternoonPct}%`,  pct: afternoonPct },
        { label: "Evening",     value: `${eveningPct}%`,    pct: eveningPct },
    ];
    const timeOfDayStat = windows.reduce((a, b) => b.pct > a.pct ? b : a);

    const cell = (label: string, value: string | number, color?: string) => (
        <div style={{ backgroundColor: t.bg, padding: "12px 14px", display: "flex", flexDirection: "column" as const, gap: "3px" }}>
            <span style={{ color: color ?? t.primary, fontSize: "16px", fontWeight: 900, lineHeight: 1.1 }}>{value}</span>
            <span style={{ color: t.textMuted, fontSize: "9px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.07em" }}>{label}</span>
        </div>
    );

    return (
        <div style={{
            width: "540px", backgroundColor: t.bg, borderRadius: "16px", overflow: "hidden",
            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        }}>
            {/* Header */}
            <div style={{ backgroundColor: t.primary, padding: "20px 24px 18px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                    <div>
                        <p style={{ color: t.onPrimary, opacity: 0.55, fontSize: "9px", fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase" as const, margin: 0 }}>
                            Sceless Wrapped
                        </p>
                        <p style={{ color: t.onPrimary, fontSize: "20px", fontWeight: 900, margin: "4px 0 0", lineHeight: 1.2 }}>
                            {d.userName}'s semester
                        </p>
                        <p style={{ color: t.onPrimary, opacity: 0.6, fontSize: "11px", fontWeight: 600, margin: "4px 0 0" }}>
                            {d.activeDays} active days · {d.personality}
                        </p>
                    </div>
                    <PersonalityIcon style={{ width: "40px", height: "40px", color: t.onPrimary, opacity: 0.85 }} />
                </div>

                {/* Hourly bars */}
                <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: "36px", marginTop: "14px" }}>
                    {d.hourly.map((v, h) => {
                        const isPeak = h === d.peakHour;
                        const isNight = h >= 22 || h < 4;
                        return (
                            <div
                                key={h}
                                style={{
                                    flex: 1,
                                    height: `${Math.max(2, (v / maxHourly) * 100)}%`,
                                    backgroundColor: isPeak ? t.onPrimary : isNight ? t.onPrimary : t.onPrimary,
                                    opacity: isPeak ? 1 : isNight ? 0.5 : 0.25,
                                    borderRadius: "2px 2px 0 0",
                                }}
                            />
                        );
                    })}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                    <span style={{ color: t.onPrimary, opacity: 0.4, fontSize: "8px", fontWeight: 600 }}>12 AM</span>
                    <span style={{ color: t.onPrimary, opacity: 0.8, fontSize: "8px", fontWeight: 800 }}>▲ Peak {peakLabel}</span>
                    <span style={{ color: t.onPrimary, opacity: 0.4, fontSize: "8px", fontWeight: 600 }}>11 PM</span>
                </div>
            </div>

            {/* Stats grid — 8 cells, 4x2 */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1px", background: t.border }}>
                {cell("Active days",   d.activeDays)}
                {cell("Best streak",   d.longestStreak.days > 0 ? `${d.longestStreak.days}d` : "—")}
                {cell("Avg / day",     avgDailyActions > 0 ? avgDailyActions : "—")}
                {cell("Best day",      d.busiestDayCount > 0 ? `${d.busiestDayCount} actions` : "—")}
                {cell("Busiest month", d.busiest.name || "—")}
                {cell(timeOfDayStat.label, timeOfDayStat.value)}
                {cell(d.isWeekendWarrior ? "Weekend" : "Weekday", `${d.isWeekendWarrior ? d.weekendPct : 100 - d.weekendPct}%`)}
                {cell("Last-minute",   d.lastMinuteOpens, d.lastMinuteOpens > 5 ? t.danger : undefined)}
            </div>

            {/* Weekday bars */}
            <div style={{ padding: "14px 18px 10px", borderTop: `1px solid ${t.border}` }}>
                <p style={{ color: t.textMuted, fontSize: "8px", fontWeight: 900, textTransform: "uppercase" as const, letterSpacing: "0.1em", margin: "0 0 8px" }}>
                    Activity by weekday
                </p>
                <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "28px" }}>
                    {d.weekday.map((v, i) => (
                        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column" as const, alignItems: "center", gap: "3px", height: "100%" }}>
                            <div style={{
                                width: "100%",
                                height: `${Math.max(3, (v / maxWeekday) * 100)}%`,
                                backgroundColor: t.primary,
                                opacity: v > 0 ? 0.8 : 0.15,
                                borderRadius: "2px",
                                marginTop: "auto",
                            }} />
                        </div>
                    ))}
                </div>
                <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                    {weekdays.map((d, i) => (
                        <span key={i} style={{ flex: 1, textAlign: "center", color: t.textMuted, fontSize: "8px", fontWeight: 700 }}>{d}</span>
                    ))}
                </div>
            </div>

            {/* Top courses */}
            {d.topCourses.length > 0 && (
                <div style={{ padding: "10px 18px 14px", borderTop: `1px solid ${t.border}` }}>
                    <p style={{ color: t.textMuted, fontSize: "8px", fontWeight: 900, textTransform: "uppercase" as const, letterSpacing: "0.1em", margin: "0 0 8px" }}>
                        Top courses
                    </p>
                    <div style={{ display: "flex", flexDirection: "column" as const, gap: "6px" }}>
                        {d.topCourses.map((c, i) => (
                            <div key={c.name} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ color: barAccents[i] ?? t.primary, fontSize: "9px", fontWeight: 900, width: "14px" }}>#{i + 1}</span>
                                <span style={{ color: t.text, fontSize: "11px", fontWeight: 700, flex: 1 }}>{c.name}</span>
                                <div style={{ width: "80px", height: "4px", borderRadius: "2px", background: t.border, overflow: "hidden" }}>
                                    <div style={{ width: `${(c.count / topCourseMax) * 100}%`, height: "100%", backgroundColor: barAccents[i] ?? t.primary, borderRadius: "2px" }} />
                                </div>
                                <span style={{ color: t.text, fontSize: "11px", fontWeight: 900, width: "22px", textAlign: "right" as const }}>{c.count}×</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Extras — always 3 cells, always fills the row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1px", background: t.border }}>
                {cell("Fav theme",    d.topTheme ?? "—")}
                {cell("Quiz reviews", d.quizReviews)}
                {cell("Tab switches", d.tabSwitches)}
            </div>

            {/* Footer */}
            <div style={{ padding: "8px 18px", borderTop: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: t.textMuted, fontSize: "8px", fontWeight: 700 }}>sceless.cornellius.dev</span>
                <span style={{ color: t.textMuted, fontSize: "8px", fontWeight: 700 }}>{d.userHandle || d.userName}</span>
            </div>
        </div>
    );
}

// ── Root ──────────────────────────────────────────────────────────────────────

const SLIDE_LABELS = [
    "Cover", "Overview", "Busiest Month", "Top Courses",
    "Your Rhythm", "Midnight Grind", "Best Streak", "Themes", "Personality", "Finale", "Thank You",
];

export default function WrappedPage() {
    const [current,   setCurrent]   = useState(0);
    const [exporting, setExporting] = useState(false);
    const [data,      setData]      = useState<SlideData | null>(null);
    const compactRef = useRef<HTMLDivElement>(null);
    const wheelLock  = useRef(false);

    useEffect(() => { buildSlideData().then(setData); }, []);

    const goTo = useCallback((i: number) => {
        setCurrent(Math.max(0, Math.min(SLIDE_LABELS.length - 1, i)));
    }, []);

    const handleWheel = useCallback((e: WheelEvent) => {
        e.preventDefault();
        if (wheelLock.current) return;
        wheelLock.current = true;
        setCurrent(c => Math.max(0, Math.min(SLIDE_LABELS.length - 1, c + (e.deltaY > 0 ? 1 : -1))));
        setTimeout(() => { wheelLock.current = false; }, 500);
    }, []);

    const t = theme.value;

    const captureCard = useCallback(async (): Promise<string> => {
        const el = compactRef.current;
        if (!el) throw new Error("no card");
        // Temporarily move into viewport — html-to-image can't capture off-screen elements
        el.style.left = "0";
        el.style.top = "0";
        await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
        const { toPng } = await import("html-to-image");
        const url = await toPng(el, { pixelRatio: 2, skipFonts: false });
        el.style.left = "-9999px";
        el.style.top = "-9999px";
        return url;
    }, []);

    const handleSaveImage = useCallback(async () => {
        if (!data) return;
        setExporting(true);
        try {
            const url = await captureCard();
            const a = document.createElement("a");
            a.href = url; a.download = "sceless-wrapped.png"; a.click();
        } finally { setExporting(false); }
    }, [data, captureCard]);

    const handleShare = useCallback(async () => {
        if (!data) return;
        setExporting(true);
        try {
            const dataUrl = await captureCard();
            const blob = await (await fetch(dataUrl)).blob();
            const file = new File([blob], "sceless-wrapped.png", { type: "image/png" });
            await navigator.share({ files: [file] });
        } catch {
            try {
                const dataUrl = await captureCard();
                const a = document.createElement("a"); a.href = dataUrl; a.download = "sceless-wrapped.png"; a.click();
            } catch { /* ignore */ }
        } finally { setExporting(false); }
    }, [data, captureCard]);

    if (!data) {
        return (
            <div class="h-full flex items-center justify-center" style={{ backgroundColor: css.page }}>
                <div class="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: css.primary }} />
            </div>
        );
    }

    const slides = [HeroSlide, OverviewSlide, BusiestSlide, CoursesSlide, NightOwlSlide, MidnightSlide, StreakSlide, ThemeSlide, PersonalitySlide, EndSlide, ThankYouSlide];

    return (
        <div class="relative h-full w-full overflow-hidden" style={{ backgroundColor: css.page }}>
            {/* Off-screen compact card — captured by html-to-image */}
            <div style={{ position: "fixed", left: "-9999px", top: "-9999px", zIndex: 9999 }} ref={compactRef}>
                <CompactCard d={data} t={t as any} />
            </div>

            {/* Slide container — transform-based, one slide at a time */}
            <div
                class="absolute inset-0"
                onWheel={handleWheel as any}
            >
                {slides.map((S, i) => (
                    <div
                        key={i}
                        class="absolute inset-0"
                        style={{
                            transform: `translateY(${(i - current) * 100}%)`,
                            transition: "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
                        }}
                    >
                        <S d={data} />
                    </div>
                ))}
            </div>

            {/* Dot nav */}
            <div class="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-10">
                {slides.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => goTo(i)}
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
                class="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2.5 rounded-2xl z-10"
                style={{ backgroundColor: css.page, border: `2px solid ${css.edge}`, boxShadow: "0 4px 24px rgba(0,0,0,0.12)" }}
            >
                <span class="text-xs font-bold" style={{ color: css.muted }}>
                    {current + 1} / {slides.length}
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
