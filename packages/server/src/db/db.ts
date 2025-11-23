/**
 * Database connection and query utilities.
 */
import {drizzle} from "drizzle-orm/bun-sqlite";
import {Database} from "bun:sqlite";
import {ENV} from "../lib";

// Database connection
const sqlite = new Database(ENV.DATABASE_PATH)
export const db = drizzle(sqlite)