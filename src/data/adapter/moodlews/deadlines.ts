import { Deadline } from "@/src/types/scele";
import { MoodleCourse } from "./courses";
import { fetchMoodle } from "./fetch";

export interface MoodleCalendarEvent {
    id: number;
    name: string;
    description: string;
    component: string;
    modulename: string;
    instance: number;
    eventtype: string;
    timestart: number;
    timesort: number;
    course: MoodleCourse;
    action: {
        name: string;
        url: string;
        actionable: boolean;
    };
    url: string;
}

export interface CalendarEventsResponse {
    events: MoodleCalendarEvent[];
}

export async function getUpcomingDeadlines(): Promise<Deadline[]> {
    const data = await fetchMoodle<CalendarEventsResponse>(
        "core_calendar_get_calendar_upcoming_view",
        {}
    );

    if (!data || !data.events) return [];

    return data.events.map(event => ({
        id: event.id,
        title: event.name.replace(" is due", ""),
        courseCode: event.course?.shortname ?? "Unknown",
        courseId: event.course?.id ?? 0,
        dueTimestamp: event.timesort,
        url: event.url,
        module: event.modulename ?? ""
    }));
}

function mapCalendarEvent(event: MoodleCalendarEvent): Deadline {
    return {
        id:           event.id,
        title:        event.name.replace(" is due", ""),
        courseCode:   event.course?.shortname ?? "Unknown",
        courseId:     event.course?.id ?? 0,
        dueTimestamp: event.timesort,
        url:          event.url,
        module:       event.modulename ?? "",
    };
}

export async function getTimelineDeadlines(): Promise<Deadline[]> {
    const now = Math.floor(Date.now() / 1000);
    const todayStart = now - (now % 86400); // midnight UTC today

    const [upcomingData, timesortData] = await Promise.allSettled([
        fetchMoodle<CalendarEventsResponse>("core_calendar_get_calendar_upcoming_view", {}),
        fetchMoodle<CalendarEventsResponse>("core_calendar_get_action_events_by_timesort", {
            timesortfrom: todayStart,
            timesortto:   now + 90 * 24 * 60 * 60,
            limitnum:     50,
        }),
    ]);

    const seen = new Set<number>();
    const merged: Deadline[] = [];

    for (const result of [upcomingData, timesortData]) {
        if (result.status !== "fulfilled") continue;
        const events = result.value?.events ?? [];
        for (const event of events) {
            if (seen.has(event.id)) continue;
            seen.add(event.id);
            merged.push(mapCalendarEvent(event));
        }
    }

    return merged.sort((a, b) => a.dueTimestamp - b.dueTimestamp);
}

interface MoodleMonthlyEvent {
    id: number;
    name: string;
    modulename: string;
    eventtype: string;
    timestart: number;
    course?: { id: number; shortname: string };
    action?: { url: string; actionable: boolean };
    url?: string;
}

interface MoodleMonthlyDay {
    events: MoodleMonthlyEvent[];
}

interface MoodleMonthlyWeek {
    days: MoodleMonthlyDay[];
}

interface MoodleMonthlyViewResponse {
    weeks: MoodleMonthlyWeek[];
}

export async function getMonthlyDeadlines(year: number, month: number): Promise<Deadline[]> {
    // Moodle month is 1-based
    const data = await fetchMoodle<MoodleMonthlyViewResponse>(
        "core_calendar_get_calendar_monthly_view",
        { year, month: month + 1, courseid: 0, categoryid: 0, includenavigation: 0, mini: 0, day: 1 }
    );

    if (!data?.weeks) return [];

    const seen = new Set<number>();
    const deadlines: Deadline[] = [];

    for (const week of data.weeks) {
        for (const day of week.days) {
            for (const event of day.events) {
                if (!event.modulename || seen.has(event.id)) continue;
                seen.add(event.id);
                deadlines.push({
                    id:           event.id,
                    title:        event.name.replace(" is due", ""),
                    courseCode:   event.course?.shortname ?? "Unknown",
                    courseId:     event.course?.id ?? 0,
                    dueTimestamp: event.timestart,
                    url:          event.action?.url ?? event.url ?? "",
                    module:       event.modulename,
                });
            }
        }
    }

    return deadlines;
}
