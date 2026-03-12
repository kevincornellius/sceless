import { useEffect, useState } from "preact/hooks";
import { Layout } from "./components/Layout";
import DashboardPage from "./pages/DashboardPage";
import { activeTabKey, initStore } from "./stores/tabs";
import CourseDetailPage from "./pages/CourseDetailPage";
import { initializeTheme } from "./stores/theme";
import { initNavigation } from "./routing/router";
import { initAuthStore, wsToken } from "./stores/auth";
import { LoginPage } from "./pages/LoginPage";

const PageContent = () => {
	const [type, id] = activeTabKey.value?.split(":") || ["", ""];

	switch (type) {
		case "dashboard":
			return <DashboardPage />;
		case "course": 
			return <CourseDetailPage courseId={id} />;
		default:
			return <DashboardPage />;
	}
};

const App = () => {
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    useEffect(() => {
        const prepareApp = async () => {
            try {
                await initAuthStore();
                
				initStore();
				initNavigation();
				initializeTheme();

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