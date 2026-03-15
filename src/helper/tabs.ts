import { SCELE_URL } from "../config";
import { CourseDetailTab } from "../pages/CourseDetailPage";
import { DashboardTab } from "../pages/DashboardPage";
import { Tab } from "../types/state";
import { getCourseTitle } from "../stores/indexeddb/course";

export function TabToUrl(tab: Tab): string {
	const route = () => {
		switch (tab.type) {
			case "dashboard":
				return "";
			case "course":
				return `course/view.php?id=${tab.id}`;
		}
	};

	return `${SCELE_URL}/${route()}`;
}
export function UrlToTab(urlString: string): Tab | null {
	try {
		const url = new URL(urlString);
		const path = url.pathname;
		const id = url.searchParams.get("id");

		if (path === "/") {
			return DashboardTab;
		}

		if (path === "/course/view.php") {
			if (!id) return DashboardTab;
			const courseTitle = getCourseTitle(id) || `Course ${id}`;
			return CourseDetailTab(id, courseTitle);
		}

		if (path === "/mod/forum/view.php") {
			if (!id) return DashboardTab;
			return {
				type: "forum",
				id: `forum-${id}`,
				title: `Forum ${id}`,
                url: `${SCELE_URL}/mod/forum/view.php?id=${id}`,
			};
		}

		return DashboardTab;
	} catch (error) {
		console.warn("Failed to parse URL:", urlString, error);
		return null;
	}
}
