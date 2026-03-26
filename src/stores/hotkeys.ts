import { signal } from "@preact/signals";
import { DashboardTab } from "@/src/pages/DashboardPage";
import { navigateTab, deleteTab } from "@/src/routing/router";
import { activeTabKey } from "@/src/stores/tabs";
import { closeAllDropdowns } from "@/src/components/ui/Navbar";

export const isSearchOpen = signal(false);

type HotkeyHandler = () => void;

interface Hotkey {
    key: string;
    ctrl?: boolean;
    meta?: boolean;
    shift?: boolean;
    handler: HotkeyHandler;
    description: string;
}

const handlers: Hotkey[] = [
    {
        key: "k",
        ctrl: true,
        handler: () => {
            closeAllDropdowns();
            isSearchOpen.value = true;
            // Focus search input after a tick
            setTimeout(() => {
                const input = document.querySelector<HTMLInputElement>("header input[type='text']");
                input?.focus();
            }, 10);
        },
        description: "Open search",
    },
    {
        key: "d",
        ctrl: true,
        handler: () => {
            closeAllDropdowns();
            navigateTab(DashboardTab);
        },
        description: "Go to dashboard",
    },
    {
        key: "Escape",
        handler: () => {
            const current = activeTabKey.value;
            if (current && !current.startsWith("dashboard")) {
                deleteTab(current);
            }
            closeAllDropdowns();
            isSearchOpen.value = false;
        },
        description: "Close current tab",
    },
];

export const initHotkeys = () => {
    document.addEventListener("keydown", (e) => {
        // Don't fire if user is typing in an input
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
            // Only allow Escape in inputs
            if (e.key !== "Escape") return;
        }

        for (const hotkey of handlers) {
            const ctrlMatch = hotkey.ctrl ? e.ctrlKey || e.metaKey : !e.ctrlKey && !e.metaKey;
            const shiftMatch = hotkey.shift ? e.shiftKey : !e.shiftKey;

            if (e.key.toLowerCase() === hotkey.key.toLowerCase() && ctrlMatch && shiftMatch) {
                e.preventDefault();
                hotkey.handler();
                return;
            }
        }
    });
};
