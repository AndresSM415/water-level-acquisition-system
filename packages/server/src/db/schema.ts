/**
 * Database schema definition.
 * Matches the Python sampler's sensor_samples table structure.
 */
import {sqliteTable, integer, real, index } from "drizzle-orm/sqlite-core";
import {ENV} from "../lib";

export const sensorSamples = sqliteTable(
    ENV.SAMPLE_TABLE,
    {
        id: integer("id").primaryKey({autoIncrement: true}),
        timestamp: real("timestamp").notNull(),

        // Tank levels (0-3.3v)
        tank1Voltage: real("tank1_voltage").notNull(),
        tank2Voltage: real("tank2_voltage").notNull(),
        tank3Voltage: real("tank3_voltage").notNull(),

        // Flow meters (L/s)
        flow1Lps: real("flow1_lps").notNull(),
        flow1Pulses: integer("flow1_pulses").notNull(),
        flow2Lps: real("flow2_lps").notNull(),
        flow2Pulses: integer("flow2_pulses").notNull(),

        // Hose duty cycles (0-100%)
        hose1DutyCycle: real("hose1_duty_cycle").notNull(),
        hose2DutyCycle: real("hose2_duty_cycle").notNull(),
    },
    (table) => ({
        timestampIdx: index("idx_timestamp").on(table.timestamp),
    })
);

export type SensorSample = typeof sensorSamples.$inferSelect;
export type NewSensorSample = typeof sensorSamples.$inferInsert