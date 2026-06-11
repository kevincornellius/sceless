import { useEffect, useState, useRef } from "preact/hooks";
import { Clock, MapPin, Upload, Trash2, Calendar } from "lucide-preact";
import {
    scheduleMeta,
    scheduleEvents,
    scheduleLoaded,
    scheduleTick,
    getCurrentClass,
    getNextClass,
    saveScheduleICS,
    deleteSchedule,
} from "@/src/stores/schedule";

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

export function ScheduleSection({ expanded }: { expanded: boolean }) {
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const loaded = scheduleLoaded.value;
    const meta = scheduleMeta.value;
    const events = scheduleEvents.value;
    const current = getCurrentClass();
    const next = getNextClass();
    // Subscribe to minute tick for countdown updates
    void scheduleTick.value;

    const handleFileChange = async (e: Event) => {
        const input = e.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;
        setIsUploading(true);
        try {
            await saveScheduleICS(file.name, await file.text());
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

    const dotColor = current
        ? "bg-danger animate-pulse"
        : next
        ? "bg-primary"
        : "bg-edge";

    if (!expanded) {
        return (
            <div class="flex flex-col items-center gap-1 px-2 pt-2 pb-3 border-t border-edge">
                {isUploading ? (
                    <div class="w-3 h-3 rounded-full border-2 border-t-primary animate-spin" />
                ) : meta ? (
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        title={current?.title || next?.title || "Schedule"}
                        class="relative p-2 rounded-lg cursor-pointer transition-colors hover:bg-primary/10"
                    >
                        <Calendar class="w-4 h-4 text-content-muted" />
                        <span class={`absolute top-1 right-1 w-2 h-2 rounded-full ${dotColor}`} />
                    </button>
                ) : (
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        title="Upload .ics schedule"
                        class="p-2 rounded-lg text-content-muted hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                    >
                        <Upload class="w-4 h-4" />
                    </button>
                )}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".ics"
                    class="hidden"
                    onChange={handleFileChange}
                />
            </div>
        );
    }

    return (
        <div class="flex flex-col border-t border-edge">
            <div class="flex items-center justify-between px-3 pt-2 pb-1">
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

            {isUploading ? (
                <div class="px-3 py-2 text-xs text-content-muted italic">Parsing schedule...</div>
            ) : meta && events.length > 0 ? (
                <div class="px-3 pb-3">
                    {current || next ? (
                        <>
                            <div class="flex items-center gap-1.5 mb-0.5">
                                <div class={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                                <span class={`text-[10px] font-bold uppercase tracking-wide ${current ? "text-danger" : "text-primary"}`}>
                                    {current ? "In Course" : "Next"}
                                </span>
                            </div>
                            <p class="text-xs font-bold text-content leading-tight truncate">
                                {(current || next)!.title}
                            </p>
                            {(current?.location || next?.location) && (
                                <div class="flex items-center gap-1 mt-0.5 text-[10px] text-content-muted">
                                    <MapPin class="w-2.5 h-2.5 shrink-0" />
                                    <span class="truncate">{current?.location || next?.location}</span>
                                </div>
                            )}
                            <span class={`text-[10px] font-semibold ${current ? "text-danger" : "text-content-muted"}`}>
                                {current
                                    ? formatCountdown(current.endTs, "ending")
                                    : formatCountdown(next!.startTs, "starts")}
                            </span>
                        </>
                    ) : (
                        <p class="text-[10px] text-content-muted italic">No upcoming classes</p>
                    )}
                </div>
            ) : (
                <div class="px-3 pb-3">
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
        </div>
    );
}
