import { isRouteErrorResponse, useRouteError } from "react-router-dom";
import ErrorPage from "@/pages/errors/ErrorPage";

export default function RouteErrorBoundary() {
    const error = useRouteError();

    if (isRouteErrorResponse(error)) {
        return (
            <ErrorPage
                statusCode={error.status}
                title={error.statusText}
                description={error.data?.message || error.data || undefined}
                error={error}
            />
        );
    }

    return <ErrorPage statusCode={500} error={error} />;
}
