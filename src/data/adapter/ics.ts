export interface ScheduleEvent {
    id: string;
    title: string;       // SUMMARY
    location: string;     // LOCATION
    startTs: number;      // DTSTART as Unix timestamp (ms)
    endTs: number;         // DTEND as Unix timestamp (ms)
    rrule?: string;        // RRULE for recurring events
    recurrenceText?: string; // human-readable e.g. "Every Mon, Wed, Fri"
}

function parseICSDate(value: string): number {
    // Strip TZID= prefix if present, e.g. "TZID=Asia/Jakarta:20260326T090000"
    const clean = value.replace(/^[^:]+:/, "");
    // ICS dates: "20260326T090000Z" (UTC), "20260326T090000" or "20260326T06" (short hour)
    // or "20260326" (date only = midnight local)
    if (clean.length === 8) {
        // Date only — treat as midnight in user's local timezone
        const y = parseInt(clean.slice(0, 4));
        const m = parseInt(clean.slice(4, 6)) - 1;
        const d = parseInt(clean.slice(6, 8));
        return new Date(y, m, d).getTime();
    }

    // Strip trailing Z if present
    const datetime = clean.endsWith("Z") ? clean.slice(0, -1) : clean;
    const y = parseInt(datetime.slice(0, 4));
    const mo = parseInt(datetime.slice(4, 6)) - 1;
    const d = parseInt(datetime.slice(6, 8));

    // Time may be T09, T0900, T090000, T090000Z — handle all
    const timePart = datetime.slice(9); // "06" or "0600" or "060000"
    const h = parseInt(timePart.slice(0, 2)) || 0;
    const mi = parseInt(timePart.slice(2, 4)) || 0;
    const s = parseInt(timePart.slice(4, 6)) || 0;

    // Parse as UTC, return epoch ms
    return Date.UTC(y, mo, d, h, mi, s);
}

function parseRRule(rrule: string): string | undefined {
    // Convert RRULE to human-readable text
    const parts: Record<string, string> = {};
    for (const part of rrule.split(";")) {
        const [key, val] = part.split("=");
        parts[key] = val;
    }

    const freq = parts["FREQ"] || "WEEKLY";
    const byday = parts["BYDAY"] || "";

    const dayNames: Record<string, string> = {
        MO: "Mon", TU: "Tue", WE: "Wed", TH: "Thu", FR: "Fri", SA: "Sat", SU: "Sun",
    };

    if (freq === "WEEKLY" && byday) {
        const days = byday.split(",").map(d => dayNames[d] || d).join(", ");
        return `Every ${days}`;
    }
    if (freq === "DAILY") return "Every day";
    return undefined;
}

export function parseICS(icsContent: string): ScheduleEvent[] {
    // Normalize line endings and split
    const raw = icsContent.replace(/\r\n?/g, "\n");
    // Fix malformed lines where property colon is missing (e.g. "BEGIN:VCALENDARVERSION:2.0")
    // Split on property boundaries: line starts with uppercase word followed by colon
    const lines = raw.split(/\n(?=[A-Z][A-Z0-9-]*:)/);

    const events: ScheduleEvent[] = [];
    let currentEvent: Partial<Record<string, string>> = {};

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const colonIdx = trimmed.indexOf(":");
        if (colonIdx === -1) continue;

        const key = trimmed.slice(0, colonIdx).toUpperCase();
        const value = trimmed.slice(colonIdx + 1).trim();

        if (key === "BEGIN" && value === "VEVENT") {
            currentEvent = {};
        } else if (key === "END" && value === "VEVENT") {
            // Process event
            const dtstart = currentEvent["DTSTART"] || "";
            const dtend = currentEvent["DTEND"] || currentEvent["DTSTART"] || "";
            const summary = currentEvent["SUMMARY"] || "";
            const location = currentEvent["LOCATION"] || "";
            const uid = currentEvent["UID"] || "";
            const rrule = currentEvent["RRULE"] || "";

            if (dtstart && dtend) {
                const startTs = parseICSDate(dtstart);
                const endTs = parseICSDate(dtend);
                events.push({
                    id: uid || `${startTs}-${Math.random().toString(36).slice(2)}`,
                    title: summary || "Untitled",
                    location,
                    startTs,
                    endTs,
                    rrule: rrule || undefined,
                    recurrenceText: rrule ? parseRRule(rrule) : undefined,
                });
            }
            currentEvent = {};
        } else {
            // Handle property parameters (e.g. "DTSTART;TZID=Asia/Jakarta:20260326T090000")
            const mainKey = key.split(";")[0];
            currentEvent[mainKey] = value;
        }
    }

    return events;
}

// Expand recurring events for a given date range
export function expandRecurringEvents(
    event: ScheduleEvent,
    rangeStart: number,
    rangeEnd: number
): ScheduleEvent[] {
    // If no rrule, return as-is (check both undefined and empty string)
    if (!event.rrule) {
        // Still check if it's within range
        if (event.startTs >= rangeStart && event.startTs <= rangeEnd) {
            return [event];
        }
        return [];
    }

    const parts: Record<string, string> = {};
    for (const part of event.rrule.split(";")) {
        const [key, val] = part.split("=");
        parts[key] = val;
    }

    const freq = parts["FREQ"];
    if (freq !== "WEEKLY") return [event]; // Only handle weekly recurring for now

    const byday = (parts["BYDAY"] || "").split(",");
    const interval = parseInt(parts["INTERVAL"] || "1");

    // Duration of original event
    const duration = event.endTs - event.startTs;

    // Find first occurrence on or after rangeStart
    const originalStart = new Date(event.startTs);

    const dayMap: Record<string, number> = {
        SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6,
    };

    const expanded: ScheduleEvent[] = [];

    for (const day of byday) {
        const targetDay = dayMap[day];
        if (targetDay === undefined) continue;

        // Find first occurrence of this day on or after rangeStart
        const startOfRange = new Date(rangeStart);
        const daysToAdd = ((targetDay - startOfRange.getDay()) + 7) % 7;
        let current = new Date(startOfRange);
        current.setDate(startOfRange.getDate() + daysToAdd);
        // Set to same time as original event
        current.setHours(originalStart.getHours(), originalStart.getMinutes(), originalStart.getSeconds(), 0);


        // Walk forward and expand
        let weekCount = 0;
        while (current.getTime() <= rangeEnd) {
            if (current.getTime() >= rangeStart) {
                expanded.push({
                    ...event,
                    id: `${event.id}-${current.toISOString()}`,
                    startTs: current.getTime(),
                    endTs: current.getTime() + duration,
                });
            }
            // Next week
            current.setDate(current.getDate() + 7 * interval);
            weekCount++;
            if (weekCount > 52 * 2) break; // Safety: max 2 years
        }
    }

    return expanded.sort((a, b) => a.startTs - b.startTs);
}
