import { SCELE_URL } from "../config";
import { CourseDetailTab } from "../pages/CourseDetailPage";
import { DashboardTab } from "../pages/DashboardPage";
import { SettingsTab } from "../pages/SettingsPage";
import { Tab } from "../types/state";
import { getCourseCode } from "../stores/indexeddb/course";

export function QuizReviewTab(attemptId: string): Tab {
	return {
		type: "quiz-review",
		id: attemptId,
		title: `Quiz Review ${attemptId}`,
		url: `${SCELE_URL}/mod/quiz/review.php?attempt=${attemptId}`,
	};
}

export const TasksTab: Tab = {
	type: "tasks",
	id: "page",
	title: "Tasks",
	url: `${SCELE_URL}/my`,
};

export function TabToUrl(tab: Tab): string {
	const route = () => {
		switch (tab.type) {
			case "dashboard":
				return "";
			case "course":
				return `course/view.php?id=${tab.id}`;
			case "quiz-review":
				return `mod/quiz/review.php?attempt=${tab.id}`;
			case "tasks":
				return "my";
			case "settings":
				return "user/preferences.php";
		}
	};

	return `${SCELE_URL}/${route()}`;
}
export function UrlToTab(urlString: string): Tab | null {
	try {
		const url = new URL(urlString);
		const path = url.pathname;
		const id = url.searchParams.get("id");
		console.log("Parsing URL to tab:", urlString, "->", { path, id });
		if (path === "/") {
			return DashboardTab;
		}

		if (path === "/my/") {
			return TasksTab;
		}

		if (path === "/course/view.php") {
			if (!id) return DashboardTab;
			const courseTitle = getCourseCode(id) || `Course ${id}`;
			return CourseDetailTab(id, courseTitle);
		}

		if (path === "/mod/quiz/review.php") {
			const attemptId = url.searchParams.get("attempt");
			if (!attemptId || !Number.isFinite(Number(attemptId))) return DashboardTab;
			return QuizReviewTab(String(Number(attemptId)));
		}

		if (path === "/user/preferences.php") {
			return SettingsTab;
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
