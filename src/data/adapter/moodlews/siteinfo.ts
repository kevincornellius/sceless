import { fetchMoodle } from "./fetch";
import type { Profile } from "@/src/types/profile";

interface MoodleSiteInfo {
    sitename: string;
    username: string;
    firstname: string;
    lastname: string;
    fullname: string;
    userid: number;
    siteurl: string;
    userpictureurl: string;
    functions: Array<{ name: string; version: string }>;
    release: string;
    version: string;
}

export async function getSiteInfo(): Promise<Profile | undefined> {
    const data = await fetchMoodle<MoodleSiteInfo>("core_webservice_get_site_info", {});
    
    if (!data) return undefined;

    return {
        id: data.userid,
        username: data.username,
        name: data.fullname,
        pictureurl: data.userpictureurl,
    };
}
