<script lang="ts">
    import { page } from "$app/state";
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import { SvelteMap } from "svelte/reactivity";
    import { supabase } from "$lib/supabase";
    import { getActiveProfile } from "$lib/stores.svelte";
    import { splitCharacters } from "$lib/characters";
    import { speak } from "$lib/audio";
    import type { Word, WordList } from "$lib/types";
    import CharacterWriter from "$lib/components/CharacterWriter.svelte";
    import CharacterModal from "$lib/components/CharacterModal.svelte";

    type CharData = {
        phonetic: string | null;
        translation: string | null;
        note: string | null;
        hint: string | null;
        components: { character: string }[] | null;
        trad_variant: string | null;
        stroke_count: number | null;
    };

    const wordId = $derived(page.params.id);
    const activeProfile = $derived(getActiveProfile());

    let word = $state<Word | null>(null);
    let list = $state<WordList | null>(null);
    let charDataMap = new SvelteMap<string, CharData>();
    let modalChar = $state<{ char: string } | null>(null);
    let loading = $state(true);
    let errorMsg = $state("");

    function handleListen() {
        if (!word || !list) return;
        try {
            speak(word.character, list.language);
        } catch {
            // speech not available
        }
    }

    async function load() {
        loading = true;
        errorMsg = "";
        try {
            const { data: wordData, error: wordErr } = await supabase
                .from("words")
                .select("*")
                .eq("id", wordId)
                .single();
            if (wordErr) throw wordErr;
            word = wordData as Word;

            const { data: listData, error: listErr } = await supabase
                .from("word_lists")
                .select("*")
                .eq("id", word.list_id)
                .single();
            if (listErr) throw listErr;
            list = listData as WordList;

            const chars = splitCharacters(word.character);
            if (chars.length > 0) {
                const [{ data: charRows }, { data: wordRows }] =
                    await Promise.all([
                        supabase
                            .from("zh_chars")
                            .select(
                                "char, gloss, hint, components, trad_variant, stroke_count",
                            )
                            .in("char", chars),
                        supabase
                            .from("zh_words")
                            .select("word, pinyin, translation")
                            .in("word", chars),
                    ]);

                const charMap = new Map(
                    charRows?.map((r) => [r.char, r]) ?? [],
                );
                const wMap = new Map(wordRows?.map((r) => [r.word, r]) ?? []);

                for (const char of chars) {
                    const c = charMap.get(char);
                    const w = wMap.get(char);
                    charDataMap.set(char, {
                        phonetic: w?.pinyin ?? null,
                        translation: w?.translation ?? null,
                        note: c?.gloss ?? null,
                        hint: c?.hint ?? null,
                        components: c?.components ?? null,
                        trad_variant: c?.trad_variant ?? null,
                        stroke_count: c?.stroke_count ?? null,
                    });
                }
            }
        } catch (e) {
            errorMsg = e instanceof Error ? e.message : "Failed to load word";
        } finally {
            loading = false;
        }
    }

    onMount(() => {
        if (!activeProfile) {
            goto("/");
            return;
        }
    });

    $effect(() => {
        if (activeProfile?.id) {
            load();
        }
    });
</script>

