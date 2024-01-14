import { Link } from 'react-router-dom';

export default function ErrorPage({
    error,
}: {
    error: any;
    resetErrorBoundary: () => void;
}) {
    const errorMsg =
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        'message' in error ? (error.message as string) : JSON.stringify(error);
    return (
        <div>
            <p>Something went wrong. Try reloading the page, reset the tracker, or load a different logic version:</p>
            <pre style={{ color: 'red' }}>{errorMsg}</pre>
            <Link
                className={`btn btn-primary`}
                to="/"
            >
                Return to Options
            </Link>
        </div>
    );
}
