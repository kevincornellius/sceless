import { SCELE_URL } from "../config";
import { Tab } from "../types/state";

const CourseDetailPage = ({ courseId }: { courseId: string }) => {
	return <div class="">This is the course detail page for course {courseId}</div>;
};

export default CourseDetailPage;

export const CourseDetailTab = (courseId: string, courseTitle: string, courseUrl? :string|undefined): Tab => {
	return {
		type: "course",
		id: courseId,
		title: courseTitle,
		url: courseUrl || `${SCELE_URL}/course/view.php?id=${courseId}`,
	} as Tab;
};
