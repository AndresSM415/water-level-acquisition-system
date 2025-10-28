/**
 * Stream route - Server-Sent Events for real-time sensor updates.
 * 1. Client connects → GET /stream
 * 2. Generate clientId
 * 3. Create controller with override
 * 4. stream.write("connected") → Client receives
 * 5. Add to SSEManager (stores controller)
 * 6. setInterval starts (every 1s):
 *    ├─ Get latest sensor data
 *    ├─ sseManager.sendToClient(clientId, message)
 *    │  └─ controller.enqueue(data)
 *    │     └─ [override] stream.write(data) → Client receives
 *    └─ Repeat...
 * 7. Client disconnects → stream.onAbort()
 *    ├─ clearInterval()
 *    └─ sseManager.removeClient(clientId)
 */
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import type { SSEManager } from "../services/sse-manager.ts";
import {SensorService} from "../services/sensor-service.ts";
import type {SSEMessage} from "@wlas/shared";

export function createStreamRoute(
    sseManager: SSEManager,
    sensorService: SensorService
) {
    const app = new Hono();

    app.get("/", (c) => {
        if (sseManager.isFull()) {
            return c.json(
                { error: "Server at capacity", code: "MAX_CLIENTS_REACHED"},
                503
            );
        }

        return streamSSE(c, async (stream) => {
            const clientId = crypto.randomUUID();
            let interval: Timer | null = null;

            // Register client with SSEManager
            const added = sseManager.addClient(clientId, stream);
            if (!added) {
                await stream.writeSSE({
                    data: JSON.stringify({
                        type: "error",
                        message: "Failed to connect - server at capacity",
                        timestamp: Date.now() / 1000,
                    } as SSEMessage)
                });
                return;
            }

            // Send connected message
            await stream.writeSSE({
                data: JSON.stringify({
                    type: "connected",
                    message: `Connected as ${clientId}`,
                    timestamp: Date.now() / 1000
                } as SSEMessage)
            });

            // Start sending updates every 1 second
            interval = setInterval(async () => {
                try {
                    const sample = await sensorService.getLatestSample();
                    if (sample) {
                        const reading = sensorService.sampleToDashboard(sample);
                        const message: SSEMessage = {
                            type: "reading",
                            reading,
                            timestamp: sample.timestamp,
                        };
                        await stream.writeSSE({data: JSON.stringify(message)});
                    }
                } catch (error) {
                    console.error("Error fetching reading:", error);
                    const errorMessage: SSEMessage = {
                        type: "error",
                        message: "Failed to fetch sensor data",
                        timestamp: Date.now() / 1000,
                    };
                    await stream.writeSSE({ data: JSON.stringify(errorMessage)});
                }
            }, 1000);

            stream.onAbort(() => {
                if (interval) clearInterval(interval);
                sseManager.removeClient(clientId)
                console.log(`Client ${clientId} disconnected.`);
            });

            // Keep the stream open
            await new Promise<void>(()=>{})
        });
    });
    return app;
}