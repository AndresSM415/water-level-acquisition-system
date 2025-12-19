import { defineConfig } from "drizzle-kit";
import { ENV } from "./src/lib";

export default defineConfig({
    schema: './src/db/schema.ts',
    out: './drizzle',
    dialect: 'sqlite',
    dbCredentials: {
        url: ENV.DATABASE_PATH
    }
})