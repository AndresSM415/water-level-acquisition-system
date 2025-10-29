/**
 * Business logic for sensor data processing.
 */
import Papa from 'papaparse';
import type { DashboardReading, ExportFormat, DecimationInterval } from "@wlas/shared";
import type { SensorSample } from "../db/schema";
import {SensorRepository} from "../repositories/sensor-repository";

export class SensorService {
    constructor(private repository: SensorRepository) {}

    private readonly VOLTAGE_MIN = 0;
    private readonly VOLTAGE_MAX = 3.3;

    /**
     * Convert voltage to percentage (0-100%).
     */
    private voltageToPercentage(voltage: number): number {
        const percentage = ((voltage - this.VOLTAGE_MIN) / (this.VOLTAGE_MAX - this.VOLTAGE_MIN)) * 100
        return Math.max(0, Math.min(100, this.toFixed(percentage, 1)));
    }

    private toFixed(number: number, decimals: number): number {
        return parseFloat(number.toFixed(decimals));
    }

    /**
     * Convert a raw sensor sample to dashboard format.
     */
    sampleToDashboard(sample: SensorSample): DashboardReading {
        return {
            tanks: {
                tank1: this.voltageToPercentage(sample.tank1Voltage),
                tank2: this.voltageToPercentage(sample.tank2Voltage),
                tank3: this.voltageToPercentage(sample.tank3Voltage)
            },
            flow: {
                flow1: this.toFixed(sample.flow1Lps, 2),
                flow2: this.toFixed(sample.flow2Lps, 2)
            },
            hose: {
                hose1: this.toFixed(sample.hose1DutyCycle, 1),
                hose2: this.toFixed(sample.hose2DutyCycle, 1)
            }
        };
    }

    /**
     * Get the latest reading in dashboard format.
     */
    async getLatestReading(): Promise<DashboardReading | null> {
        const sample = await this.repository.getLatest();
        return sample ? this.sampleToDashboard(sample) : null;
    }

    /**
     * Get the latest raw sample.
     */
    async getLatestSample(): Promise<SensorSample | null> {
        const sample = await this.repository.getLatest();
        return sample || null;
    }

    /**
     * Export data in a specified format.
     */
    async exportData(
        startTime: number,
        endTime: number,
        decimation: DecimationInterval,
        format: ExportFormat,
        limit: number = 3600
    ): Promise<string> {
        const samples = await this.repository.getInRange(
            startTime, endTime, decimation, limit
        );

        if (format === "csv")
            return this.samplesToCSV(samples);
        return "";
    }

    /**
     * Convert samples to cSV format.
     */
    private samplesToCSV(samples: SensorSample[]): string {
        return Papa.unparse(samples);
    }

    /**
     * Get reading count in time range.
     */
    async getReadingCount(startTime: number, endTime: number): Promise<number> {
        return await this.repository.countInRange(startTime, endTime);
    }
}