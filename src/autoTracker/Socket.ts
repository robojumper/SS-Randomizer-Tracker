export interface ItemCountsMessage {
    type: 'item_counts';
    counts: [
        {
            item: string;
            count: number;
        },
    ];
}

export type ServerMessage = ItemCountsMessage;

const WS_PORT = 9238;

interface Connection {
    isClosed: () => boolean;
    close: () => void;
}

export function createConnection(
    onMessage: (msg: ServerMessage) => void,
    onStateChange: (state: 'open' | 'close') => void,
): Connection {
    let closed = false;
    const socket = new WebSocket(`ws://localhost:${WS_PORT}`);

    socket.addEventListener('open', () => {
        onStateChange('open');
    });

    socket.addEventListener('close', () => {
        onStateChange('close');
    });

    socket.addEventListener('message', (ev) => {
        console.log("received message!")
        if (!closed && typeof ev.data === 'string') {
            const payload = JSON.parse(ev.data) as ServerMessage;
            onMessage(payload);
        }
    });

    return {
        isClosed: () => closed,
        close: () => {
            closed = true;
            socket.close();
        }
    }
}
