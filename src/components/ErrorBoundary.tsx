import React from "react";
import ErrorPage, { getErrorStatus } from "@/pages/errors/ErrorPage";
import { isChunkLoadError, reloadForChunkError } from "@/lib/chunk-reload";

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: unknown;
}

export default class ErrorBoundary extends React.Component<
    ErrorBoundaryProps,
    ErrorBoundaryState
> {
    state: ErrorBoundaryState = {
        hasError: false,
        error: null,
    };

    static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
        return {
            hasError: true,
            error,
        };
    }

    componentDidCatch(error: unknown, info: React.ErrorInfo) {
        if (isChunkLoadError(error) && reloadForChunkError(error)) return;
        console.error("Application error boundary caught:", error, info);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <ErrorPage
                    statusCode={getErrorStatus(this.state.error) || 500}
                    error={this.state.error}
                />
            );
        }

        return this.props.children;
    }
}
