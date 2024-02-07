/**
 * setTimeout as a Promise.
 */
export function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
