import { fetchMoodle } from "./fetch";
import { SCELE_URL } from "@/src/config";
import type { Announcement } from "@/src/types/scele";

const ANNOUNCEMENT_FORUM_ID = 1;

export async function getAnnouncements(): Promise<Announcement[]> {
    const result = await fetchMoodle<{ discussions: any[]; warnings: any[] }>(
        "mod_forum_get_forum_discussions",
        { forumid: ANNOUNCEMENT_FORUM_ID, page: 0, perpage: 10 }
    );

    if (!result?.discussions) return [];

    return result.discussions.map((d) => ({
        id: d.id,
        discussion: d.discussion,
        name: d.name,
        message: d.message ?? "",
        userid: d.userid,
        userfullname: d.userfullname ?? "",
        userpictureurl: d.userpictureurl,
        timecreated: d.timecreated ?? d.created ?? d.timemodified ?? 0,
        timemodified: d.timemodified ?? d.timecreated ?? 0,
        url: `${SCELE_URL}/mod/forum/discuss.php?d=${d.discussion}`,
        attachments: Array.isArray(d.attachments)
            ? d.attachments.map((f: any) => ({
                filename: f.filename,
                fileurl: f.fileurl,
                filesize: f.filesize,
                mimetype: f.mimetype,
            }))
            : [],
    }));
}
