import { defineConfig } from "drizzle-kit";
import { join } from "path";

export default defineConfig({
    schema: './src/db/schema.ts',
    out: './drizzle',
    dialect: 'sqlite',
    dbCredentials: {
        url: (process.env.DB_PATH && process.env.DB_FILE) ?
            join(process.env.DB_PATH, process.env.DB_FILE) : 'plant.db'
    }
})