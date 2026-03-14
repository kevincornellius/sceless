import { useEffect, useState } from "preact/hooks";
import { Layout } from "./components/Layout";
import DashboardPage, { DashboardTab } from "./pages/DashboardPage";
import { activeTabKey, initStore } from "./stores/tabs";
import CourseDetailPage from "./pages/CourseDetailPage";
import { initializeTheme } from "./stores/theme";
import { initNavigation, navigateTab } from "./routing/router";
import { initAuthStore, wsToken } from "./stores/auth";
import { LoginPage } from "./pages/LoginPage";
import type { ComponentChildren } from "preact";
import { UrlToTab } from "./helper/tabs";

const getPageFromActiveTabKey = (): ComponentChildren => {
	const key = activeTabKey.value;
	if (!key) return <DashboardPage />;

	const [type, id] = key.split(":");

	switch (type) {
		case "dashboard":
			return <DashboardPage />;
		case "course":
			return <CourseDetailPage courseId={id} />;
		default:
			return <DashboardPage />;
	}
};

const PageContent = () => {
	return getPageFromActiveTabKey();
};

const App = () => {
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    useEffect(() => {
        const prepareApp = async () => {
            try {
                await initAuthStore();
                
				await initStore();
				await initializeTheme();
				initNavigation();
                await navigateTab(UrlToTab(window.location.href) || DashboardTab);

            } catch (e) {
                console.error("Initialization failed", e);
            } finally {
                setIsCheckingAuth(false);
            }
        };

        prepareApp();
    }, []);

    if (isCheckingAuth) {
        return <div class="bg-page min-h-screen" />; 
    }

    if (!wsToken.value) {
        return <LoginPage />;
    }

    return (
        <Layout>
            <PageContent />
        </Layout>
    );
};


export default App;