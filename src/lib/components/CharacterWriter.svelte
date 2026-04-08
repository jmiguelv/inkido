<script lang="ts">
    import { getCharData } from "$lib/dictionary";

    let {
        char,
        language = "zh",
        size = 100,
        mode = "animate",
        colorize = false,
        onComplete,
    }: {
        char: string;
        language?: string;
        size?: number;
        mode?: "animate" | "quiz";
        colorize?: boolean;
        onComplete?: () => void;
    } = $props();

    let writerError = $state(false);

    function initWriter(node: HTMLDivElement) {
        let destroyed = false;
        let animating = false;

        async function setup() {
            const { default: HanziWriter } = await import("hanzi-writer");
            if (destroyed) return;

            // 1. Get current theme colors
            const style = getComputedStyle(document.documentElement);
            const defaultStrokeColor = style.getPropertyValue('--color-writer-stroke').trim() || '#0A0A0A';
            const defaultOutlineColor = style.getPropertyValue('--color-writer-outline').trim() || '#DDD';
            
            // "Deep Pastels" for the strokes
            const mintColor = '#2ecc71'; // Meaning
            const skyColor = '#3498db';  // Sound

            // 2. Initialize writer
            const writer = HanziWriter.create(node, char, {
                width: size,
                height: size,
                padding: Math.round(size * 0.05),
                showOutline: true,
                strokeColor: defaultStrokeColor,
                outlineColor: defaultOutlineColor,
                strokeAnimationSpeed: 1,
                delayBetweenStrokes: 300,
                onLoadCharDataError: () => { if (!destroyed) writerError = true }
            });

            // 3. Apply colorization if needed
            if (colorize) {
                try {
                    const data = await dataPromise;
                    if (data?.stroke_fragments && data.components) {
                        // setCharacter returns a promise that resolves when the character is rendered
                        await writer.setCharacter(char);
                        if (destroyed) return;

                        for (let i = 0; i < data.components.length; i++) {
                            const comp = data.components[i];
                            const frags = data.stroke_fragments[i];
                            if (!frags) continue;

                            let color = defaultStrokeColor;
                            if (comp.type.includes("meaning") || comp.type.includes("radical")) {
                                color = mintColor;
                            } else if (comp.type.includes("sound")) {
                                color = skyColor;
                            }

                            for (const strokeIdx of frags) {
                                (writer as any).updateColor("strokeColor", color, { strokeNum: strokeIdx });
                            }
                        }
                    }
                } catch (e) {
                    console.error("Colorize failed:", e);
                }
            }

            function play() {
                if (destroyed || animating || mode === "quiz") return;
                animating = true;
                writer.animateCharacter().then(() => {
                    animating = false;
                });
            }

            if (mode === "quiz") {
                writer.quiz({
                    onComplete: () => {
                        if (!destroyed && onComplete) onComplete();
                    },
                });
            } else {
                play();
                node.addEventListener("click", play);
            }
        }

        setup().catch(() => {
            if (!destroyed) writerError = true;
        });

        return {
            destroy() {
                destroyed = true;
            },
        };
    }
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
    {#key char}
        <div
            use:initWriter
            class="writer-box"
            style="width: {size}px; height: {size}px;"
            role="button"
            tabindex="0"
            aria-label="Replay stroke order for {char}"
        ></div>
    {/key}
{/if}

<style>
    .writer-box {
        flex-shrink: 0;
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
