<script lang="ts">
    import { page } from "$app/state";
    import { onMount } from "svelte";
    import { SvelteMap } from "svelte/reactivity";
    import { splitCharacters, alignPinyin } from "$lib/characters";
    import { speak } from "$lib/audio";
    import {
        getCharData,
        getWordData,
        getCharsData,
        getWordsData,
        getHoverStrokeClass,
        getCachedPinyin,
    } from "$lib/dictionary";
    import type { ZHChar, ZHWord } from "$lib/types";
    import CharacterWriter from "$lib/components/CharacterWriter.svelte";
    import CharacterModal from "$lib/components/CharacterModal.svelte";

    type CharData = ZHChar & {
        phonetic: string | null;
        translation: string | null;
    };

    const wordLiteral = $derived(decodeURIComponent(page.params.word || ""));

    let word = $state<ZHWord | null>(null);
    let charDataMap = new SvelteMap<string, CharData>();
    let modalChar = $state<{ char: string } | null>(null);
    let loading = $state(true);
    let errorMsg = $state("");

    function handleListen() {
        if (!word) return;
        try {
            speak(word.word, "zh");
        } catch {
            // speech not available
        }
    }

    async function load() {
        loading = true;
        errorMsg = "";
        try {
            const wordData = await getWordData(wordLiteral);
            if (!wordData) {
                // If it's not in zh_words, it might just be a character literal
                // that we can still show a breakdown for.
                word = {
                    word: wordLiteral,
                    pinyin: null,
                    translation: null,
                    traditional: null,
                    hsk_level: null,
                    pinyin_search: null
                } as ZHWord;
            } else {
                word = wordData;
            }

            const chars = splitCharacters(word.word);
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
            errorMsg = e instanceof Error ? e.message : "Failed to load word";
        } finally {
            loading = false;
        }
    }

    onMount(() => {
        load();
    });
</script>

<article class="word-detail-page">
    {#if loading}
        <p class="status" aria-live="polite">Loading…</p>
    {:else if errorMsg}
        <p class="error" role="alert">{errorMsg}</p>
    {:else if word}
        <header class="page-header">
            <div class="title-group">
                <a href="/dictionary" class="back-link">← Dictionary</a>
                <h1>{word.word}</h1>
                <p><small>Detailed breakdown and stroke-by-stroke guide for each character.</small></p>
            </div>
            <div class="header-actions">
                <button
                    class="listen-btn"
                    onclick={handleListen}
                    aria-label="Listen to {word.word}"
                >
                    ♪ Listen
                </button>
            </div>
        </header>

        <hgroup class="word-hero">
            <div class="word-character" lang="zh">
                <span class="visually-hidden">
                    {word.word}
                    {#if word.pinyin}
                        ({word.pinyin})
                    {/if}
                </span>
                <div class="hero-animation" aria-hidden="true">
                    {#each alignPinyin(word.word, word.pinyin) as {char, pinyin}, i (i)}
                        <div class="char-unit">
                            {#if pinyin}
                                <span class="char-unit-pinyin">{pinyin}</span>
                            {/if}
                            <CharacterWriter {char} language="zh" colorize={true} />
                        </div>
                    {/each}
                </div>
            </div>

            {#if word.translation}
                <p class="word-translation">
                    {word.translation}
                </p>
            {/if}
            {#if word.hsk_level}
                <p class="word-note">HSK Level {word.hsk_level}</p>
            {/if}
        </hgroup>

        {#if splitCharacters(word.word).length > 0}
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
                            {#each splitCharacters(word.word) as char, i (i)}
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
                                        >{@html data?.translation ?? "-"}</td
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
    .word-detail-page {
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

    .word-hero {
        display: flex;
        flex-direction: column;
        gap: var(--size-2);
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
    }

    .char-unit {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--size-1);
    }

    .char-unit-pinyin {
        font-size: var(--font-size-3);
        color: var(--color-text);
        line-height: 1;
    }

    .word-translation {
        font-size: var(--font-size-5);
        font-weight: 700;
        margin: 0;
        display: flex;
        align-items: center;
        gap: var(--size-2);
    }

    .word-note {
        font-size: var(--font-size-2);
        color: var(--color-text-muted);
        font-style: italic;
        margin: 0;
    }

    .section-label {
        font-size: var(--font-size-0);
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--color-text-muted);
        margin: 0 0 var(--size-3);
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
