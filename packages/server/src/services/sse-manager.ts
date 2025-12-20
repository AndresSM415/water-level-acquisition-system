/**
 * Server-Sent Events (SSE) client manager. Tracks connected clients and broadcast real-time sensor updates.
 */
/**
 * Server-Sent Events (SSE) client manager. Tracks connected clients and broadcast real-time sensor updates.
 */
import type {SSEMessage} from "@wlas/shared";

// Simplified type for Hono SSE stream
interface SSEStream {
    writeSSE: (message: { data: string }) => Promise<void>;
}

interface ClientSession {
    stream: SSEStream;
    timeOffsetSec: number;
}

class SSEManager {
    private clients = new Map<string, ClientSession>();
    private readonly maxClients: number;

    constructor(maxClients: number = 60) {
        this.maxClients = maxClients;
    }

    /**
     * Add a new SSE client connection. Returns false if max clients reached.
     */
    addClient(clientId: string, stream: SSEStream, clientTime: number): boolean {
        if (this.isFull())
            return false;
        this.clients.set(clientId, {
            stream,
            timeOffsetSec:  (Date.now() - clientTime)/1000
        } as ClientSession);
        return true;
    }

    /**
     * Remove a client connection.
     */
    removeClient(clientId: string): void {
        this.clients.delete(clientId)
    }

    /**
     * Get the current number of connected clients.
     */
    getClientCount(): number {
        return this.clients.size;
    }

    /**
     * Check if at capacity.
     */
    isFull(): boolean {
        return this.getClientCount() >= this.maxClients;
    }

    /**
     * Get client time offset in seconds. (Server time - Client time)
     */
    getOffsetTime(clientId: string): number | null {
        return this.clients.get(clientId)?.timeOffsetSec ?? null;
    }

    /**
     * Check if client exists.
     */
    hasClient(clientId: string): boolean {
        return this.clients.has(clientId)
    }

    /**
     * Broadcast a message to all connected clients.
     */
    async broadcast(message: SSEMessage): Promise<void> {
        const data = JSON.stringify(message);
        const deadClients: string[] = [];

        for (const [clientId, session] of this.clients.entries())
            try {
                await session.stream.writeSSE({ data })
            } catch (error) {
                deadClients.push(clientId);
            }
        // Clean up dead connections
        for (const clientId of deadClients)
            this.removeClient(clientId)
    }
}

export default SSEManager
