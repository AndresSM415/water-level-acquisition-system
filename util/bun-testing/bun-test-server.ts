/**
 * Bun Test Server for Raspberry Pi Zero 2
 * 
 * This server tests Bun's stability under conditions similar to your
 * water monitoring system. It will help you determine if Bun is reliable
 * enough for your production use case.
 * 
 * What this tests:
 * - HTTP server performance with concurrent connections
 * - SQLite database reads (simulating sensor data queries)
 * - Server-Sent Events for real-time updates
 * - Static file serving
 * - Long-running process stability
 * - Memory usage over time
 * 
 * To run: bun run bun-test-server.ts
 */

import { Database } from "bun:sqlite";
import { serve } from "bun";

// Configuration
const PORT = 3000;
const DB_FILE = "test-sensors.db";
const SAMPLE_INTERVAL = 1000; // 1 second, matching your real system

// Statistics tracking
const stats = {
  startTime: Date.now(),
  totalRequests: 0,
  activeConnections: 0,
  sseClients: 0,
  errors: 0,
  lastError: null as string | null,
};

// Initialize SQLite database with a schema similar to your sensor data
function initDatabase() {
  const db = new Database(DB_FILE);
  
  // Create a table similar to your sensor_samples table
  db.run(`
    CREATE TABLE IF NOT EXISTS sensor_readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp REAL NOT NULL,
      tank1_voltage REAL NOT NULL,
      tank2_voltage REAL NOT NULL,
      tank3_voltage REAL NOT NULL,
      flow1_lps REAL NOT NULL,
      flow2_lps REAL NOT NULL,
      hose1_duty_cycle REAL NOT NULL,
      hose2_duty_cycle REAL NOT NULL
    )
  `);
  
  // Create index on timestamp for faster queries
  db.run(`CREATE INDEX IF NOT EXISTS idx_timestamp ON sensor_readings(timestamp)`);
  
  console.log("✓ Database initialized");
  return db;
}

