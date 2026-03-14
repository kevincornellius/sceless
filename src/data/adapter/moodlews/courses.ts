import { Course } from "@/src/types/course";
import { fetchMoodle } from "./fetch";

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
        title: c.fullname.replace(/^\[.*?\]\s*/, ""),
        code: c.shortname,
        url: c.viewurl,
        progress: c.progress ?? 0,
        isPinned: c.isfavourite,
        image: c.courseimage
    }));
}