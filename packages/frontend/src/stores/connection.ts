import {writable} from "svelte/store";

export const connectionState= writable<
    'connecting' | 'connected' | 'disconnected' | 'error'
>('connecting');

export const connectionDate = writable<number | null>(null);

export const clientId = writable<string | null>(null);

export const lastReadingTime= writable<number | null>(null);

export const secondsSinceLastReading= writable<number>(0);

if (typeof window !== 'undefined') {
    setInterval(()=> {
        lastReadingTime.subscribe((time)=> {
            if (time === null) {
                secondsSinceLastReading.set(0);
                return;
            }
            const seconds= Math.round((Date.now() - time) / 1000);
            secondsSinceLastReading.set(seconds);
        })();
    }, 1000);
}