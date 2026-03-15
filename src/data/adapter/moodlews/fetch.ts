import { SCELE_URL } from "@/src/config";
import { logout, tokenStorage, wsToken } from "@/src/stores/auth";

export async function fetchMoodle<T = any>(
    wsFunction: string, 
    params: Record<string, string | number | boolean> = {}
): Promise<T | undefined> {
    let token = wsToken.value;

    if (!token) {
        console.warn("Attempted API call without token.");
        await logout();
        return;
    }

    const endpoint = `${SCELE_URL}/webservice/rest/server.php`;

    const payload = new URLSearchParams();
    payload.append("wstoken", token);
    payload.append("wsfunction", wsFunction);
    payload.append("moodlewsrestformat", "json");

    Object.entries(params).forEach(([key, value]) => {
        payload.append(key, String(value));
    });

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: payload.toString(),
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const data = await response.json();

        if (data.exception || data.errorcode) {
            const isAuthError = 
                data.errorcode === "invalidtoken" || 
                data.errorcode === "accessexception" ||
                data.errorcode === "tokenexpired";

            if (isAuthError) {
                await logout();
                console.error("Session expired. Redirecting to login...");
                return; 
            }

            throw new Error(data.message || "Moodle API Error");
        }

        return data as T;

    } catch (error) {
        console.error(`fetchMoodle error [${wsFunction}]:`, error);
        throw error;
    }
}