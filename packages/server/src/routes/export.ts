/*
 * Export route - Download sensor data as CSV.
 */
import {Hono} from "hono";
import type {SensorService} from "../services/sensor-service.ts";
import type {ExportFormat, DecimationInterval} from "@wlas/shared";

export function createExportRoute(sensorService: SensorService) {
    const app = new Hono();
    app.get("/", async (c) => {
        try {
            const startTime = parseFloat(c.req.query("startTime") || "0");
            const endTime = parseFloat(String(Date.now() / 1000));
            const format = "csv" as ExportFormat;
            const decimation = parseInt(c.req.query("decimation") || "1") as DecimationInterval;
            const limit = parseInt(c.req.query("limit") || "3600");

            // Validate parameters
            if (isNaN(startTime) || startTime <= 0) {
                return c.json({ error: "Invalid startTime", code: "INVALID_PARAM"}, 400);
            }

            if (isNaN(endTime) || startTime >= endTime) {
                return c.json({ error: "Invalid endTime", code: "INVALID_PARAM"}, 400);
            }

            if (!["csv"].includes(format)) {
                return c.json({ error: "Invalid format (csv)", code: "INVALID_PARAM"}, 400);
            }

            if (![1, 2, 5, 10, 30, 60].includes(decimation)) {
                return c.json({ error: "Invalid startTime", code: "INVALID_PARAM"}, 400);
            }

            // Export data via service
            const data = await sensorService.exportData(
                startTime,
                endTime,
                decimation,
                format,
                limit
            );

            if (!data || data.length === 0) {
                return c.json({error: "No data in time range", code: "NO_DATA"}, 404);
            }

            return c.text(data, 200, {
                "Content-Type": "text/csv",
                "Content-Disposition": `attachment; filename="sensor-data-${startTime}-to-${endTime}.csv"`,
            });
        } catch (error) {
            console.error("export error:", error);
            return c.json(
                {error: "Export failed", code: "EXPORT_ERROR", details: String(error)},
                500
            );
        }
    });
    return app;
}