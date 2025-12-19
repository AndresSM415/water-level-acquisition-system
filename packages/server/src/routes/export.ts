/*
 * Export route - Download sensor data as CSV.
 */
import {Hono} from "hono";
import {SSEManager} from "../services/sse-manager.ts";
import {formatTime, formatTimestamp} from "../lib"
import type {SensorService} from "../services/sensor-service.ts";
import type {ExportFormat, DecimationInterval} from "@wlas/shared";


export function createExportRoute(sensorService: SensorService, sseManager: SSEManager) {
    const app = new Hono();
    app.get("/", async (c) => {
        try {
            const clientId = c.req.query("clientId");
            const decimation = parseInt(c.req.query("decimation") || "1") as DecimationInterval;
            const offsetStartTime = parseInt(c.req.query("offsetStartTime") as string) / 1000;

            if(clientId === undefined || !sseManager.hasClient(clientId)) {
                return c.json({
                    error: "Missing or incorrect clientId",
                    code: "INVALID_PATH"
                }, 400);
            }
            if (![1, 2, 5, 10, 30, 60].includes(decimation as DecimationInterval)){
                return c.json({
                    error: "Incorrect decimation value",
                    code: "INVALID_PATH"
                }, 400);
            }

            if (offsetStartTime === undefined || offsetStartTime <= 0) {
                return c.json({
                    error: "Incorrect offset start time",
                    code: "INVALID_PATH"
                }, 400)
            }
            const endTime = Date.now() / 1000;
            const startTime = endTime - offsetStartTime

            const format = "csv" as ExportFormat;
            const limit = 3600 * 12;

            // Export data via service
            const data = await sensorService.exportData(
                startTime,
                endTime,
                decimation,
                format,
                limit
            );

            if (!data || data.length === 0) {
                return c.json({
                    error: "No data in time range",
                    code: "NO_DATA"
                }, 404);
            }

            return c.text(data, 200, {
                "Content-Type": "text/csv",
                "Content-Disposition": `attachment; filename="tanques-interconectados_${formatTimestamp(startTime)}_duracion-${formatTime(endTime-startTime)}_periodo-${decimation}s.csv"`,
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Expose-Headers": "Content-Disposition"
            });
        } catch (error) {
            console.error("export error:", error);
            return c.json({
                    error: "Export failed",
                    code: "EXPORT_ERROR",
                    details: String(error)
            }, 500);
        }
    });
    return app;
}