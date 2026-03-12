import { SCELE_URL } from "../config";
import { navigateTab } from "../routing/router";
import { Tab } from "../types/state";
import { CourseDetailTab } from "./CourseDetailPage";

export default function Dashboard() {
	return (
		<div>
			<div onClick={() => navigateTab(DashboardTab)}>Dashboard</div>
			<div
				onClick={() =>
					navigateTab(
						CourseDetailTab("1", "Introduction to Programming"),
					)
				}
			>
				Courses
			</div>
			<div>Assignments</div>
			<div>Mini Calendar</div>
		</div>
	);
}

export const DashboardTab: Tab = {
	type: "dashboard",
	id: "page",
	title: "Dashboard",
	url: `${SCELE_URL}/my/`,
};
