<script lang="ts">
    let {
        char,
        language = "zh",
        size = 100,
        mode = "animate",
        colorize = false,
        showHint = true,
        onComplete,
    }: {
        char: string;
        language?: string;
        size?: number;
        mode?: "animate" | "quiz";
        colorize?: boolean;
        showHint?: boolean;
        onComplete?: () => void;
    } = $props();

    let writerError = $state(false);

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
                showOutline: mode !== "quiz",
                strokeColor: colorize ? skyColor : defaultStrokeColor,
                radicalColor: colorize ? mintColor : undefined,
                outlineColor: defaultOutlineColor,
                strokeAnimationSpeed: 1,
                delayBetweenStrokes: 300,
                onLoadCharDataError: () => {
                    if (!destroyed) writerError = true;
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
                    showHintAfterMisses: showHint ? 3 : false,
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
    {#key char + colorize + showHint}
        <div
            use:initWriter
            class="writer-box"
            style="width: {size}px; height: {size}px; padding: 0;"
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
