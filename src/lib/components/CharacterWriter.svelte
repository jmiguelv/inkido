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

            const dataPromise = colorize
                ? getCharData(char)
                : Promise.resolve(null);

            // Get computed style to fetch the current theme's stroke color
            const style = getComputedStyle(document.documentElement);
            const defaultStrokeColor = style.getPropertyValue('--color-writer-stroke').trim() || '#0A0A0A';
            const defaultOutlineColor = style.getPropertyValue('--color-writer-outline').trim() || '#DDD';
            const mintColor = style.getPropertyValue('--color-mint').trim() || '#2ecc71';
            const skyColor = style.getPropertyValue('--color-sky').trim() || '#3498db';

            const writer = HanziWriter.create(node, char, {
                width: size,
                height: size,
                padding: Math.round(size * 0.05),
                showOutline: true,
                strokeColor: defaultStrokeColor,
                outlineColor: defaultOutlineColor,
                strokeAnimationSpeed: 1,
                delayBetweenStrokes: 300,
                onLoadCharDataSuccess: async () => {
                    if (destroyed || !colorize) return;
                    try {
                        const data = await dataPromise;
                        if (
                            data?.stroke_fragments &&
                            data.components &&
                            !destroyed
                        ) {
                            const fragsList = data.stroke_fragments;
                            const compsList = data.components;
                            // Small timeout to ensure internal SVG structure is ready
                            setTimeout(() => {
                                if (destroyed) return;
                                for (
                                    let i = compsList.length - 1;
                                    i >= 0;
                                    i--
                                ) {
                                    const comp = compsList[i];
                                    const frags = fragsList[i];
                                    if (!frags) continue;

                                    let color = defaultStrokeColor;
                                    if (
                                        comp.type.includes("meaning") ||
                                        comp.type.includes("radical")
                                    ) {
                                        color = mintColor;
                                    } else if (comp.type.includes("sound")) {
                                        color = skyColor;
                                    }

                                    for (const strokeIdx of frags) {
                                        (writer as any).updateColor(
                                            "strokeColor",
                                            color,
                                            { strokeNum: strokeIdx },
                                        );
                                    }
                                }
                            }, 50);
                        }
                    } catch (e) {
                        console.error("Colorize failed:", e);
                    }
                },
            });

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
