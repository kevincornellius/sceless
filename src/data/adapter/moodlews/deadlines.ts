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
        "core_calendar_get_action_events_by_timesort",
        {
            limitnum: 15,          
            timesortfrom: Math.floor(Date.now() / 1000) 
        }
    );

    if (!data || !data.events) {
        return [];
    }

    return data.events.map(event => ({
        id: event.id,
        title: event.name.replace(" is due", ""), 
        courseCode: event.course.shortname,
        courseId: event.course.id,
        dueTimestamp: event.timesort,
        url: event.url,
        module: event.modulename
    }));
}