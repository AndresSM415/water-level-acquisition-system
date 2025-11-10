export function formatTimestamp(timestamp: number): string {
    const startMs = timestamp * 1000;

    // Format start time
    const startDate = new Date(startMs);
    const day = String(startDate.getDate()).padStart(2, '0');
    const month = String(startDate.getMonth() + 1).padStart(2, '0');
    const year = startDate.getFullYear();
    const hours = String(startDate.getHours()).padStart(2, '0');
    const minutes = String(startDate.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}_${hours}-${minutes}`
}

export function formatTime(seconds: number): string {
    if (seconds<60) return `${Math.floor(seconds)}s`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${Math.floor(seconds % 60)}s`;

    const hours = Math.floor(minutes/60);
    return `${hours}h ${minutes % 60}m`;
}