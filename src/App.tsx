import { useEffect } from "preact/hooks";
import { Layout } from "./components/Layout";
import DashboardPage from "./pages/DashboardPage";
import { activeTabKey, initStore } from "./stores/tabs";
import CourseDetailPage from "./pages/CourseDetailPage";
import { initializeTheme } from "./stores/theme";
import { initNavigation } from "./routing/router";

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
	useEffect(() => {
		initStore();
		initializeTheme();
		initNavigation();
	}, []);

	// if (!data.isLoggedIn) {
	// 	return <LoginPage />;
	// }

	return (
		<Layout>
			<PageContent />
		</Layout>
	);
};

export default App;
