import { signal } from "@preact/signals";
import { parseICS, expandRecurringEvents, ScheduleEvent } from "@/src/data/adapter/ics";
import { db } from "./indexeddb/db";

const CACHE_KEY = "schedule-events";
const SCHEDULE_KEY = "schedule"; // metadata: fileName, lastUpdated

export interface ScheduleMeta {
    fileName: string;
    lastUpdated: number;
}

export interface ScheduleData {
    events: ScheduleEvent[];
    rangeStart: number;
    rangeEnd: number;
}

export const scheduleMeta = signal<ScheduleMeta | null>(null);
export const scheduleEvents = signal<ScheduleEvent[]>([]);
export const scheduleLoaded = signal(false);

// Get current and next class from loaded events
export function getCurrentClass(): ScheduleEvent | null {
    const now = Date.now();
    for (const ev of scheduleEvents.value) {
        if (ev.startTs <= now && ev.endTs > now) {
            return ev;
        }
    }
    return null;
}

export function getNextClass(): ScheduleEvent | null {
    const now = Date.now();
    let next: ScheduleEvent | null = null;
    for (const ev of scheduleEvents.value) {
        if (ev.startTs > now) {
            if (!next || ev.startTs < next.startTs) {
                next = ev;
            }
        }
    }
    return next;
}

// Load from IndexedDB
export async function loadSchedule(): Promise<void> {
    try {
        const meta = await db.get<ScheduleMeta>("cache", SCHEDULE_KEY + "-meta");
        const data = await db.get<ScheduleData>("cache", CACHE_KEY);

        if (data && meta && data.events.length > 0) {
            scheduleMeta.value = meta;
            // Re-expand if range is stale
            const now = Date.now();
            if (data.rangeEnd < now + 7 * 24 * 60 * 60 * 1000) {
                // Range ending soon, refresh
                await refreshScheduleFromMeta(meta.fileName);
            } else {
                scheduleEvents.value = data.events;
            }
        }
        scheduleLoaded.value = true;
    } catch {
        scheduleLoaded.value = true;
    }
}

// Parse and save a new ICS file
export async function saveScheduleICS(fileName: string, icsContent: string): Promise<ScheduleEvent[]> {
    const events = parseICS(icsContent);

    // Expand recurring events for a wide range (today to 6 months)
    const now = Date.now();
    const rangeStart = now - 7 * 24 * 60 * 60 * 1000; // 1 week ago
    const rangeEnd = now + 180 * 24 * 60 * 60 * 1000;  // 6 months ahead

    const allEvents: ScheduleEvent[] = [];
    for (const ev of events) {
        const expanded = expandRecurringEvents(ev, rangeStart, rangeEnd);
        allEvents.push(...expanded);
    }

    // Sort by start time
    allEvents.sort((a, b) => a.startTs - b.startTs);

    // Save to IndexedDB
    const meta: ScheduleMeta = { fileName, lastUpdated: Date.now() };
    const data: ScheduleData = { events: allEvents, rangeStart, rangeEnd };

    await db.set("cache", SCHEDULE_KEY + "-meta", meta);
    await db.set("cache", CACHE_KEY, data);

    scheduleMeta.value = meta;
    scheduleEvents.value = allEvents;

    return allEvents;
}

// Refresh from stored meta (re-parse original, expand fresh range)
async function refreshScheduleFromMeta(_fileName: string): Promise<void> {
    // We don't store the original ICS content, so we just re-expand with fresh range
    // For full refresh the user would re-upload. This is just for range extension.
    const now = Date.now();
    const rangeStart = now - 7 * 24 * 60 * 60 * 1000;
    const rangeEnd = now + 180 * 24 * 60 * 60 * 1000;

    // Re-expand stored non-recurring events with new range
    const existing = await db.get<ScheduleData>("cache", CACHE_KEY);
    if (!existing) return;

    const reExpanded: ScheduleEvent[] = [];
    for (const ev of existing.events) {
        if (!ev.rrule) {
            // Non-recurring — check if within new range
            if (ev.startTs >= rangeStart && ev.startTs <= rangeEnd) {
                reExpanded.push(ev);
            }
        } else {
            // Recurring — re-expand
            const expanded = expandRecurringEvents(ev, rangeStart, rangeEnd);
            reExpanded.push(...expanded);
        }
    }

    reExpanded.sort((a, b) => a.startTs - b.startTs);

    const data: ScheduleData = { events: reExpanded, rangeStart, rangeEnd };
    await db.set("cache", CACHE_KEY, data);
    scheduleEvents.value = reExpanded;
}

// Delete schedule
export async function deleteSchedule(): Promise<void> {
    await db.delete("cache", CACHE_KEY);
    await db.delete("cache", SCHEDULE_KEY + "-meta");
    scheduleMeta.value = null;
    scheduleEvents.value = [];
}
