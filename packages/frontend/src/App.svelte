<script lang="ts">
    import { onMount } from "svelte";
    import { connectToSSE } from '@/lib/sse'
    import { Header, ChartsGrid, ExportPanel } from "@/components";
    import { config } from "@/lib/config";

    onMount(() => {
        connectToSSE(config.apiUrl)
        // Footer height
        const footer = document.querySelector('footer');
        const updateFooterHeight = () => {
            if (footer) {
                document.documentElement.style.setProperty('--footer-height', `${footer.offsetHeight}px`);
            }
        };
        updateFooterHeight();
        window.addEventListener('resize', updateFooterHeight);

        // Keep screen awake while app is open
        if ("wakeLock" in navigator) {
            let wakeLock: any = null;
            const requestWakeLock = async () => {
                try {
                    wakeLock = await navigator.wakeLock.request('screen');
                    console.log('Screen wake lock acquired');

                    wakeLock.addEventListener('release', () => {
                        console.log('Screen wake lock released');
                    });
                } catch (error) {
                    console.error('Wake lock request failed:', error)
                }
            }
            requestWakeLock();
            document.addEventListener('visibilitychange', async () => {
                if (document.visibilityState === 'visible' && !wakeLock) {
                    await requestWakeLock();
                }
            });

        }
    });
</script>

<div class="flex flex-col h-screen bg-gray-50">
    <Header />
    <ChartsGrid />
    <ExportPanel />
</div>

<style global>
    :global(*) {
        box-sizing: border-box;
    }

    :global(body) {
        margin: 0;
        padding: 0;
        font-family: system-ui, -apple-system, sans-serif;
        background: #f8fafc;
    }

    :global(#app) {
        display: flex;
        flex-direction: column;
        height: 100vh;
    }
</style>