import { useEffect, useState, useRef } from "preact/hooks";
import { Clock, MapPin, Upload, Trash2, Bell, BellOff } from "lucide-preact";
import {
    scheduleMeta,
    scheduleEvents,
    scheduleLoaded,
    getCurrentClass,
    getNextClass,
    saveScheduleICS,
    deleteSchedule,
} from "@/src/stores/schedule";
import { ScheduleEvent } from "@/src/data/adapter/ics";

function formatCountdown(targetTs: number, label: string): string {
    const diff = targetTs - Date.now();
    if (diff <= 0) return `${label} now`;
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);
    if (h > 0) return `${label} in ${h}h ${m}m`;
    if (m > 0) return `${label} in ${m}m ${s}s`;
    return `${label} in ${s}s`;
}

function EventPill({ event, isActive }: { event: ScheduleEvent; isActive: boolean }) {
    const [countdown, setCountdown] = useState("");
    const target = isActive ? event.endTs : event.startTs;
    const label = isActive ? "ending" : "starts";

    useEffect(() => {
        setCountdown(formatCountdown(target, label));
        const id = setInterval(() => {
            setCountdown(formatCountdown(target, label));
        }, 1000);
        return () => clearInterval(id);
    }, [target, label]);

    return (
        <div class="flex flex-col gap-1 px-3 py-2">
            <div class="flex items-center gap-1.5">
                <div class={`w-2 h-2 rounded-full shrink-0 ${isActive ? "bg-danger animate-pulse" : "bg-primary"}`} />
                <span class={`text-[10px] font-bold uppercase tracking-wide ${isActive ? "text-danger" : "text-primary"}`}>
                    {isActive ? "In Course" : "Next Course"}
                </span>
            </div>
            <p class="text-xs font-bold text-content leading-tight">{event.title}</p>
            {event.location && (
                <div class="flex items-center gap-1 text-[10px] text-content-muted">
                    <MapPin class="w-2.5 h-2.5 shrink-0" />
                    <span class="truncate">{event.location}</span>
                </div>
            )}
            <span class={`text-[10px] font-semibold ${isActive ? "text-danger" : "text-content-muted"}`}>
                {countdown}
            </span>
        </div>
    );
}

export function ScheduleSection() {
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const loaded = scheduleLoaded.value;
    const meta = scheduleMeta.value;
    const events = scheduleEvents.value;
    const current = getCurrentClass();
    const next = getNextClass();

    const handleFileChange = async (e: Event) => {
        const input = e.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const text = await file.text();
            const events = await saveScheduleICS(file.name, text);
        } catch (err) {
            console.error("[Schedule] Failed to parse ICS:", err);
        } finally {
            setIsUploading(false);
            input.value = "";
        }
    };

    const handleDelete = async () => {
        await deleteSchedule();
    };

    if (!loaded) {
        return (
            <div class="flex flex-col">
                {true && ( // expanded check
                    <div class="px-3 py-2">
                        <div class="animate-pulse flex flex-col gap-2">
                            <div class="h-3 bg-edge rounded w-20" />
                            <div class="h-4 bg-edge rounded w-32" />
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div class="flex flex-col">
            {true && (
                <div class="flex items-center justify-between px-3 py-2">
                    <span class="text-[10px] font-bold text-content-muted uppercase tracking-wide">Schedule</span>
                    <div class="flex items-center gap-1">
                        {meta && (
                            <button
                                onClick={handleDelete}
                                class="p-1 rounded text-content-muted hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                                title="Remove schedule"
                            >
                                <Trash2 class="w-3 h-3" />
                            </button>
                        )}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            class="p-1 rounded text-content-muted hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                            title="Upload ICS schedule"
                        >
                            <Upload class="w-3 h-3" />
                        </button>
                    </div>
                </div>
            )}

            {isUploading ? (
                <div class="px-3 py-2 text-xs text-content-muted italic">Parsing schedule...</div>
            ) : meta && events.length > 0 ? (
                <div class="flex flex-col gap-0.5 px-2">
                    {current && <EventPill event={current} isActive={true} />}
                    {!current && next && <EventPill event={next} isActive={false} />}
                    {!current && !next && (
                        <div class="px-3 py-2 text-xs text-content-muted italic">No upcoming classes</div>
                    )}
                </div>
            ) : (
                <div class="px-3 py-2">
                    <p class="text-[10px] text-content-muted leading-relaxed">No schedule loaded.</p>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        class="mt-1 text-[10px] font-semibold text-primary hover:underline cursor-pointer"
                    >
                        Upload .ics file
                    </button>
                </div>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept=".ics"
                class="hidden"
                onChange={handleFileChange}
            />

            <span class="border-t border-edge mx-2 my-2" />
        </div>
    );
}
