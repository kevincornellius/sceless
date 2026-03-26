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

    if (!data || !data.events) {
        return [];
    }

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

// Separate fetch for TasksPage calendar — uses by_timesort for wider range + sorting
export async function getDeadlinesByTimesort(): Promise<Deadline[]> {
    const now = Math.floor(Date.now() / 1000);
    const data = await fetchMoodle<CalendarEventsResponse>(
        "core_calendar_get_action_events_by_timesort",
        {
            timesortfrom: now - 7 * 24 * 60 * 60,
            timesortto: now + 60 * 24 * 60 * 60,
            limitnum: 50,
        }
    );

    if (!data || !data.events) {
        return [];
    }

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