<article class="word-detail-page">
    {#if loading}
        <p class="status" aria-live="polite">Loading…</p>
    {:else if errorMsg}
        <p class="error" role="alert">{errorMsg}</p>
    {:else if word && list}
        <header class="page-header">
            <nav>
                <a href="/lists/{list.id}" class="back-link">← {list.name}</a>
            </nav>
            <button
                class="listen-btn"
                onclick={handleListen}
                aria-label="Listen to {word.character}"
            >
                ♪ Listen
            </button>
        </header>

        <hgroup class="word-hero">
            <h1 class="word-character" lang={list.language}>
                <span class="visually-hidden">
                    {word.character}
                    {#if word.phonetic_annotation}
                        ({word.phonetic_annotation})
                    {/if}
                </span>
                <div class="hero-animation" aria-hidden="true">
                    {#each splitCharacters(word.character) as char, i (i)}
                        {@const pinyinParts =
                            word.phonetic_annotation?.split(/\s+/) ?? []}
                        {@const syllable =
                            pinyinParts.length ===
                            splitCharacters(word.character).length
                                ? pinyinParts[i]
                                : null}
                        <div class="char-unit">
                            {#if syllable}
                                <span class="char-unit-pinyin">{syllable}</span>
                            {/if}
                            <CharacterWriter
                                {char}
                                language={list.language}
                            />
                        </div>
                    {/each}
                </div>
            </h1>
            {#if word.translation}
                <p class="word-translation">
                    {word.translation}
                    {#if word.is_llm_translation}<span
                            class="llm-badge"
                            title="Generated by AI">✨</span
                        >{/if}
                </p>
            {/if}
        </hgroup>

        {#if word.example}
            <section class="section-card example-section">
                <h2 class="section-label">Example</h2>
                <p class="example-text" lang={list.language}>{word.example}</p>
                {#if word.example_phonetic}
                    <p class="example-phonetic">{word.example_phonetic}</p>
                {/if}
                {#if word.example_translation}
                    <p class="example-translation">
                        {word.example_translation}
                    </p>
                {/if}
            </section>
        {/if}

        {#if splitCharacters(word.character).length > 0}
            <section class="chars-section">
                <h2 class="section-label">Characters</h2>
                <div class="table-wrapper">
                    <table class="char-table">
                        <thead>
                            <tr>
                                <th>Char</th>
                                <th>Pinyin</th>
                                <th>Meaning</th>
                                <th>Strokes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each splitCharacters(word.character) as char, i (i)}
                                {@const data = charDataMap.get(char)}
                                <tr onclick={() => modalChar = { char }} class="clickable-row" role="button" tabindex="0" aria-label="Details for {char}">
                                    <td class="td-char" lang={list.language}>{char}</td>
                                    <td class="td-pinyin">{data?.phonetic ?? '-'}</td>
                                    <td class="td-translation">{data?.translation ?? '-'}</td>
                                    <td class="td-strokes">{data?.stroke_count ?? '-'}</td>
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
            language={list?.language ?? "zh"}
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

    .page-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--size-4);
        margin-bottom: var(--size-6);
        flex-wrap: wrap;
    }

    .back-link {
        font-size: var(--font-size-1);
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        text-decoration: none;
        color: var(--color-text-muted);
    }

    .back-link:hover {
        color: var(--color-text);
    }

    .listen-btn {
        padding: var(--size-2) var(--size-5);
        border: var(--border);
        border-radius: 0;
        font-size: var(--font-size-2);
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        background: var(--color-sky);
        color: var(--color-text);
        box-shadow: var(--shadow-sm);
        cursor: pointer;
    }

    .listen-btn:hover {
        transform: translate(-2px, -2px);
        box-shadow: 2px 2px 0 var(--color-border);
    }

    .listen-btn:active {
        transform: translate(0, 0);
        box-shadow: none;
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

    .llm-badge {
        font-size: 0.7em;
        cursor: help;
    }

    .word-translation {
        font-size: var(--font-size-5);
        font-weight: 700;
        margin: 0;
        display: flex;
        align-items: center;
        gap: var(--size-2);
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

    .example-text {
        font-size: var(--font-size-4);
        margin: 0 0 var(--size-2);
        font-family: var(--font-display);
    }

    .example-phonetic {
        font-size: var(--font-size-1);
        color: var(--color-text-muted);
        margin: 0 0 var(--size-1);
    }

    .example-translation {
        font-size: var(--font-size-2);
        font-weight: 700;
        margin: 0;
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
        text-align: left;
    }

    .char-table th,
    .char-table td {
        padding: var(--size-3) var(--size-4);
        border-bottom: 1px solid var(--color-border);
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
</style>
