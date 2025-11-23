/**
 * Stats route - Server statistics and health monitoring.
 */
import { Hono } from 'hono';
import type {SSEManager} from "../services/sse-manager.ts";
import type {SensorService} from "../services/sensor-service.ts";
import {ENV} from "../lib";

interface ServerStats {
    uptime: number;
    clients: {
        active: number;
        max: number;
        atCapacity: boolean;
    };
    database: {
        recentSamples: number;
    };
    timestamp: number;
}

const startTime = Date.now();

export function createStatsRoute(
    sseManager: SSEManager,
    sensorService: SensorService
) {
    const app = new Hono();

    app.get("/", async (c) => {
        try {
            const now = Date.now() / 1000;
            const fiveMinutesAgo = now - 5*60;
            const recentCount = await sensorService.getReadingCount(now, fiveMinutesAgo);

            const stats: ServerStats = {
                uptime: Math.floor((Date.now() - startTime) / 1000),
                clients: {
                    active: sseManager.getClientCount(),
                    max: ENV.MAX_SSE_CLIENTS,
                    atCapacity: sseManager.isFull()
                },
                database: {
                    recentSamples: recentCount
                },
                timestamp: now,
            };

            return c.json(stats);
        } catch (error) {
            console.error("Stats error:", error);
            return c.json(
                { error: "Failed to get stats", code: "STATS_ERROR" },
                500
            );
        }
    });
    return app;
}