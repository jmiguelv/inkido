<script lang="ts">
    import { page } from "$app/state";
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import { SvelteMap } from "svelte/reactivity";
    import { supabase } from "$lib/supabase";
    import { getActiveProfile } from "$lib/stores.svelte";
    import { splitCharacters, alignPinyin, isChineseCharacter } from "$lib/characters";
    import { speak } from "$lib/audio";
    import {
        getCharsData,
        getWordsData,
        getHoverStrokeClass,
        getCachedPinyin,
    } from "$lib/dictionary";
    import type { HomeworkScan, ZHChar } from "$lib/types";
    import CharacterWriter from "$lib/components/CharacterWriter.svelte";
    import CharacterModal from "$lib/components/CharacterModal.svelte";

    type CharData = ZHChar & {
        phonetic: string | null;
        translation: string | null;
    };

    const scanId = $derived(page.params.id || "");
    const qIndex = $derived(parseInt(page.params.q_index || "0"));
    const activeProfile = $derived(getActiveProfile());

    let scan = $state<HomeworkScan | null>(null);
    let charDataMap = new SvelteMap<string, CharData>();
    let modalChar = $state<{ char: string } | null>(null);
    let loading = $state(true);
    let chainIndex = $state(0);
    let errorMsg = $state("");

    const question = $derived(scan?.analysis?.questions?.[qIndex]);

    function handleListen() {
        if (!question) return;
        try {
            speak(question.original, 'zh');
        } catch {
            // speech not available
        }
    }

    async function load() {
        loading = true;
        chainIndex = 0;
        errorMsg = "";
        try {
            const { data, error } = await supabase
                .from("homework_scans")
                .select("*")
                .eq("id", scanId)
                .single();
            if (error) throw error;
            scan = data as HomeworkScan;

            if (!question) {
                errorMsg = "Question not found";
                return;
            }

            const questionChars = splitCharacters(question.original).filter(isChineseCharacter);
            const answerChars = question.sampleAnswer ? splitCharacters(question.sampleAnswer.chinese).filter(isChineseCharacter) : [];
            const chars = [...new Set([...questionChars, ...answerChars])];

            if (chars.length > 0) {
                const [charRows, wordRows] = await Promise.all([
                    getCharsData(chars),
                    getWordsData(chars),
                ]);

                for (const char of chars) {
                    const c = charRows.get(char);
                    const w = wordRows.get(char);
                    if (c) {
                        charDataMap.set(char, {
                            ...c,
                            phonetic: w?.pinyin ?? null,
                            translation: w?.translation ?? null,
                        });
                    }
                }

                // Pre-fetch component pinyin for tooltips
                const allCompChars = [...charDataMap.values()].flatMap(c => c.components?.map(comp => comp.character) || [])
                if (allCompChars.length > 0) {
                    await getWordsData(allCompChars);
                }
            }
        } catch (e) {
            errorMsg = e instanceof Error ? e.message : "Failed to load question";
        } finally {
            loading = false;
        }
    }

    onMount(() => {
        if (!activeProfile) {
            goto("/profiles");
            return;
        }
    });

    $effect(() => {
        if (activeProfile?.id && scanId) {
            load();
        }
    });
</script>

