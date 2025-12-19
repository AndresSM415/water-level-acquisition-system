<script lang="ts">
    import { Chart, type ChartConfiguration, registerables} from 'chart.js';
    import { onMount } from 'svelte';
    import { formatNumber } from '@/lib/utils';

    Chart.register(...registerables)

    let { title, data, unit }: {
        title: string;
        data: number[];
        unit: string
    } = $props();

    let canvas: HTMLCanvasElement;
    let chart: Chart;

    onMount(() => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array(data.length).fill(''),
                datasets: [
                    {
                        label: title,
                        data,
                        borderColor: '#1e40af',
                        backgroundColor: 'rgba(30, 64, 175, 0.1)',
                        borderWidth: 2,
                        tension: 0.3,
                        fill: true,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index',
                },
                plugins: {
                    legend: {
                        display: false,
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        padding: 8,
                        borderRadius: 4,
                        displayColors: false,
                    },
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: unit === '%' ? 100 : undefined,
                        grid: {
                            display:false
                        },
                        ticks: {
                            // color: '#64748b',
                            // font: {
                            //     size: 12,
                            // },
                            display: false
                        },
                    },
                    x: {
                        display: false,
                        grid: {
                            display: false,
                        },
                    },
                },
            },
        } as ChartConfiguration);

        return () => {
            if (chart) {
                chart.destroy();
            }
        };
    });

    $effect(() => {
        if (chart && data && chart.data.datasets[0]) {
            chart.data.datasets[0].data = data;
            chart.update('none');
        }
    });
</script>

<div class="chart-container">
<!--    <h3 class="text-lg font-semibold text-gray-800 mb-2">{title}</h3>-->
    <div class="chart-wrapper">
        <canvas bind:this={canvas}></canvas>
    </div>
    <div class="chart-value">
        <span class="md:text-xl font-bold text-primary">
            {formatNumber(data[data.length - 1] ?? 0, 1)}
        </span>
        <span class="text-sm text-gray-600 ml-1">{unit}</span>
    </div>
</div>

<style>
    .chart-container {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 0.5rem;
        padding: 0.7rem;
        height: 210px;
        display: flex;
        flex-direction: column;
    }

    .chart-wrapper {
        flex: 1;
        position: relative;
        min-height: 0;
    }

    .chart-value {
        display: flex;
        align-items: baseline;
        justify-content: center;
        margin-top: 0.75rem;
        padding-top: 0.75rem;
        border-top: 1px solid #e2e8f0;
    }
</style>