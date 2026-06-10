import { Component } from "preact";
import type { ComponentChildren } from "preact";

interface Props {
    children: ComponentChildren;
}

interface State {
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    state: State = { error: null };

    static getDerivedStateFromError(error: Error): State {
        return { error };
    }

    componentDidCatch(error: Error, info: { componentStack: string }) {
        console.error("[Sceless] Render error caught by boundary:", error, info.componentStack);
    }

    render() {
        if (this.state.error) {
            return (
                <div class="min-h-screen bg-page flex items-center justify-center">
                    <div class="max-w-md text-center p-8">
                        <div class="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center mx-auto mb-4">
                            <span class="text-danger text-2xl font-bold">!</span>
                        </div>
                        <h1 class="text-xl font-bold text-content mb-2">Something went wrong</h1>
                        <p class="text-content-muted text-sm mb-1">Sceless encountered an unexpected error.</p>
                        <p class="text-xs text-content-muted font-mono bg-page-secondary border border-edge rounded px-3 py-2 mt-3 mb-6 text-left break-all">
                            {this.state.error.message}
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            class="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                        >
                            Reload page
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
