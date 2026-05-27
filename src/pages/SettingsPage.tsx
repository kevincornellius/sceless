import { useState, useEffect } from "preact/hooks";
import { quizReviewHijackStorage, enabledStorage } from "../storage";
import { LogoL } from "../components/ui/Logo";
import { SCELE_URL } from "../config";
import { Tab } from "../types/state";

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            class={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                checked ? "bg-primary" : "bg-edge"
            }`}
        >
            <span
                class={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition duration-200 ${
                    checked ? "translate-x-5" : "translate-x-0"
                }`}
            />
        </button>
    );
}

function SettingRow({
    label,
    description,
    checked,
    onChange,
}: {
    label: string;
    description: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <div class="flex items-center justify-between gap-4 py-4 border-b border-edge last:border-b-0">
            <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-content">{label}</p>
                <p class="text-xs text-content-muted mt-0.5">{description}</p>
            </div>
            <Toggle checked={checked} onChange={onChange} />
        </div>
    );
}

export default function SettingsPage() {
    const [version, setVersion] = useState("");
    const [quizReview, setQuizReview] = useState(true);
    const [enabled, setEnabled] = useState(true);

    useEffect(() => {
        setVersion(browser.runtime.getManifest().version);
        quizReviewHijackStorage.getValue().then((v) => setQuizReview(v ?? true));
        enabledStorage.getValue().then((v) => setEnabled(v ?? true));
    }, []);

    const handleQuizReview = async (v: boolean) => {
        setQuizReview(v);
        await quizReviewHijackStorage.setValue(v);
    };

    const handleEnabled = async (v: boolean) => {
        setEnabled(v);
        await enabledStorage.setValue(v);
    };

    return (
        <div class="p-4 lg:p-6 h-full overflow-y-auto">
            {/* Header */}
            <div class="flex items-center gap-3 mb-6">
                <div>
                    <h1 class="text-base font-bold text-content leading-tight">Sceless Settings</h1>
                    <p class="text-xs text-content-muted">v{version}</p>
                </div>
            </div>

            <div class="max-w-2xl space-y-4">
                {/* General */}
                <div class="rounded-xl border-2 border-edge bg-page">
                    <div class="px-4 pt-4 pb-2 border-b border-edge">
                        <h2 class="text-xs font-bold uppercase tracking-wider text-content-muted">General</h2>
                    </div>
                    <div class="px-4">
                        <SettingRow
                            label="Enable Sceless"
                            description="Replace SCELE's default UI with Sceless. Disable to use the original SCELE interface."
                            checked={enabled}
                            onChange={handleEnabled}
                        />
                    </div>
                </div>

                {/* Features */}
                <div class="rounded-xl border-2 border-edge bg-page">
                    <div class="px-4 pt-4 pb-2 border-b border-edge">
                        <h2 class="text-xs font-bold uppercase tracking-wider text-content-muted">Features</h2>
                    </div>
                    <div class="px-4">
                        <SettingRow
                            label="Quiz Review"
                            description="Replace the quiz review page with Sceless's custom layout for better readability and print support."
                            checked={quizReview}
                            onChange={handleQuizReview}
                        />
                    </div>
                </div>

                {/* About */}
                <div class="rounded-xl border-2 border-edge bg-page">
                    <div class="px-4 pt-4 pb-2 border-b border-edge">
                        <h2 class="text-xs font-bold uppercase tracking-wider text-content-muted">About</h2>
                    </div>
                    <div class="px-4 py-4 space-y-2 text-sm text-content-muted">
                        <div class="flex justify-between">
                            <span>Version</span>
                            <span class="font-semibold text-content">{version}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export const SettingsTab: Tab = {
    type: "settings",
    id: "page",
    title: "Settings",
    url: `${SCELE_URL}/user/preferences.php`,
};
