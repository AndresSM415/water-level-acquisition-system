/**
 * Fake Sampler - Writes fake sensor data to the database (DB_FILE) for testing purposes.
 */
import {Database} from "bun:sqlite";
import { join } from "path";


// Configuration
const DB_FILE = (process.env.DB_PATH && process.env.DB_FILE) ?
    join(process.env.DB_PATH, process.env.DB_FILE) : 'plant.db'
const SAMPLE_INTERVAL = parseInt(process.env.SAMPLE_INTERVAL || "1") * 1000;
const TABLE = process.env.SAMPLE_TABLE || "sensor_samples"

console.log("Dummy Sampler Starting...");
console.log(`Database: ${DB_FILE}`);
console.log(`Sample interval: ${SAMPLE_INTERVAL}ms\n`);


const db = new Database(DB_FILE);

// Enable WAL mode for concurrent reads/writes
db.run("PRAGMA journal_mode = WAL");
db.run("PRAGMA busy_timeout = 5000")
db.run("PRAGMA synchronous = OFF")
db.run("PRAGMA cache_size = -2000000")
db.run("PRAGMA temp_store = memory")

// Create table if not exists
db.run(`
    CREATE TABLE IF NOT EXISTS ${TABLE} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp REAL NOT NULL,
        tank1_voltage REAL NOT NULL,
        tank2_voltage REAL NOT NULL,
        tank3_voltage REAL NOT NULL,
        flow1_lps REAL NOT NULL,
        flow1_pulses REAL NOT NULL,
        flow2_lps REAL NOT NULL,
        flow2_pulses REAL NOT NULL,
        hose1_duty_cycle REAL NOT NULL,
        hose2_duty_cycle REAL NOT NULL
    )
`);

db.run(`CREATE INDEX IF NOT EXISTS idx_timestamp ON ${TABLE}(timestamp)`)

// Insert statement
const insertStmt = db.prepare(`
    INSERT INTO ${TABLE}
    (timestamp, tank1_voltage, tank2_voltage, tank3_voltage,
     flow1_lps, flow1_pulses, flow2_lps, flow2_pulses,
     hose1_duty_cycle, hose2_duty_cycle)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

// Generate random sensor data
function generateSample() {
    return {
        timestamp: Date.now() / 1000,
        tank1_voltage: Math.random() * 5,
        tank2_voltage: Math.random() * 5,
        tank3_voltage: Math.random() * 5,
        flow1_lps: Math.random() * 2,
        flow1_pulses: Math.floor(Math.random() * 1000),
        flow2_lps: Math.random() * 2,
        flow2_pulses: Math.floor(Math.random() * 1000),
        hose1_duty_cycle: Math.random() * 100,
        hose2_duty_cycle: Math.random() * 100,
    };
}

// Start sampling
const interval = setInterval(() => {
    try {
        const sample = generateSample();

        insertStmt.run(
            sample.timestamp,
            sample.tank1_voltage,
            sample.tank2_voltage,
            sample.tank3_voltage,
            sample.flow1_lps,
            sample.flow1_pulses,
            sample.flow2_lps,
            sample.flow2_pulses,
            sample.hose1_duty_cycle,
            sample.hose2_duty_cycle
        );
    } catch (e) {
        console.error("Error writing sample", e)
    }
}, SAMPLE_INTERVAL);

// Cleanup on exit
process.on("SIGINT", () => {
    console.log("Stopping sampler...")
    clearInterval(interval);
    db.close();
    process.exit(0)
})