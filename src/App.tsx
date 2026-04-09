import { useEffect, useState } from "preact/hooks";
import { Layout } from "./components/Layout";
import DashboardPage, { DashboardTab } from "./pages/DashboardPage";
import TasksPage from "./pages/TasksPage";
import { activeTabKey, initStore } from "./stores/tabs";
import CourseDetailPage from "./pages/CourseDetailPage";
import { initializeTheme } from "./stores/theme";
import { initNavigation, navigateTab, markBootComplete } from "./routing/router";
import { initAuthStore, wsToken } from "./stores/auth";
import { LoginPage } from "./pages/LoginPage";
import type { ComponentChildren } from "preact";
import { UrlToTab } from "./helper/tabs";
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
		default:
			return <DashboardPage />;
	}
};

const PageContent = () => {
	return getPageFromActiveTabKey();
};
type AppState = 'checking_auth' | 'unauthenticated' | 'booting_data' | 'ready';

const App = () => {
    const [appState, setAppState] = useState<AppState>('checking_auth');

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
                    console.log("Bootstrapping core application data...");
                    await loadSiteInfo();
                    await loadCourses();
                    await initPinnedCoursesStore();
                    await refreshNewModuleCounts();
                    await loadSchedule();

                    await navigateTab(UrlToTab(window.location.href) || DashboardTab);
                    markBootComplete();
                } catch (e) {
                    console.error("Failed to boot core data", e);
                } finally {
                    setAppState('ready'); // ONLY NOW do we let the UI render
                }
            };
            bootCoreData();
        }
    }, [appState]);

    useEffect(() => {
        const handleUnload = () => setLastVisit();
        window.addEventListener("beforeunload", handleUnload);
        return () => window.removeEventListener("beforeunload", handleUnload);
    }, []);


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