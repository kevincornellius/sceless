import { useState, useRef } from "preact/hooks";
import { MapPin, ChevronDown, Upload, Trash2, Calendar } from "lucide-preact";
import {
    scheduleEvents,
    scheduleLoaded,
    scheduleTick,
    getCurrentClass,
    getNextClass,
    saveScheduleICS,
    deleteSchedule,
} from "@/src/stores/schedule";

function formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function formatCountdownShort(targetTs: number): string {
    const diff = targetTs - Date.now();
    if (diff <= 0) return "now";
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

export function ScheduleBar() {
    const [visible, setVisible] = useState(true);
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const loaded = scheduleLoaded.value;
    const events = scheduleEvents.value;
    const current = getCurrentClass();
    const next = getNextClass();
    // Access tick to subscribe to minute updates — used in JSX below
    void scheduleTick.value;

    const handleFile = async (e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            await saveScheduleICS(file.name, await file.text());
        } catch (err) {
            console.error("[ScheduleBar] Failed to load schedule:", err);
        } finally {
            setUploading(false);
            (e.target as HTMLInputElement).value = "";
        }
    };

    const handleDelete = () => {
        deleteSchedule();
    };

    return (
        <>
            {/* Bottom bar — slides up from bottom */}
            <div
                class={`fixed bottom-0 left-0 right-0 z-40 border-t-2 border-edge bg-page-secondary transition-transform duration-300 ${
                    visible ? "translate-y-0" : "translate-y-full"
                }`}
            >
                <div class="flex items-center gap-2 px-3 py-1.5">
                    {uploading ? (
                        <div class="w-2 h-2 rounded-full border-2 border-t-primary animate-spin shrink-0" />
                    ) : (
                        <div class={`w-2 h-2 rounded-full shrink-0 ${current ? "bg-danger animate-pulse" : next ? "bg-primary" : "bg-edge"}`} />
                    )}

                    {current || next ? (
                        <>
                            <span class={`text-[10px] font-bold uppercase shrink-0 ${current ? "text-danger" : "text-primary"}`}>
                                {current ? "In Course" : "Next"}
                            </span>
                            <span class="text-xs font-semibold text-content truncate">{current?.title || next?.title}</span>
                            {(current?.location || next?.location) && (
                                <span class="hidden sm:flex items-center gap-0.5 text-[10px] text-content-muted shrink-0">
                                    <MapPin class="w-2.5 h-2.5" />{current?.location || next?.location}
                                </span>
                            )}
                            <span class="text-[10px] text-content-muted shrink-0">
                                {formatTime((current || next)!.startTs)} – {formatTime((current || next)!.endTs)}
                            </span>
                            <span class={`text-[10px] font-semibold shrink-0 ${current ? "text-danger" : "text-primary"}`}>
                                {current ? `ends ${formatCountdownShort(current.endTs)}` : `in ${formatCountdownShort(next!.startTs)}`}
                            </span>
                            {current && next && (
                                <span class="hidden lg:flex items-center gap-1 text-[10px] text-content-muted shrink-0 ml-2 pl-2 border-l border-edge">
                                    <span class="text-primary font-semibold">↑ Next</span>
                                    <span class="text-content truncate">{next.title}</span>
                                    <span class="text-primary font-semibold">in {formatCountdownShort(next.startTs)}</span>
                                </span>
                            )}
                        </>
                    ) : loaded && events.length > 0 ? (
                        <span class="text-xs text-content-muted">Schedule · {events.length} events</span>
                    ) : (
                        <>
                            <Calendar class="w-3 h-3 text-content-muted shrink-0" />
                            <span class="text-xs text-content-muted">No schedule</span>
                            <button
                                onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
                                class="text-xs font-semibold text-primary hover:underline cursor-pointer shrink-0"
                            >
                                Upload .ics
                            </button>
                        </>
                    )}

                    <div class="flex items-center gap-0.5 ml-auto shrink-0">
                        {loaded && events.length > 0 && (
                            <button
                                onClick={handleDelete}
                                class="p-1 rounded text-content-muted hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                                title="Remove schedule"
                            >
                                <Trash2 class="w-3 h-3" />
                            </button>
                        )}
                        <button
                            onClick={() => fileRef.current?.click()}
                            class="p-1 rounded text-content-muted hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                            title="Upload schedule"
                        >
                            <Upload class="w-3 h-3" />
                        </button>
                        <button
                            onClick={() => setVisible(false)}
                            class="p-1 rounded text-content-muted hover:text-content hover:bg-edge transition-colors cursor-pointer"
                        >
                            <ChevronDown class="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* FAB — shown when bar is hidden */}
            {!visible && (
                <button
                    onClick={() => setVisible(true)}
                    class={`fixed bottom-4 right-4 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-lg border-2 transition-all cursor-pointer ${
                        current
                            ? "bg-danger border-danger text-white animate-pulse"
                            : next
                            ? "bg-primary border-primary text-white"
                            : "bg-page-secondary border-edge text-content-muted hover:border-primary hover:text-primary"
                    }`}
                    title="Show schedule"
                >
                    {uploading ? (
                        <div class="w-4 h-4 rounded-full border-2 border-t-primary animate-spin" />
                    ) : current ? (
                        <div class="w-4 h-4 rounded-full bg-white animate-pulse" />
                    ) : (
                        <Calendar class="w-5 h-5" />
                    )}
                </button>
            )}

            <input ref={fileRef} type="file" accept=".ics" class="hidden" onChange={handleFile} />
        </>
    );
}
