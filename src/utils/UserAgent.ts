export function isOutdatedObs() {
    return (
        navigator.userAgent &&
        navigator.userAgent.includes('Chrome/103.') &&
        navigator.userAgent.includes('OBS/')
    );
}
