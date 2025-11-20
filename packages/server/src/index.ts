/**
 * Main server entry point. Bun + Hono server for the water monitoring system.
 */
import {Hono} from "hono";
import {cors} from "hono/cors";
import {logger} from "hono/logger";
import {serveStatic} from "hono/bun";
import fs from "node:fs";

// Services and repositories
import {SSEManager} from "./services/sse-manager.ts";
import {SensorRepository} from "./repositories/sensor-repository.ts";
import {SensorService} from "./services/sensor-service.ts";

// Routes
import {createStreamRoute} from "./routes/stream.ts";
import {createExportRoute} from "./routes/export.ts";
import {createStatsRoute} from "./routes/stats.ts";


// Configuration
import {ENV} from "./lib";
import {join} from "path";
import * as path from "node:path";

// MIME type helper
const getMimeType = (filePath: string): string => {
    if (filePath.endsWith('.js')) return 'application/javascript';
    if (filePath.endsWith('.css')) return 'text/css';
    if (filePath.endsWith('.json')) return 'application/json';
    if (filePath.endsWith('.html')) return 'text/html';
    if (filePath.endsWith('.svg')) return 'image/svg+xml';
    if (filePath.endsWith('.png')) return 'image/png';
    if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) return 'image/jpeg';
    if (filePath.endsWith('.gif')) return 'image/gif';
    if (filePath.endsWith('.woff2')) return 'font/woff2';
    return 'application/octet-stream';
};

// Initialize dependencies
const sensorRepository = new SensorRepository();
const sensorService = new SensorService(sensorRepository);
const sseManager = new SSEManager(ENV.MAX_SSE_CLIENTS);

// Create Hono app
const app = new Hono()

// Middleware
app.use("*", logger());
app.use(
    "*",
    cors({
        origin: "*",
        allowMethods: ["GET", "OPTIONS"],
        allowHeaders: ["Content-Type"]
    })
);

// Health check
app.get("/info", (c) => {
    return c.json({
        service: "Water Level Acquisition System",
        version: "0.0.1",
        status: "running",
        endpoints: {
            stream: "/api/stream",
            export: "/api/export",
            stats: "/api/stats",
        }
    });
});

// Mount routes with dependencies
app.route("/api/stream", createStreamRoute(sseManager, sensorService));
app.route("/api/export", createExportRoute(sensorService, sseManager))
app.route("/api/stats", createStatsRoute(sseManager, sensorService));

// Explicit routes for common assets
app.get('/assets/:filename', async (c) => {
    const filename = c.req.param('filename');
    const filePath = join(ENV.FRONTEND_PATH, 'assets', filename);

    try {
        const file = Bun.file(filePath);
        const mimeType = getMimeType(filePath);
        return c.body(await file.text(), 200, {
            'Content-Type': mimeType,
        });
    } catch (error) {
        return c.notFound();
    }
})

// Serve frontend static files
app.use('/', async (c, next) => {
    // Skip API routs
    if (c.req.path.startsWith('/api') || c.req.path.startsWith('/info')) {
        return next();
    }

    const filePath = join(ENV.FRONTEND_PATH, c.req.path);

    try {
        const file = Bun.file(filePath);
        if (await file.exists()) {
            const mimeType = getMimeType(filePath);
            return c.body(await file.text(), 200, {
                'Content-type': mimeType
            });
        }
    } catch (error) {

    }

    // SPA fallback - serve index.html for all unmatched routes
    try {
        const indexPath = join(ENV.FRONTEND_PATH, 'index.html');
        const content = await Bun.file(indexPath).text();
        return c.html(content);
    } catch (error) {
        return c.text('index.html not found', 500)
    }
})

// 404 handler
app.notFound((c) => {
    return c.json({error: "Not Found", code: "NOT_FOUND"}, 404);
});

// Error handler
app.onError((err, c) => {
    console.error("Server error:", err);
    return c.json({
        error: "Internal Server Error",
        code: "SERVER_ERROR",
        details: err.message,
    }, 500);
});

// Start server
console.log("\n" + "=".repeat(60));
console.log("Water Level Acquisition System Server Starting...");
console.log("\n" + "=".repeat(60));

const server = Bun.serve({
    fetch: app.fetch,
    port: ENV.PORT,
    hostname: ENV.HOST,
    // tls: {
    //     key: fs.readFileSync(ENV.PEM_KEY),
    //     cert: fs.readFileSync(ENV.PEM_CERT)
    // },
    idleTimeout: 0
});

console.log(`✓ Server running at http://${ENV.HOST}:${ENV.PORT}`);
console.log(`✓ Max SSE clients: ${ENV.MAX_SSE_CLIENTS}`);
console.log(`✓ Database: ${ENV.DATABASE_PATH}`);
console.log("=".repeat(60));
console.log("\nAPI Endpoints:");
console.log(`  GET  /api/stream  - Real-time SSE updates (1 sec interval)`);
console.log(`  GET  /api/export  - Download data (CSV/JSON)`);
console.log(`  GET  /api/stats   - Server statistics`);
console.log("=".repeat(60) + "\n");

// Graceful shutdown
process.on("SIGINT", () => {
    console.log("\n\n Shutting down server...")
    server.stop();
    process.exit(0)
});