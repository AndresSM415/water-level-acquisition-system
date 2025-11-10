export function voltageToPercent(voltage: number): number {
    const percent = (voltage / 3.3) * 100;
    return Math.max(0, Math.min(100, percent));
}

export function formatNumber(value: number, decimals: number = 2): string {
    if (Number.isNaN(value)) return '-';
    return value.toFixed(decimals)
}

export function formatTime(seconds: number): string {
    if (seconds<60) return `${seconds}s`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`;

    const hours = Math.floor(minutes/60);
    return `${hours}h ${minutes % 60}m`;
}

export function formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: "2-digit"
    });
}

export function getTimeAgo(milliseconds: number): string {
    const seconds = Math.round(milliseconds/1000);

    if (seconds<60) return `hace ${seconds}s`;

    const minutes = Math.round(seconds/60);
    if (minutes<60) return `hace ${minutes}s`;

    const hours = Math.round(minutes/60);
    return `hace ${hours}h`;
}

export function getSensorInfo(
    sensorType: 'tank1' | 'tank2' | 'tank3' | 'flow1' | 'flow2' | 'hose1' | 'hose2'
): { label: string; unit: string } {
    const info = {
        tank1: { label: 'Tanque 1', unit: '%' },
        tank2: { label: 'Tanque 2', unit: '%' },
        tank3: { label: 'Tanque 3', unit: '%' },
        flow1: { label: 'Gasto 1', unit: 'L/s' },
        flow2: { label: 'Gasto 2', unit: 'L/s' },
        hose1: { label: 'Salida 1', unit: '%' },
        hose2: { label: 'Salida 2', unit: '%' },
    };

    return info[sensorType] || { label: 'Unknown', unit: '' };
}

export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

export function isValidNumber(value: any): boolean {
    return typeof value === 'number' && !Number.isNaN(value) && isFinite(value);
}