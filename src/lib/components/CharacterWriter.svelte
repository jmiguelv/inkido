<script lang="ts">
    import type HanziWriter from "hanzi-writer";
    import { getPreferences } from "$lib/stores.svelte";

    let {
        char,
        language = "zh",
        size = 100,
        mode = "animate",
        colorize = false,
        showHint = true,
        autoplay = true,
        onComplete,
        onAnimationDone,
    }: {
        char: string;
        language?: string;
        size?: number;
        mode?: "animate" | "quiz";
        colorize?: boolean;
        showHint?: boolean;
        autoplay?: boolean;
        onComplete?: () => void;
        onAnimationDone?: () => void;
    } = $props();

    let writerError = $state(false);
    let writerInstance = $state<HanziWriter | null>(null);
    let playFn = $state<(() => void) | null>(null);

    // Chained animation: fire when autoplay becomes true after setup completes
    $effect(() => {
        const shouldPlay = autoplay;
        const fn = playFn;
        if (shouldPlay && fn) fn();
    });

    function initWriter(node: HTMLDivElement) {
        let destroyed = false;
        let animating = false;

        async function setup() {
            const { default: HanziWriter } = await import("hanzi-writer");
            if (destroyed) return;

            // Get computed style to fetch the current theme's stroke color
            const style = getComputedStyle(document.documentElement);
            const defaultStrokeColor = style.getPropertyValue('--color-writer-stroke').trim() || '#0A0A0A';
            const defaultOutlineColor = style.getPropertyValue('--color-writer-outline').trim() || '#DDD';
            
            // "Deep Pastels" for meaning/sound components
            const mintColor = '#2ecc71'; // Green for Meaning/Radical
            const skyColor = '#3498db';  // Blue for Sound (and everything else)

            const writer = HanziWriter.create(node, char, {
                width: size,
                height: size,
                padding: Math.round(size * 0.05),
                showOutline: mode !== "quiz" || showHint,
                strokeColor: colorize ? skyColor : defaultStrokeColor,
                radicalColor: colorize ? mintColor : undefined,
                outlineColor: defaultOutlineColor,
                strokeAnimationSpeed: getPreferences().writingSpeed,
                delayBetweenStrokes: 300 / getPreferences().writingSpeed,
                onLoadCharDataError: () => {
                    if (!destroyed) writerError = true;
                },
            });

            writerInstance = writer;

            function play(onDone?: () => void) {
                if (destroyed || animating || mode === "quiz") return;
                animating = true;
                writer.animateCharacter().then(() => {
                    animating = false;
                    onDone?.();
                });
            }

            if (mode === "quiz") {
                writer.quiz({
                    showHintAfterMisses: 3, // Keep the automatic hint on misses
                    onComplete: () => {
                        if (!destroyed && onComplete) onComplete();
                    },
                });
            } else {
                // Expose play via state so the $effect can trigger it.
                // The $effect handles the initial auto-play and chained play.
                playFn = () => play(onAnimationDone);
                node.addEventListener("click", () => play());
            }
        }

        setup().catch(() => {
            if (!destroyed) writerError = true;
        });

        return {
            destroy() {
                destroyed = true;
                writerInstance = null;
            },
        };
    }

    $effect(() => {
        if (writerInstance && mode === 'quiz') {
            if (showHint) {
                writerInstance.showOutline();
            } else {
                writerInstance.hideOutline();
            }
        }
    });
</script>

{#if language !== "zh" || writerError}
    <div
        class="fallback"
        style="width: {size}px; height: {size}px; font-size: calc({size}px * 0.6);"
        lang={language}
        aria-hidden="true"
    >
        {char}
    </div>
{:else}
    {#key char + colorize}
        <div class="writer-container" style="width: {size}px; height: {size}px;">
            {#if mode === 'quiz'}
                <svg class="writer-grid" width={size} height={size} aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
                    <rect x="0.5" y="0.5" width={size - 1} height={size - 1} fill="none" stroke-width="1" />
                    <line x1={size / 2} y1="0" x2={size / 2} y2={size} stroke-width="1" stroke-dasharray="4 4" />
                    <line x1="0" y1={size / 2} x2={size} y2={size / 2} stroke-width="1" stroke-dasharray="4 4" />
                </svg>
            {/if}
            <div
                use:initWriter
                class="writer-box"
                style="width: {size}px; height: {size}px; padding: 0;"
                role="button"
                tabindex="0"
                aria-label={mode === 'quiz' ? `Write the character ${char}` : `Replay stroke order for ${char}`}
            ></div>
        </div>
    {/key}
{/if}

<style>
    .writer-container {
        position: relative;
        flex-shrink: 0;
    }

    .writer-grid {
        position: absolute;
        top: 0;
        left: 0;
        stroke: var(--color-text-muted);
        pointer-events: none;
    }

    .writer-box {
        position: relative;
        cursor: pointer;
        max-width: 100%;
        height: auto;
    }

    .fallback {
        display: flex;
        align-items: center;
        justify-content: center;
        border: var(--border);
        background: var(--color-bg);
        line-height: 1;
        flex-shrink: 0;
        max-width: 100%;
    }
</style>
