import { Course, CourseSection } from "@/src/types/course";
import { fetchMoodle } from "./fetch";
import { decodeEntities } from "@/src/utils/html";

export interface MoodleCourse {
    id: number;
    fullname: string;
    shortname: string;
    idnumber: string;
    summary: string;
    summaryformat: number;
    startdate: number;
    enddate: number;
    visible: boolean;
    fullnamedisplay: string;
    viewurl: string;
    courseimage: string;
    progress?: number;
    hasprogress: boolean;
    isfavourite: boolean;
    hidden: boolean;
    showshortname: boolean;
    coursecategory: string;
}



interface EnrolledCoursesResponse {
    courses: MoodleCourse[];
    nextoffset: number;
}
export async function getInprogressCourses(): Promise<Course[]> {
    const data = await fetchMoodle<EnrolledCoursesResponse>(
        "core_course_get_enrolled_courses_by_timeline_classification",
        { classification: "inprogress" }
    );

    if (!data || !data.courses) {
        return [];
    }

    return data.courses.map(c => ({
        id: c.id,
        title: decodeEntities(c.fullname.replace(/^\[.*?\]\s*/, "")),
        code: decodeEntities(c.shortname),
        url: c.viewurl,
        progress: c.progress ?? 0,
        isPinned: c.isfavourite,
        image: c.courseimage
    }));
}

export async function getCourseContents(courseId: number): Promise<CourseSection[]> {
    const data = await fetchMoodle<CourseSection[]>(
        "core_course_get_contents",
        { courseid: courseId }
    );

    if (!data) {
        return [];
    }

    return data;
}