<article class="question-detail-page">
    {#if loading}
        <p class="status" aria-live="polite">Loading…</p>
    {:else if errorMsg}
        <p class="error" role="alert">{errorMsg}</p>
    {:else if scan && question}
        <header class="page-header">
            <div class="title-group">
                <nav aria-label="Breadcrumb" class="breadcrumb">
                    <a href="/homework">Homework</a>
                    <span aria-hidden="true">/</span>
                    <a href="/homework/{scan.id}">{scan.analysis.title || 'Worksheet'}</a>
                    <span aria-hidden="true">/</span>
                    <span aria-current="page">Question {qIndex + 1}</span>
                </nav>
                <h1>{question.original}</h1>
                <p><small>Detailed breakdown and stroke-by-stroke guide for each character.</small></p>
            </div>
            <div class="header-actions">
                <button
                    class="listen-btn"
                    onclick={handleListen}
                    aria-label="Listen to {question.original}"
                >
                    ♪ Listen
                </button>
            </div>
        </header>

        <hgroup class="question-hero">
            <div class="word-character" lang="zh">
                <span class="visually-hidden">
                    {question.original}
                </span>
                <div class="hero-animation" aria-hidden="true">
                    {#each splitCharacters(question.original) as char, i (i)}
                        <div class="char-unit">
                            {#if isChineseCharacter(char)}
                                {@const pinyin = getCachedPinyin(char)}
                                {#if pinyin}
                                    <span class="char-unit-pinyin">{pinyin}</span>
                                {/if}
                                <CharacterWriter
                                    {char}
                                    language="zh"
                                    colorize={true}
                                    autoplay={i <= chainIndex}
                                    onAnimationDone={() => setTimeout(() => { chainIndex = i + 1 }, 400)}
                                />
                            {:else}
                                <span class="non-han">{char}</span>
                            {/if}
                        </div>
                    {/each}
                </div>
            </div>

            <p class="question-translation">
                {question.translation}
            </p>
        </hgroup>

        {#if question.sampleAnswer}
            <section class="section-card example-section">
                <h2 class="section-label">Sample Answer</h2>
                <div class="answer-pair">
                    <div class="answer-box answer-zh">
                        <span class="answer-lang-label">Chinese</span>
                        <div class="answer-breakdown" lang="zh">
                            {#each splitCharacters(question.sampleAnswer.chinese) as char, i (i)}
                                <div class="answer-char-unit">
                                    {#if isChineseCharacter(char)}
                                        {@const pinyin = getCachedPinyin(char)}
                                        {#if pinyin}
                                            <span class="answer-char-pinyin">{pinyin}</span>
                                        {/if}
                                        <button 
                                            class="char-btn {getHoverStrokeClass(char)}"
                                            onclick={() => modalChar = { char }}
                                            title={pinyin ?? undefined}
                                        >{char}</button>
                                    {:else}
                                        <span class="non-han-sm">{char}</span>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                        <button class="listen-answer-btn" onclick={() => speak(question.sampleAnswer.chinese, 'zh')}>♪ Listen</button>
                    </div>
                    <div class="answer-box answer-en">
                        <span class="answer-lang-label">English</span>
                        <p class="answer-text">{question.sampleAnswer.english}</p>
                    </div>
                </div>
            </section>
        {/if}

        {#if [...charDataMap.keys()].length > 0}
            <section class="chars-section">
                <h2 class="section-label">Characters</h2>
                <div class="table-wrapper">
                    <table class="char-table">
                        <thead>
                            <tr>
                                <th>Character</th>
                                <th>Listen</th>
                                <th>Pinyin</th>
                                <th>Meaning</th>
                                <th>Strokes</th>
                                <th>Made of</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each [...charDataMap.keys()].sort() as char, i (char)}
                                {@const data = charDataMap.get(char)}
                                <tr
                                    onclick={() => (modalChar = { char })}
                                    class="clickable-row"
                                    role="button"
                                    tabindex="0"
                                    aria-label="Details for {char}"
                                >
                                    <td class="td-char" lang="zh"
                                        >{char}</td
                                    >
                                    <td>
                                        <button
                                            class="play-char-btn"
                                            onclick={(e) => {
                                                e.stopPropagation();
                                                speak(char, "zh");
                                            }}
                                            aria-label="Listen to {char}"
                                        >
                                            ♪
                                        </button>
                                    </td>
                                    <td class="td-pinyin"
                                        >{data?.phonetic ?? "-"}</td
                                    >
                                    <td class="td-translation"
                                        >{data?.translation ?? "-"}</td
                                    >
                                    <td class="td-strokes"
                                        >{data?.stroke_count ?? "-"}</td
                                    >
                                    <td class="td-components">
                                        {#if data?.components && data.components.length > 0}
                                            <div class="char-row">
                                                {#each data.components as comp, ci (ci)}
                                                    {#if ci > 0}<span class="comp-plus">+</span>{/if}
                                                    <button
                                                        class="char-btn {getHoverStrokeClass(comp.character)}"
                                                        onclick={(e) => {
                                                            e.stopPropagation();
                                                            modalChar = {
                                                                char: comp.character,
                                                            };
                                                        }}
                                                        aria-label="Details for component {comp.character}"
                                                        title={getCachedPinyin(comp.character) ?? undefined}
                                                    >
                                                        {comp.character}
                                                    </button>
                                                {/each}
                                            </div>
                                        {:else}
                                            -
                                        {/if}
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            </section>
        {/if}
    {/if}

    {#if modalChar}
        <CharacterModal
            character={modalChar.char}
            language="zh"
            onclose={() => (modalChar = null)}
        />
    {/if}
</article>

<style>
    .question-detail-page {
        display: flex;
        flex-direction: column;
    }

    .status {
        color: var(--color-text-muted);
        font-size: var(--font-size-2);
    }

    .error {
        color: var(--color-danger);
        font-weight: 700;
        font-size: var(--font-size-2);
    }

    .question-hero {
        display: flex;
        flex-direction: column;
        gap: var(--size-4);
        margin-bottom: var(--size-8);
    }

    .word-character {
        margin: 0;
        line-height: 1;
    }

    .hero-animation {
        display: flex;
        flex-wrap: wrap;
        gap: var(--size-2);
        align-items: flex-end;
    }

    .char-unit {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--size-1);
    }

    .non-han {
        font-family: var(--font-display);
        font-size: clamp(2rem, 8vw, 4rem);
        font-weight: 800;
        line-height: 1.2;
        padding-bottom: var(--size-2);
    }

    .char-unit-pinyin {
        font-size: var(--font-size-3);
        color: var(--color-text);
        line-height: 1;
    }

    .question-translation {
        font-size: var(--font-size-5);
        font-weight: 700;
        margin: 0;
        line-height: 1.3;
        color: var(--color-text-muted);
    }

    .section-label {
        font-size: var(--font-size-0);
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--color-text-muted);
        margin: 0 0 var(--size-3);
    }

    .section-card {
        border: var(--border);
        padding: var(--size-5);
        box-shadow: var(--shadow-sm);
        background: var(--color-surface);
        margin-bottom: var(--size-8);
    }

    .answer-pair {
        display: grid;
        gap: var(--size-4);
    }

    @media (min-width: 600px) {
        .answer-pair { grid-template-columns: 1fr 1fr; }
    }

    .answer-box {
        padding: var(--size-4);
        border: var(--border);
        display: flex;
        flex-direction: column;
        gap: var(--size-2);
    }

    .answer-zh { background: var(--color-mint); }
    .answer-en { background: var(--color-sky); }

    .answer-breakdown {
        display: flex;
        flex-wrap: wrap;
        gap: var(--size-1) var(--size-2);
        align-items: flex-end;
        padding: var(--size-2) 0;
    }

    .answer-char-unit {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0;
    }

    .answer-char-pinyin {
        font-size: var(--font-size-0);
        color: var(--color-text-muted);
        line-height: 1;
        margin-bottom: 2px;
    }

    .non-han-sm {
        font-family: var(--font-display);
        font-size: var(--font-size-3);
        font-weight: 800;
        line-height: 1;
        padding-bottom: 4px;
    }

    .answer-lang-label {
        font-size: var(--font-size-0);
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--color-text-muted);
    }

    .answer-text {
        font-size: var(--font-size-3);
        font-weight: 700;
        margin: 0;
        line-height: 1.4;
    }

    .answer-zh .answer-text {
        font-family: var(--font-display);
        font-size: var(--font-size-4);
    }

    .listen-answer-btn {
        align-self: flex-start;
        padding: var(--size-1) var(--size-3);
        font-size: var(--font-size-0);
        font-weight: 700;
        background: var(--color-surface);
        border: var(--border);
        cursor: pointer;
    }

    .listen-answer-btn:hover {
        background: var(--color-lemon);
        transform: translate(-1px, -1px);
        box-shadow: 1px 1px 0 var(--color-border);
    }

    .chars-section {
        margin-bottom: var(--size-8);
    }

    .table-wrapper {
        width: 100%;
        overflow-x: auto;
    }

    .char-table {
        width: 100%;
        border-collapse: collapse;
        background: var(--color-surface);
        border: var(--border);
        box-shadow: var(--shadow-sm);
        text-align: center;
    }

    .char-table th,
    .char-table td {
        padding: var(--size-3) var(--size-4);
        border-bottom: 1px solid var(--color-border);
        vertical-align: middle;
    }

    .char-table th {
        font-size: var(--font-size-1);
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        background: var(--color-sky);
        color: var(--color-text);
        border-bottom: var(--border);
    }

    .clickable-row {
        cursor: pointer;
        transition: background-color var(--transition-speed);
    }

    .clickable-row:hover {
        background-color: var(--color-lemon);
    }

    .clickable-row:last-child td {
        border-bottom: none;
    }

    .td-char {
        font-family: var(--font-display);
        font-size: var(--font-size-5);
        font-weight: 800;
    }

    .td-pinyin {
        color: var(--color-text-muted);
        font-size: var(--font-size-2);
        white-space: nowrap;
    }

    .td-translation {
        font-weight: 700;
    }

    .td-strokes {
        font-variant-numeric: tabular-nums;
        color: var(--color-text-muted);
    }

    .td-components .char-btn {
        font-size: var(--font-size-4);
    }

    .td-components .char-row {
        justify-content: center;
    }

    .play-char-btn {
        background: var(--color-sky);
        border: var(--border);
        border-radius: 0;
        width: var(--size-6);
        height: var(--size-6);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: var(--font-size-2);
        cursor: pointer;
        padding: 0;
        margin: 0 auto;
    }

    .play-char-btn:hover {
        background: var(--color-accent-2);
        transform: translate(-1px, -1px);
        box-shadow: 1px 1px 0 var(--color-border);
    }

</style>