// Simulate inserting sensor data continuously
function startDataGenerator(db: Database) {
  setInterval(() => {
    try {
      // Generate random sensor values similar to your real data
      const stmt = db.prepare(`
        INSERT INTO sensor_readings 
        (timestamp, tank1_voltage, tank2_voltage, tank3_voltage, 
         flow1_lps, flow2_lps, hose1_duty_cycle, hose2_duty_cycle)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        Date.now() / 1000, // timestamp
        Math.random() * 5, // tank1 voltage (0-5V)
        Math.random() * 5, // tank2 voltage
        Math.random() * 5, // tank3 voltage
        Math.random() * 2, // flow1 in L/s
        Math.random() * 2, // flow2 in L/s
        Math.random() * 100, // hose1 duty cycle
        Math.random() * 100  // hose2 duty cycle
      );
    } catch (error) {
      stats.errors++;
      stats.lastError = `Data generation error: ${error}`;
      console.error("Error generating data:", error);
    }
  }, SAMPLE_INTERVAL);
  
  console.log("✓ Data generator started");
}

// Clean up old data to prevent database from growing infinitely
function startDataCleanup(db: Database) {
  setInterval(() => {
    try {
      // Keep only the last hour of data (3600 seconds)
      const cutoffTime = (Date.now() / 1000) - 3600;
      db.run("DELETE FROM sensor_readings WHERE timestamp < ?", cutoffTime);
      db.run("VACUUM"); // Optimize database
    } catch (error) {
      console.error("Error during cleanup:", error);
    }
  }, 60000); // Run every minute
  
  console.log("✓ Data cleanup scheduler started");
}

// Generate HTML for the test page
function generateTestPage(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Bun Test Server - Raspberry Pi</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .card {
      background: white;
      padding: 20px;
      margin: 20px 0;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 { color: #333; margin-top: 0; }
    h2 { color: #666; font-size: 1.2em; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
    .stat { padding: 15px; background: #f8f9fa; border-radius: 4px; }
    .stat-label { font-size: 0.85em; color: #666; margin-bottom: 5px; }
    .stat-value { font-size: 1.5em; font-weight: bold; color: #007bff; }
    .sensor-reading { margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 4px; }
    #status { padding: 10px; border-radius: 4px; margin: 10px 0; }
    .connected { background: #d4edda; color: #155724; }
    .disconnected { background: #f8d7da; color: #721c24; }
    button {
      background: #007bff;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1em;
    }
    button:hover { background: #0056b3; }
    button:disabled { background: #6c757d; cursor: not-allowed; }
  </style>
</head>
<body>
  <h1>🧪 Bun Test Server</h1>
  
  <div class="card">
    <h2>Connection Status</h2>
    <div id="status" class="disconnected">Disconnected</div>
    <button id="connectBtn">Connect to Real-Time Updates</button>
  </div>
  
  <div class="card">
    <h2>Server Statistics</h2>
    <div class="stats">
      <div class="stat">
        <div class="stat-label">Uptime</div>
        <div class="stat-value" id="uptime">-</div>
      </div>
      <div class="stat">
        <div class="stat-label">Total Requests</div>
        <div class="stat-value" id="requests">-</div>
      </div>
      <div class="stat">
        <div class="stat-label">Active Connections</div>
        <div class="stat-value" id="connections">-</div>
      </div>
      <div class="stat">
        <div class="stat-label">SSE Clients</div>
        <div class="stat-value" id="sseClients">-</div>
      </div>
      <div class="stat">
        <div class="stat-label">Errors</div>
        <div class="stat-value" id="errors">-</div>
      </div>
    </div>
  </div>
  
  <div class="card">
    <h2>Latest Sensor Reading</h2>
    <div id="sensorData">Waiting for data...</div>
  </div>
  
  <div class="card">
    <h2>Test Actions</h2>
    <button onclick="testDatabaseQuery()">Query Database (Last 100 Records)</button>
    <button onclick="testConcurrentRequests()">Test Concurrent Requests (20x)</button>
    <button onclick="downloadData()">Download CSV Data</button>
  </div>

  <script>
    let eventSource = null;
    
    // Update statistics periodically
    async function updateStats() {
      try {
        const response = await fetch('/api/stats');
        const stats = await response.json();
        
        const uptime = Math.floor((Date.now() - stats.startTime) / 1000);
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = uptime % 60;
        
        document.getElementById('uptime').textContent = 
          hours + 'h ' + minutes + 'm ' + seconds + 's';
        document.getElementById('requests').textContent = stats.totalRequests;
        document.getElementById('connections').textContent = stats.activeConnections;
        document.getElementById('sseClients').textContent = stats.sseClients;
        document.getElementById('errors').textContent = stats.errors;
      } catch (error) {
        console.error('Error updating stats:', error);
      }
    }
    
    // Connect to Server-Sent Events
    function connectSSE() {
      if (eventSource) {
        eventSource.close();
      }
      
      eventSource = new EventSource('/api/stream');
      
      eventSource.onopen = () => {
        document.getElementById('status').textContent = 'Connected';
        document.getElementById('status').className = 'connected';
        document.getElementById('connectBtn').textContent = 'Disconnect';
        document.getElementById('connectBtn').disabled = false;
      };
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        displaySensorData(data);
      };
      
      eventSource.onerror = () => {
        document.getElementById('status').textContent = 'Connection Lost';
        document.getElementById('status').className = 'disconnected';
        document.getElementById('connectBtn').textContent = 'Reconnect';
      };
    }
    
    function displaySensorData(data) {
      const html = \`
        <div class="sensor-reading">
          <strong>Timestamp:</strong> \${new Date(data.timestamp * 1000).toLocaleString()}<br>
          <strong>Tank 1:</strong> \${data.tank1_voltage.toFixed(2)}V | 
          <strong>Tank 2:</strong> \${data.tank2_voltage.toFixed(2)}V | 
          <strong>Tank 3:</strong> \${data.tank3_voltage.toFixed(2)}V<br>
          <strong>Flow 1:</strong> \${data.flow1_lps.toFixed(3)} L/s | 
          <strong>Flow 2:</strong> \${data.flow2_lps.toFixed(3)} L/s<br>
          <strong>Hose 1:</strong> \${data.hose1_duty_cycle.toFixed(1)}% | 
          <strong>Hose 2:</strong> \${data.hose2_duty_cycle.toFixed(1)}%
        </div>
      \`;
      document.getElementById('sensorData').innerHTML = html;
    }
    
    document.getElementById('connectBtn').addEventListener('click', () => {
      if (eventSource && eventSource.readyState === EventSource.OPEN) {
        eventSource.close();
        document.getElementById('status').textContent = 'Disconnected';
        document.getElementById('status').className = 'disconnected';
        document.getElementById('connectBtn').textContent = 'Connect to Real-Time Updates';
      } else {
        connectSSE();
      }
    });
    
    async function testDatabaseQuery() {
      const start = Date.now();
      try {
        const response = await fetch('/api/readings?limit=100');
        const data = await response.json();
        const duration = Date.now() - start;
        alert(\`Query returned \${data.length} records in \${duration}ms\`);
      } catch (error) {
        alert('Query failed: ' + error.message);
      }
    }
    
    async function testConcurrentRequests() {
      const start = Date.now();
      const promises = Array(20).fill(null).map(() => 
        fetch('/api/stats').then(r => r.json())
      );
      try {
        await Promise.all(promises);
        const duration = Date.now() - start;
        alert(\`20 concurrent requests completed in \${duration}ms\`);
      } catch (error) {
        alert('Concurrent test failed: ' + error.message);
      }
    }
    
    function downloadData() {
      window.location.href = '/api/download';
    }
    
    // Update stats every 2 seconds
    setInterval(updateStats, 2000);
    updateStats();
  </script>
</body>
</html>`;
}

// Main server
function startServer() {
  const db = initDatabase();
  
  // Start background tasks
  startDataGenerator(db);
  startDataCleanup(db);
  
  // Track SSE clients
  const sseClients = new Set<ReadableStreamDefaultController>();
  
  const server = serve({
    port: PORT,
    
    async fetch(req) {
      stats.totalRequests++;
      stats.activeConnections++;
      
      try {
        const url = new URL(req.url);
        
        // Route: Home page
        if (url.pathname === "/" || url.pathname === "/index.html") {
          return new Response(generateTestPage(), {
            headers: { "Content-Type": "text/html" },
          });
        }
        
        // Route: Server statistics
        if (url.pathname === "/api/stats") {
          return Response.json({
            ...stats,
            sseClients: sseClients.size,
          });
        }
        
        // Route: Query sensor readings
        if (url.pathname === "/api/readings") {
          const limit = parseInt(url.searchParams.get("limit") || "100");
          const stmt = db.prepare(`
            SELECT * FROM sensor_readings 
            ORDER BY timestamp DESC 
            LIMIT ?
          `);
          const readings = stmt.all(limit);
          return Response.json(readings);
        }
        
        // Route: Download CSV
        if (url.pathname === "/api/download") {
          const readings = db.prepare(`
            SELECT * FROM sensor_readings 
            ORDER BY timestamp DESC 
            LIMIT 1000
          `).all();
          
          const csv = [
            "timestamp,tank1_voltage,tank2_voltage,tank3_voltage,flow1_lps,flow2_lps,hose1_duty_cycle,hose2_duty_cycle",
            ...readings.map((r: any) => 
              `${r.timestamp},${r.tank1_voltage},${r.tank2_voltage},${r.tank3_voltage},${r.flow1_lps},${r.flow2_lps},${r.hose1_duty_cycle},${r.hose2_duty_cycle}`
            )
          ].join("\n");
          
          return new Response(csv, {
            headers: {
              "Content-Type": "text/csv",
              "Content-Disposition": "attachment; filename=sensor-data.csv",
            },
          });
        }
        
        // Route: Server-Sent Events stream
        if (url.pathname === "/api/stream") {
          const stream = new ReadableStream({
            start(controller) {
              sseClients.add(controller);
              stats.sseClients = sseClients.size;
              
              // Send initial connection message
              controller.enqueue(`data: ${JSON.stringify({ type: "connected" })}\n\n`);
              
              // Send updates every second
              const interval = setInterval(() => {
                try {
                  const latest = db.prepare(
                    "SELECT * FROM sensor_readings ORDER BY timestamp DESC LIMIT 1"
                  ).get();
                  
                  if (latest) {
                    controller.enqueue(`data: ${JSON.stringify(latest)}\n\n`);
                  }
                } catch (error) {
                  clearInterval(interval);
                  controller.close();
                  sseClients.delete(controller);
                  stats.sseClients = sseClients.size;
                }
              }, 1000);
              
              // Cleanup on close
              return () => {
                clearInterval(interval);
                sseClients.delete(controller);
                stats.sseClients = sseClients.size;
              };
            },
          });
          
          return new Response(stream, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              "Connection": "keep-alive",
            },
          });
        }
        
        // 404 for unknown routes
        return new Response("Not Found", { status: 404 });
        
      } catch (error) {
        stats.errors++;
        stats.lastError = String(error);
        console.error("Request error:", error);
        return new Response("Internal Server Error", { status: 500 });
      } finally {
        stats.activeConnections--;
      }
    },
  });
  
  console.log("\n" + "=".repeat(60));
  console.log("🚀 Bun Test Server Started Successfully");
  console.log("=".repeat(60));
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`📊 Database: ${DB_FILE}`);
  console.log(`⏱️  Sample Interval: ${SAMPLE_INTERVAL}ms`);
  console.log("=".repeat(60));
  console.log("\nTest your system by:");
  console.log("1. Opening the web interface in a browser");
  console.log("2. Connecting to real-time updates (SSE)");
  console.log("3. Running the concurrent request test");
  console.log("4. Leaving it running for 24-48 hours");
  console.log("\nWatch for:");
  console.log("- Memory usage growth (use 'top' or 'htop')");
  console.log("- Any crashes or restarts");
  console.log("- Error count in the statistics");
  console.log("- Connection stability\n");
}

// Start the server
startServer();
