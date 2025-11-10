<script lang="ts">
    import {chartData} from "@/stores";
    import MiniChart from "@/components/MiniChart.svelte";
</script>

<main class="flex-1 overflow-y-auto bg-gray-50 p-2 md:p-5 mb-2 md:mb-5" style="padding-bottom: var(--footer-height, 228px)">
    <div class="max-w-7xl mx-auto">
        <!-- Tanks Section -->
        <section class="bg-white rounded-lg shadow-sm p-3 md:p-4 border border-gray-200 mb-1 md:mb-3">
            <h2 class="md:text-lg font-semibold text-gray-900 mb-2 md:mb-4 md:pb-1 border-b border-gray-200">
                Nivel en Tanques
            </h2>
            <div class="grid grid-cols-3 gap-1 md:gap-2">
                <MiniChart title="Tanque 1" data={$chartData.tank1} unit="%" />
                <MiniChart title="Tanque 2" data={$chartData.tank2} unit="%" />
                <MiniChart title="Tanque 3" data={$chartData.tank3} unit="%" />
            </div>
        </section>

        <!-- Flow Section -->
        <section class="bg-white rounded-lg shadow-sm p-3 md:p-4 border border-gray-200 mb-1 md:mb-3">
                <h2 class="md:text-lg font-semibold text-gray-900 mb-2 md:mb-4 md:pb-1 border-b border-gray-200">
                    Flujo registrado
                </h2>
            <div class="grid grid-cols-2 gap-2 md:gap-4">
                <MiniChart title="Gasto 1" data={$chartData.flow1} unit="L/s" />
                <MiniChart title="Gasto 2" data={$chartData.flow2} unit="L/s" />
            </div>
        </section>

        <!-- Hose Section -->
        <section class="bg-white rounded-lg shadow-sm p-3 md:p-4 border border-gray-200">
            <h2 class="md:text-lg font-semibold text-gray-900 mb-2 md:mb-4 md:pb-1 border-b border-gray-200">
                Salida en Llaves
            </h2>
            <div class="grid grid-cols-2 gap-2 md:gap-4">
                <MiniChart title="Salida 1" data={$chartData.hose1} unit="%" />
                <MiniChart title="Salida 2" data={$chartData.hose2} unit="%" />
            </div>
        </section>
    </div>
</main>

<style>
    main {
        display: flex;
        flex-direction: column;
    }
</style>