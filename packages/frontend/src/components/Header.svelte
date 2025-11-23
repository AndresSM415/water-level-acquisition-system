<script lang="ts">
    import {
        connectionState,
        secondsSinceLastReading
    } from "@/stores";
    import {formatTime} from "@/lib/index.ts";
</script>

<header class="bg-white border-b border-gray-200 px-6 py-2 md:py-4">
    <div class="max-w-7xl mx-auto flex items-center justify-between">
        <div>
            <h1 class="text md:text-2xl font-bold text-gray-900">
                Tanques Interconectados
            </h1>
            <p class="text-xs md:text-sm text-gray-600 mt-1">
                Laboratorio de Ingeniería de Control
            </p>
        </div>

        <div class="flex items-center gap-6">
            <div class="text-right">
                <div class="flex items-center gap-2 mb-0 md:mb-1">
                    {#if $connectionState === 'connected'}
                        <span class="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span class="text-sm font-medium text-green-700">Conectado</span>
                    {:else if $connectionState === 'connecting'}
                        <span class="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                        <span class="text-sm font-medium text-yellow-700">Conectando...</span>
                    {:else}
                        <span class="w-2 h-2 bg-red-500 rounded-full"></span>
                        <span class="text-sm font-medium text-red-700">Desconectado</span>
                    {/if}
                </div>
                <p class="text-xs text-gray-500">
                    Última lectura: hace {formatTime($secondsSinceLastReading)}
                </p>
            </div>
        </div>
    </div>
</header>

<style>
    header{
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
</style>