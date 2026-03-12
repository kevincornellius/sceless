import { useState } from "preact/hooks";
import { Logo } from "@/src/components/ui/Logo";
import { authenticateMoodleWS } from "../data/adapter/moodlews/auth";
import { saveToken } from "../stores/auth";

export function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: Event) => {
        e.preventDefault(); 
        setError(null);
        setIsLoading(true);

        try {
            console.log("Submitting:", { username});
			const token = await authenticateMoodleWS(username, password);
            await saveToken(token);
            
            
        } catch (err) {
            setError("Invalid username or password. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div class="min-h-screen flex items-center justify-center bg-page">
            <div class="w-full max-w-sm px-6 py-10 bg-panel rounded-2xl shadow-sm border border-edge">
                <div class="flex justify-center mb-6">
                    <Logo class="text-content w-32 shrink-0" />
                </div>
                <h1 class="text-xl font-semibold text-content text-center mb-2">
                    Welcome Back
                </h1>
                <p class="text-sm text-content-secondary text-center mb-6">
                    Log in with your SCELE credentials to continue.
                </p>

                {error && (
                    <div class="mb-4 p-3 bg-danger/10 text-danger text-sm rounded-lg border border-danger/20 text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} class="flex flex-col gap-4">
                    <div class="flex flex-col gap-1.5">
                        <label 
                            htmlFor="username" 
                            class="text-sm font-medium text-content"
                        >
                            Username
                        </label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onInput={(e) => setUsername((e.currentTarget as HTMLInputElement).value)}
                            class="px-3 py-2 bg-page border border-edge rounded-lg text-content focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                            required
                            disabled={isLoading}
                            placeholder="e.g. npm.mahasiswa"
                        />
                    </div>

                    <div class="flex flex-col gap-1.5">
                        <label 
                            htmlFor="password" 
                            class="text-sm font-medium text-content"
                        >
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onInput={(e) => setPassword((e.currentTarget as HTMLInputElement).value)}
                            class="px-3 py-2 bg-page border border-edge rounded-lg text-content focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                            required
                            disabled={isLoading}
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        class="mt-2 w-full py-2.5 bg-primary hover:bg-primary/20 cursor-pointer text-content text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {isLoading ? "Authenticating..." : "Log In"}
                    </button>
                </form>
            </div>
        </div>
    );
}