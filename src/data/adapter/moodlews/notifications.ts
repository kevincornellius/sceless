import { fetchMoodle } from "./fetch";
import { AppNotification } from "../../../types/scele";
import { logout } from "@/src/stores/auth";

export interface MoodleNotification {
    id: number;
    subject: string;
    contexturl: string;
    timecreated: number;
    timeread: number | null;
    component: string; 
    customdata: string;
}

interface NotificationsResponse {
    messages: MoodleNotification[];
}


export async function getNotifications(): Promise<AppNotification[]> {

    const { getUserId } = await import("../../../stores/indexeddb/siteinfo");
    const userId = await getUserId();

    if (!userId) {
        console.warn("No user ID found, cannot fetch notifications");
        logout();
        return [];
    }

    const data = await fetchMoodle<NotificationsResponse>(
        "core_message_get_messages",
        { 
            useridto: userId ,
            limitnum: 20,
        }
    );

    console.log("Fetched notifications data:", data);

    if (!data || !data.messages) {
        return [];
    }

    console.log("Raw notifications data:", data.messages);

    return data.messages.map(n => {
        let courseId: number | undefined;
        try {
            const custom = JSON.parse(n.customdata);
            courseId = custom.courseid ? Number(custom.courseid) : undefined;
        } catch (e) {
            courseId = undefined;
        }

        return {
            id: n.id,
            title: n.subject,
            url: n.contexturl,
            timestamp: n.timecreated,
            isRead: n.timeread !== null, 
            module: n.component,
            courseId: courseId
        };
    });
}