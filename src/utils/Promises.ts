/**
 * setTimeout as a Promise.
 */
export function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Returns an async function a single worker can call repeatedly to yield control back to the event loop if needed.
 * If you regularly call this function, you'll yield approximately every `deadline` milliseconds.
 */
export function createDeadlineKeeper(deadline: number) {
    let last: number | undefined;
    return async () => {
        if (!last) {
            last = performance.now();
        } else if (performance.now() - last > deadline) {
            // Yield to the event loop to give UI a chance to draw
            console.log('sleeping');
            await delay(0);
            last = performance.now();
        }
    };
}