import { useEffect, useState } from "preact/hooks";
import { Layout } from "./components/Layout";
import DashboardPage, { DashboardTab } from "./pages/DashboardPage";
import TasksPage from "./pages/TasksPage";
import SettingsPage from "./pages/SettingsPage";
import { activeTabKey, initStore } from "./stores/tabs";
import CourseDetailPage from "./pages/CourseDetailPage";
import AllCoursesPage from "./pages/AllCoursesPage";
import WrappedPage from "./pages/WrappedPage";
import { theme, initializeTheme } from "./stores/theme";
import { initNavigation, navigateTab, markBootComplete } from "./routing/router";
import { initAuthStore, wsToken } from "./stores/auth";
import { LoginPage } from "./pages/LoginPage";
import type { ComponentChildren } from "preact";
import { UrlToTab } from "./helper/tabs";
import { WRAPPED_ENABLED } from "./config";
import { loadCourses } from "./stores/indexeddb/course";
import { loadSiteInfo } from "./stores/indexeddb/siteinfo";
import { initPinnedCoursesStore } from "./stores/pinned";
import { initHotkeys } from "./stores/hotkeys";
import { setLastVisit } from "./stores/lastVisit";
import { refreshNewModuleCounts } from "./stores/seenModules";
import { loadSchedule } from "./stores/schedule";

const getPageFromActiveTabKey = (): ComponentChildren => {
	const key = activeTabKey.value;
	if (!key) return <DashboardPage />;

	const [type, id] = key.split(":");

	switch (type) {
		case "dashboard":
			return <DashboardPage />;
		case "course":
			return <CourseDetailPage courseId={id} />;
		case "tasks":
			return <TasksPage />;
		case "settings":
			return <SettingsPage />;
		case "all-courses":
			return <AllCoursesPage />;
		case "wrapped":
			return WRAPPED_ENABLED !== "false" ? <WrappedPage /> : <DashboardPage />;
		default:
			return <DashboardPage />;
	}
};

const PageContent = () => {
	return getPageFromActiveTabKey();
};
type AppState = 'checking_auth' | 'unauthenticated' | 'booting_data' | 'ready' | 'error';

const App = () => {
    const [appState, setAppState] = useState<AppState>('checking_auth');
    const [bootError, setBootError] = useState<string | null>(null);

    useEffect(() => {
        const initializeAuth = async () => {
            try {
                await initAuthStore();
                await initStore();
                await initializeTheme();
                initNavigation();
                initHotkeys();
                
                if (wsToken.value) {
                    setAppState('booting_data');
                } else {
                    setAppState('unauthenticated');
                }
            } catch (e) {
                console.error("Auth init failed", e);
                setAppState('unauthenticated');
            }
        };
        initializeAuth();
    }, []);

    useEffect(() => {
        if (appState === 'unauthenticated' && wsToken.value) {
            setAppState('booting_data');
        }
    }, [wsToken.value, appState]);

    useEffect(() => {
        if (appState === 'booting_data') {
            const bootCoreData = async () => {
                try {
                    await loadSiteInfo();
                    await loadCourses();
                    await initPinnedCoursesStore();
                    await refreshNewModuleCounts();
                    await loadSchedule();

                    await navigateTab(UrlToTab(window.location.href) || DashboardTab);
                    markBootComplete();
                    import("./stores/indexeddb/activity").then(({ trackThemeInit }) => trackThemeInit(theme.value.name));
                } catch (e) {
                    console.error("Failed to boot core data", e);
                    setBootError(e instanceof Error ? e.message : "An unexpected error occurred.");
                    setAppState('error');
                    return;
                }
                setAppState('ready'); // ONLY NOW do we let the UI render
            };
            bootCoreData();
        }
    }, [appState]);

    useEffect(() => {
        const handleUnload = () => {
            setLastVisit();
            import("./stores/indexeddb/activity").then(({ trackThemeFlush }) => trackThemeFlush(theme.value.name));
        };
        window.addEventListener("beforeunload", handleUnload);
        return () => window.removeEventListener("beforeunload", handleUnload);
    }, []);


    if (appState === 'error') {
        return (
            <div class="min-h-screen bg-page flex items-center justify-center">
                <div class="max-w-md text-center p-8">
                    <div class="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center mx-auto mb-4">
                        <span class="text-danger text-2xl font-bold">!</span>
                    </div>
                    <h1 class="text-xl font-bold text-content mb-2">Failed to load Sceless</h1>
                    <p class="text-content-muted text-sm mb-3">Could not fetch your course data from SCELE.</p>
                    {bootError && (
                        <p class="text-xs text-content-muted font-mono bg-page-secondary border border-edge rounded px-3 py-2 mb-6 text-left break-all">
                            {bootError}
                        </p>
                    )}
                    <button
                        onClick={() => window.location.reload()}
                        class="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                        Try again
                    </button>
                </div>
            </div>
        );
    }

    if (appState === 'checking_auth' || appState === 'booting_data') {
        // Keeps the UI locked while background data is fetching
        return <div class="bg-page min-h-screen" />; 
    }

    if (appState === 'unauthenticated') {
        return <LoginPage />;
    }

    return (
        <Layout>
            <PageContent />
        </Layout>
    );
};

export default App;