import { writable } from "svelte/store";
import type { DashboardReading } from "@wlas/shared";

const MAX_POINTS = 3*60;

export interface ChartData {
    tank1: number[];
    tank2: number[];
    tank3: number[];
    flow1: number[];
    flow2: number[];
    hose1: number[];
    hose2: number[];
}

function createEmptyChartData(): ChartData {
    return {
        tank1: Array(MAX_POINTS).fill(0),
        tank2: Array(MAX_POINTS).fill(0),
        tank3: Array(MAX_POINTS).fill(0),
        flow1: Array(MAX_POINTS).fill(0),
        flow2: Array(MAX_POINTS).fill(0),
        hose1: Array(MAX_POINTS).fill(0),
        hose2: Array(MAX_POINTS).fill(0)
    };
}

export const chartData = writable<ChartData>(createEmptyChartData());

export function addReading(reading: DashboardReading): void {
    chartData.update((current) => ({
        tank1: [...current.tank1, reading.tanks.tank1].slice(-MAX_POINTS),
        tank2: [...current.tank2, reading.tanks.tank2].slice(-MAX_POINTS),
        tank3: [...current.tank3, reading.tanks.tank3].slice(-MAX_POINTS),
        flow1: [...current.flow1, reading.flow.flow1].slice(-MAX_POINTS),
        flow2: [...current.flow2, reading.flow.flow2].slice(-MAX_POINTS),
        hose1: [...current.hose1, reading.hose.hose1].slice(-MAX_POINTS),
        hose2: [...current.hose2, reading.hose.hose2].slice(-MAX_POINTS),
    }));
}

export function clearReadings(): void {
    chartData.set(createEmptyChartData());
}

export function getPointCount(): Promise<number> {
    return new Promise((resolve)=> {
        chartData.subscribe((chartData) => {
            resolve(chartData.tank1.length);
        })();
    });
}