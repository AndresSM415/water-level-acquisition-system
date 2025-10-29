/**
 * API request and response types.
 */

/**
 * Valid export formats.
 */
export type ExportFormat = "csv" | "json";


/**
 * Valid decimation intervales (sample every N seconds).
 */
export type DecimationInterval = 1 | 2 | 5 | 10 | 30 | 60;


/**
 * Export/download request parameters.
 */
export interface ExportQuery {
    startTime: number;              // Unix timestamp (seconds)
    format: ExportFormat;           // csv or txt
    decimation: DecimationInterval; // sample interval
    endTime?: number;               // defaults now
    limit?: number;                 // max rows for safety
}