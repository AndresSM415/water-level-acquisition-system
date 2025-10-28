import {db} from "../db/db";
import { sensorSamples, type SensorSample } from "../db/schema";
import { desc, gte, lte, and, sql } from "drizzle-orm";

export class SensorRepository {
    /**
     * Get the most recent sensor reading.
     */
    async getLatest(): Promise<SensorSample | undefined > {
        const [latest] = await db
            .select()
            .from(sensorSamples)
            .orderBy(desc(sensorSamples.timestamp))
            .limit(1)
        return latest;
    }

    /**
     * Get readings within time range.
     */
    async getInRange(
        startTime: number,
        endTime: number,
        decimation: number = 1,
        limit: number = 3600
    ): Promise<SensorSample[]> {
        if (decimation === 1) {
            return db
                .select()
                .from(sensorSamples)
                .where(
                    and(
                        gte(sensorSamples.timestamp, startTime),
                        lte(sensorSamples.timestamp, endTime)
                    )
                )
                .orderBy(sensorSamples.timestamp)
                .limit(limit)
        }
        return db
            .select()
            .from(sensorSamples)
            .where(
                and(
                    gte(sensorSamples.timestamp, startTime),
                    lte(sensorSamples.timestamp, endTime),

                    sql`CAST(${sensorSamples.timestamp} AS INTEGER) % ${decimation} = 0`
                )
            )
            .orderBy(sensorSamples.timestamp)
            .limit(limit)
    }

    /**
     * Count readings in time range.
     */
    async countInRange(startTime: number, endTime: number): Promise<number> {
        const [result] = await db
            .select({count: sql<number>`COUNT(*)`})
            .from(sensorSamples)
            .where(
                and(
                    gte(sensorSamples.timestamp, startTime),
                    lte(sensorSamples.timestamp, endTime)
                )
            );
        return result?.count || 0;
    }
}