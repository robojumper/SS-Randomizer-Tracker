export default function ExtraLocationHeader( { title, icon }:  { title: string, icon: string }) {
    return (
        <div style={{ width: '100%', borderBottom: '1px solid var(--scheme-text)' }}>
            {icon} {title}
        </div>
    );
}