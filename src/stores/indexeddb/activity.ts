import { storage } from "#imports";

const MAX_SESSION_MS = 4 * 60 * 60 * 1000;

export interface ThemeUsage {
    lastUsed: number; // timestamp when last activated; 0 = not currently active
    totalMs: number;  // accumulated ms, updated on switch-away
}

export interface ActivityStats {
    hourly: number[];
    weekday: number[];
    activeDays: string[];
    dailyActivity: Record<string, number>;
    lastMinuteOpens: number;
    courseVisits: Record<number, number>;
    moduleTypeClicks: Record<string, number>;
    tabSwitchCount: number;
    themeChanges: number;
    quizReviewsOpened: number;
    themeUsage: Record<string, ThemeUsage>;
}

const DEFAULT: ActivityStats = {
    hourly: Array(24).fill(0),
    weekday: Array(7).fill(0),
    activeDays: [],
    dailyActivity: {},
    lastMinuteOpens: 0,
    courseVisits: {},
    moduleTypeClicks: {},
    tabSwitchCount: 0,
    themeChanges: 0,
    quizReviewsOpened: 0,
    themeUsage: {},
};

const activityStorage = storage.defineItem<ActivityStats>("local:activity_stats", {
    defaultValue: DEFAULT,
});

export async function getActivityStats(): Promise<ActivityStats> {
    const stored = await activityStorage.getValue();
    return {
        ...DEFAULT,
        ...stored,
        hourly:  stored.hourly?.length  === 24 ? stored.hourly  : [...DEFAULT.hourly],
        weekday: stored.weekday?.length === 7  ? stored.weekday : [...DEFAULT.weekday],
    };
}

let writeQueue = Promise.resolve();

async function update(fn: (s: ActivityStats) => void): Promise<void> {
    writeQueue = writeQueue.then(async () => {
        try {
            const stats = await getActivityStats();
            fn(stats);
            await activityStorage.setValue(stats);
        } catch { /* never block the UI */ }
    });
}

function tickActivity(s: ActivityStats, now: Date): void {
    const isoDate = now.toISOString().slice(0, 10);
    s.hourly[now.getHours()]++;
    s.weekday[now.getDay()]++;
    s.dailyActivity[isoDate] = (s.dailyActivity[isoDate] ?? 0) + 1;
    if (!s.activeDays.includes(isoDate)) s.activeDays.push(isoDate);
}

// hourly + weekday + activeDays + dailyActivity + tabSwitchCount in one atomic write
export const trackNavigationEvent = (): void => {
    const now = new Date();
    void update(s => {
        tickActivity(s, now);
        s.tabSwitchCount++;
    });
};

export const trackCourseVisit = (courseId: number): void => {
    void update(s => {
        s.courseVisits[courseId] = (s.courseVisits[courseId] ?? 0) + 1;
    });
};

export const trackModuleClick = (modname: string, dueDate: Date | null): void => {
    const now = new Date();
    void update(s => {
        tickActivity(s, now);
        s.moduleTypeClicks[modname] = (s.moduleTypeClicks[modname] ?? 0) + 1;
        if (dueDate) {
            const msUntilDue = dueDate.getTime() - Date.now();
            if (msUntilDue > 0 && msUntilDue < 2 * 60 * 60 * 1000) s.lastMinuteOpens++;
        }
    });
};

// Called once from App.tsx after boot — marks session start for the active theme
export const trackThemeInit = (themeName: string): void => {
    const now = Date.now();
    void update(s => {
        s.themeUsage[themeName] = {
            lastUsed: now,
            totalMs: s.themeUsage[themeName]?.totalMs ?? 0,
        };
    });
};

// Called from changeTheme — closes prev session, opens new one
export const trackThemeSwitch = (prevName: string, nextName: string): void => {
    const now = Date.now();
    void update(s => {
        const prev = s.themeUsage[prevName];
        if (prev?.lastUsed) {
            prev.totalMs += Math.min(now - prev.lastUsed, MAX_SESSION_MS);
            prev.lastUsed = 0;
        }
        s.themeUsage[nextName] = {
            lastUsed: now,
            totalMs: s.themeUsage[nextName]?.totalMs ?? 0,
        };
        s.themeChanges++;
    });
};

export const trackQuizReviewOpened = (): void => {
    const now = new Date();
    void update(s => {
        tickActivity(s, now);
        s.quizReviewsOpened++;
    });
};
