import { LoginPage } from "./pages/LoginPage";
import { Layout } from "./components/Layout";
import type { InitialData } from "./types/scele";
import { loadPins } from "./stores/pins";
import { loadCourses } from "./stores/courses";
import { loadTheme } from "./stores/theme";
import { useEffect } from "preact/hooks";
import DashboardPage from "./pages/DashboardPage";
import { activeTab, initNavigation, loadOpenTabs } from "./routing/router";
import { useComputed } from "@preact/signals";
import CourseDetailPage from "./pages/CourseDetailPage";

const PageContent = ({ data }: { data: InitialData }) => {
	const page = useComputed(() => activeTab.value);
	console.log("Active page from app.tsx:", page.value);
	switch (page.value.type) {
		case "dashboard":
			return <DashboardPage data={data} />;
		case "course":
			console.log("Rendering CourseDetailPage for URL:", page.value.url);
			return <CourseDetailPage url={page.value.url} />;
		default:
			return <div class="p-6">Unknown page type</div>;
	}
};

const App = ({ data }: { data: InitialData }) => {
	useEffect(() => {
		loadCourses();
		loadPins();
		loadOpenTabs();
		loadTheme();
		initNavigation();
	}, []);

	if (!data.isLoggedIn) {
		return <LoginPage />;
	}

	return (
		<Layout data={data}>
			<PageContent data={data} />
		</Layout>
	);
};

export default App;
