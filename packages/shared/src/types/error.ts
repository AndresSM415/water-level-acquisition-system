/**
 * Error handling types.
 */

/**
 * Standard API error response format.
 * Returned when HTTP status is 4xx or 5xx
 */
export interface ApiError {
    error: string;      // Human-readable error message.
    code?: string;      // Machine-readable error code.
    details?: unknown;   // Aditional error context.
}
