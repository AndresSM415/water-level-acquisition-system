/**
 * Sensor data types for dashboard display and real-time updates
 */

/**
 * Processed sensor data for dashboard display.
 */
export interface DashboardReading {
    tanks: { // 0 - 100%
        tank1: number;
        tank2: number;
        tank3: number;
    };
    flow: { // L/s
        flow1: number;
        flow2: number;
    };
    hose: { // 0 - 100%
        hose1: number;
        hose2: number;
    }
}


/**
 * Server-Sent Event message types.
 */
export type SSEMessageType = "connected" | "reading" | "error";


/**
 * SSE message format for real-time updates.
 */
export interface SSEMessage {
    type: SSEMessageType;
    reading?: DashboardReading;
    message?: string;
    timestamp: number;
}