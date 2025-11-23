import { writable } from "svelte/store";
import type { DecimationInterval } from "@wlas/shared";

export const decimation = writable<DecimationInterval>(1);

export const isExporting= writable<boolean>(false);

export const exportError= writable<string | null>(null);

export const lastExportTime= writable<number | null>(null);

export function clearError(): void {
    exportError.set(null);
}

export function setDecimation(value: DecimationInterval): void {
    decimation.set(value);
}

export function startExport(): void {
    isExporting.set(true);
    clearError();
}

export function completeExport(): void {
    isExporting.set(false);
    lastExportTime.set(Date.now());
}

export function failExport(message: string): void {
    isExporting.set(false);
    exportError.set(message);
}