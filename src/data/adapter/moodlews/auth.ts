import { SCELE_URL } from "@/src/config";

interface MoodleTokenResponse {
    token?: string;
    error?: string;
    errorcode?: string;
    stacktrace?: string;
}

export async function authenticateMoodleWS(username: string, password: string): Promise<string> {
    
    const SERVICE_NAME = "moodle_mobile_app"; 

    const url = new URL("/login/token.php", SCELE_URL);

    const payload = new URLSearchParams();
    payload.append("username", username);
    payload.append("password", password);
    payload.append("service", SERVICE_NAME);

    try {
        const response = await fetch(url.toString(), {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: payload.toString(),
        });

        if (!response.ok) {
            throw new Error(`Network error: ${response.status} ${response.statusText}`);
        }

        const data = (await response.json()) as MoodleTokenResponse;

        if (data.error) {
            console.error("Moodle WS Error:", data.errorcode, data.error);
            throw new Error(data.error);
        }

        if (!data.token) {
            throw new Error("Authentication failed: No token received from server.");
        }

        return data.token;

    } catch (error) {
        console.error("Authentication Error:", error);
        throw error;
    }
}