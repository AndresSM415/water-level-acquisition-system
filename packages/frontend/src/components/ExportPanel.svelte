<script lang="ts">
    import {Input} from "$lib/components/ui/input";
    import {
        clientId,
        connectionState,
        decimation,
        isExporting,
        exportError,
        connectionDate
    } from "@/stores";
    import {
        downloadData,
        formatTimestamp
    } from "$lib";

    let localDecimation = $state($decimation);
    let selectedTime = $state<string>("");

    $effect(() => {
        if ($connectionDate)
            selectedTime = formatTimestamp($connectionDate)
    })

    function getExportStartTime(): number | null {
        if (!$connectionDate) return null;

        const [hours, minutes, seconds] = selectedTime.split(':').map(Number)
        const date = new Date($connectionDate)

        date.setHours(hours ?? 0, minutes, seconds);
        console.log(`connDate ${$connectionDate}, ${selectedTime}`)
        return date.getTime();
    }

    function handleTimeChange(e: Event) {
        const input = e.target as HTMLInputElement;
        let [hours, minutes, seconds] = input.value.split(':').map(Number)
        if (typeof hours === "undefined" || typeof minutes === "undefined" || typeof seconds === "undefined" || !$connectionDate) return;

        const now = new Date();
        const date = new Date($connectionDate)
        date.setHours(
            hours > now.getHours() ? now.getHours() : hours,
            minutes > now.getMinutes() ? now.getMinutes() : minutes,
            seconds > now.getSeconds() ? now.getSeconds() : seconds
        )

        selectedTime = formatTimestamp(date.getTime())
    }

    async function handleExport() {
        try {
            await downloadData(<string>$clientId, localDecimation, getExportStartTime())
            console.log(`handleExport - ${selectedTime}`)
        } catch (error) {
            console.error('Export failed:', error);
        }
    }

    const isDownloadDisabled = $derived($connectionState !== 'connected' || $isExporting);
    const id = $props.id();
</script>

<footer class="fixed w-full bottom-0 left-0 bg-white border-t border-gray-200 px-4 md:px-6 py-3 md:py-4">
    <div class="max-w-7xl mx-auto">
        <!--Mobile: Two rows, Desktop: Single row -->
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4">
            <div class="flex flex-row items-center gap-2 flex-1 p-1">
                {#if typeof $connectionDate === "number" && $connectionState === 'connected'}
                    <p class="text-xs md:text-sm font-medium text-gray-700">
                        Datos registrados desde:
                    </p>
                    <div class="flex flex-col gap-1">
                        <Input
                                type="time"
                                id="{id}-time"
                                step="1"
                                value={selectedTime}
                                onchange={handleTimeChange}
                                class="text-center text-xs md:text-sm bg-transparent outline-none disabled:opacity-50 placeholder-gray-400"
                        />
                    </div>
                {:else }
                    <p class="text-xs md:text-sm font-medium text-gray-500">
                        Esperando conexión...
                    </p>
                {/if}
            </div>

            <div class="flex items-center gap-2 md:gap-4 w-full md:w-auto justify-center md:justify-around flex-wrap">
                <div>
                    <label for="decimation" class="text-sm text-gray-600">
                        Muestreo:
                    </label>
                    <select
                            id="decimation"
                            bind:value={localDecimation}
                            disabled={isDownloadDisabled}
                            class="px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                        <option value={1}>1 segundo</option>
                        <option value={2}>2 segundos</option>
                        <option value={5}>5 segundos</option>
                        <option value={10}>10 segundos</option>
                        <option value={30}>30 segundos</option>
                        <option value={60}>60 segundos</option>
                    </select>
                </div>

                <button
                        onclick={handleExport}
                        disabled={isDownloadDisabled}
                        class="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                    {#if $isExporting}
                        <span class="inline-block w-3 md:w-4 h-3 md:h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        Descargando...
                    {:else}
                        <span>⬇</span>
                        Descargar
                    {/if}
                </button>
            </div>
        </div>
    </div>

    {#if $exportError}
        <div class="mt-3 p-2 md:p-3 bg-red-50 border border-red-200 rounded-lg text-xs md:text-sm text-red-700">
            Error: {$exportError}
        </div>
    {/if}
</footer>

<style>
    footer {
        box-shadow: 0 -1px 3px rgba(0, 0, 0, 0.1);
    }

    div :global(.scroll-smooth) {
        scroll-behavior: smooth;
    }
</style>

