import {connectionState, lastReadingTime, connectionDate, clientId} from "@/stores/connection";
import { addReading } from "@/stores/readings";
import type { DashboardReading } from "@wlas/shared";

let eventSource: EventSource | null = null;
let reconnectAttempts: 0;
const MAX_RECONNECT_ATTEMPTS = 120;
const RECONNECT_DELAY_MS = 5000;

export function connectToSSE(apiUrl: string): void {
    if (eventSource) {
        console.warn('SSE already connected');
        return;
    }

    console.log(`[SEE] Connecting to ${apiUrl}/api/stream`);
    connectionState.set('connecting')

    eventSource = new EventSource(`${apiUrl}/api/stream`);

    eventSource.onopen = () => {
        console.log('[SEE] Connecting');
    };

    eventSource.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);

            if (message.type === 'connected') {
                clientId.set(message.clientId);
                connectionDate.set(Date.now());
                reconnectAttempts = 0;
                connectionState.set("connected");
                console.log('[SSE] Server confirmed connection');
            } else if (message.type === 'reading') {
                const reading: DashboardReading = message.reading;
                lastReadingTime.set(Date.now());
                addReading(reading);
            } else if (message.type === 'error') {
                console.error('[SSE] Server error:', message.message);
                connectionState.set('error');
            }
        } catch (error) {
            console.error('[SSE] Failed to parse message:', event.data, error);
        }
    };

    eventSource.onerror = () => {
        console.warn('[SSE] Connection lost');
        connectionState.set('disconnected');

        if (eventSource) {
            eventSource.close();
            eventSource = null;
        }

        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts++;
            console.log(
                `[SSE] Reconnecting in ${RECONNECT_DELAY_MS}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`
            );

            setTimeout(() => {
                connectToSSE(apiUrl);
            }, RECONNECT_DELAY_MS);
        } else {
            console.error('[SSE] Max reconnection attempts reached');
            connectionState.set('error');
        }
    };
}

export function disconnectSSE(): void {
    if (eventSource) {
        console.log('[SSE] Disconnecting');
        eventSource.close();
        eventSource = null;
        connectionState.set("disconnected");
    }
}

export function isSSEConnected(): boolean {
    return eventSource !== null && eventSource.readyState === EventSource.OPEN;
}

export function forceReconnect(apiUrl: string): void {
    console.log('[SSE] Force reconnect requested');
    disconnectSSE();
    reconnectAttempts = 0;
    setTimeout(() => {
        connectToSSE(apiUrl);
    }, 500);
}