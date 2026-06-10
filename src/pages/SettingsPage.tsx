import { useState, useEffect } from "preact/hooks";
import { quizReviewHijackStorage, enabledStorage, sceleModStorage } from "../storage";
import { SCELE_URL } from "../config";
import { Tab } from "../types/state";
import { loadSiteInfo } from "../stores/indexeddb/siteinfo";
import { Profile } from "../types/profile";
import { ExternalLink, User } from "lucide-preact";

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
    const [version,   setVersion]   = useState("");
    const [quizReview, setQuizReview] = useState(true);
    const [enabled,   setEnabled]   = useState(true);
    const [sceleMod,  setSceleMod]  = useState(true);
    const [profile,   setProfile]   = useState<Profile | null>(null);

    useEffect(() => {
        setVersion(browser.runtime.getManifest().version);
        quizReviewHijackStorage.getValue().then((v) => setQuizReview(v ?? true));
        enabledStorage.getValue().then((v) => setEnabled(v ?? true));
        sceleModStorage.getValue().then((v) => setSceleMod(v ?? true));
        loadSiteInfo().then(({ info }) => setProfile(info));
    }, []);

    const handleQuizReview = async (v: boolean) => {
        setQuizReview(v);
        await quizReviewHijackStorage.setValue(v);
    };

    const handleEnabled = async (v: boolean) => {
        setEnabled(v);
        await enabledStorage.setValue(v);
    };

    const handleSceleMod = async (v: boolean) => {
        setSceleMod(v);
        await sceleModStorage.setValue(v);
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
                {/* Profile */}
                <div class="rounded-xl border-2 border-edge bg-page">
                    <div class="px-4 pt-4 pb-2 border-b border-edge">
                        <h2 class="text-xs font-bold uppercase tracking-wider text-content-muted">Account</h2>
                    </div>
                    <div class="px-4 py-4">
                        {profile ? (
                            <div class="flex items-center gap-4">
                                {profile.pictureurl ? (
                                    <img src={profile.pictureurl} class="w-14 h-14 rounded-full object-cover shrink-0 border-2 border-edge" />
                                ) : (
                                    <div class="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center shrink-0 border-2 border-edge">
                                        <User class="w-7 h-7 text-primary" />
                                    </div>
                                )}
                                <div class="flex-1 min-w-0">
                                    <p class="text-sm font-bold text-content truncate">{profile.name}</p>
                                    <p class="text-xs text-content-muted truncate">@{profile.username}</p>
                                    <p class="text-xs text-content-muted mt-0.5">ID: {profile.id}</p>
                                </div>
                                <a
                                    href={`${SCELE_URL}/user/profile.php?id=${profile.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="p-2 rounded-lg hover:bg-edge transition-colors text-content-muted hover:text-content shrink-0"
                                    title="Open profile on SCELE"
                                >
                                    <ExternalLink class="w-4 h-4" />
                                </a>
                            </div>
                        ) : (
                            <div class="flex items-center gap-3">
                                <div class="w-14 h-14 rounded-full bg-edge animate-pulse shrink-0" />
                                <div class="space-y-2 flex-1">
                                    <div class="h-3 bg-edge rounded animate-pulse w-32" />
                                    <div class="h-3 bg-edge rounded animate-pulse w-20" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
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
                            label="Stylized SCELE Native Pages"
                            description="Apply Sceless fonts, colors, and theme to native SCELE pages (course, mod, user profile, etc.)."
                            checked={sceleMod}
                            onChange={handleSceleMod}
                        />
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
                    <div class="px-4 py-4 space-y-3 text-sm text-content-muted">
                        <div class="flex justify-between items-center">
                            <span>Version</span>
                            <span class="font-semibold text-content">{version}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span>Website</span>
                            <a
                                href="https://sceless.cornellius.dev"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="flex items-center gap-1 font-semibold text-primary hover:underline"
                            >
                                sceless.cornellius.dev
                                <ExternalLink class="w-3 h-3" />
                            </a>
                        </div>
                        <div class="flex justify-between items-center">
                            <span>Privacy Policy</span>
                            <a
                                href="https://sceless.cornellius.dev/privacy"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="flex items-center gap-1 font-semibold text-primary hover:underline"
                            >
                                View
                                <ExternalLink class="w-3 h-3" />
                            </a>
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
