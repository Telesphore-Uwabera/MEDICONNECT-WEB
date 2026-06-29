import ErrorPage from "@/pages/errors/ErrorPage";

export default function NotFound() {
    return <ErrorPage statusCode={404} />;
}
