import { Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { ExportButton } from './ImportExport';
import DiscordButton from './additionalComponents/DiscordButton';

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
            <p>We would appreciate a bug report with an attached tracker export and a screenshot of the browser console (<code>Ctrl+Shift+I</code>)</p>
            <p><DiscordButton /></p>
            <div style={{ display: 'flex', gap: 4 }}>
                <ExportButton />
                <Link to="/">
                    <Button>Return to Options</Button>
                </Link>
            </div>
            <p>If the error persists, you may try clearing all cookies and site data. <strong>This will reset the tracker and revert all customization.</strong></p>
        </div>
    );
}
