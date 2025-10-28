/**
 * Database connection and query utilities.
 */
import {drizzle} from "drizzle-orm/bun-sqlite";
import {Database} from "bun:sqlite";
import {join} from "path";

// Database connection
const sqlite = new Database((process.env.DB_PATH && process.env.DB_FILE) ?
        join(process.env.DB_PATH, process.env.DB_FILE) : 'plant.db'
)
export const db = drizzle(sqlite)