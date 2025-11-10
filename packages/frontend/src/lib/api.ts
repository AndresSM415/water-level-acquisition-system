import { startExport, completeExport, failExport } from "@/stores/export";
import { config } from "@/lib/config.ts";

export async function downloadData(
    clientId: string,
    decimation: number,
    apiUrl: string = config.apiUrl
): Promise<void> {
    startExport();

    try {
        console.log('[API] Requesting export:', {clientId, decimation});

        const response = await fetch(`${apiUrl}/api/export?clientId=${clientId}&decimation=${decimation}`,
            {
            method: 'GET'
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Export failed: ${response.status} ${response.statusText}\n${errorBody}`);
        }

        const blob = await response.blob();
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'sensor-data.csv';
        console.log(contentDisposition)
        if (contentDisposition){
            const matches = contentDisposition.match(/filename="(.+?)"/);
            console.log("vv")
            if (matches && matches[1]) {
                filename = matches[1]
                console.log("aa")
            }
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);

        console.log('[API] Export completed');
        completeExport();
    } catch (error) {
        console.error('[API] Export failed:', error);
        failExport(
            error instanceof Error ? error.message : 'Unknown error occurred'
        )
        throw error
    }
}

export async function getStats(
    apiUrl: string = config.apiUrl
): Promise<any> {
    try {
        const response = await fetch(`${apiUrl}/api/stats`);

        if (!response.ok) {
            throw new Error(`Failed to fetch stats: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('[API] Failed to fetch stats:', error);
        throw error;
    }
}