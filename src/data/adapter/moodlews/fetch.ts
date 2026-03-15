import { SCELE_URL } from "@/src/config";
import { logout, tokenStorage, wsToken } from "@/src/stores/auth";

class RequestQueue {
    private activeCount = 0;
    private queue: (() => void)[] = [];

    constructor(
        private maxConcurrent: number, 
        private delayMs: number = 0
    ) {}

    async add<T>(taskFn: () => Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            const runner = async () => {
                this.activeCount++;
                try {
                    const result = await taskFn();
                    resolve(result);
                } catch (error) {
                    reject(error);
                } finally {
                    this.activeCount--;
                    if (this.queue.length > 0) {
                        if (this.delayMs > 0) {
                            setTimeout(() => this.next(), this.delayMs);
                        } else {
                            this.next();
                        }
                    }
                }
            };

            this.queue.push(runner);
            this.next();
        });
    }

    private next() {
        if (this.activeCount < this.maxConcurrent && this.queue.length > 0) {
            const nextTask = this.queue.shift();
            if (nextTask) nextTask();
        }
    }
}

const apiQueue = new RequestQueue(5, 50); 

export async function fetchMoodle<T = any>(
    wsFunction: string, 
    params: Record<string, string | number | boolean> = {}
): Promise<T | undefined> {
    
    return apiQueue.add(async () => {
        let token = wsToken.value;

        if (!token) {
            console.warn("Attempted API call without token.");
            await logout();
            return undefined;
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
                if (response.status === 429) {
                    throw new Error("HTTP 429: Rate limit exceeded by server.");
                }
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
                    return undefined; 
                }

                throw new Error(data.message || "Moodle API Error");
            }

            return data as T;

        } catch (error) {
            console.error(`fetchMoodle error [${wsFunction}]:`, error);
            throw error;
        }
    });
}