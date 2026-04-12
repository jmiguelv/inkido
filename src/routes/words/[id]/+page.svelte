<script lang="ts">
    import { page } from "$app/state";
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import { SvelteMap } from "svelte/reactivity";
    import { supabase } from "$lib/supabase";
    import { getActiveProfile } from "$lib/stores.svelte";
    import { splitCharacters, alignPinyin, numberedToTone } from "$lib/characters";
    import { speak } from "$lib/audio";
    import {
        getCharData,
        getWordData,
        getCharsData,
        getWordsData,
        getHoverStrokeClass,
        getCachedPinyin,
    } from "$lib/dictionary";
    import type { Word, WordList, ZHChar } from "$lib/types";
    import CharacterWriter from "$lib/components/CharacterWriter.svelte";
    import CharacterModal from "$lib/components/CharacterModal.svelte";

    type CharData = ZHChar & {
        phonetic: string | null;
        translation: string | null;
    };

    function stripHtml(s: string | null | undefined): string | null {
        if (!s) return null;
        const stripped = s.replace(/<[^>]*>/g, '').trim();
        return stripped || null;
    }

    const wordId = $derived(page.params.id);
    const activeProfile = $derived(getActiveProfile());

    let word = $state<Word | null>(null);
    let list = $state<WordList | null>(null);
    let charDataMap = new SvelteMap<string, CharData>();
    let modalChar = $state<{ char: string } | null>(null);
    let loading = $state(true);
    let chainIndex = $state(0);
    let saving = $state(false);
    let enriching = $state(false);
    let editing = $state(false);
    let autoLookupRunning = $state(false);
    let errorMsg = $state("");

    let lookupTimer: ReturnType<typeof setTimeout> | null = null;

    let editData = $state({
        character: "",
        pinyin: "",
        translation: "",
        note: "",
    });

    const isBusy = $derived(
        loading || saving || enriching || autoLookupRunning,
    );

    function startEditing() {
        if (!word) return;
        editData = {
            character: word.character,
            pinyin: word.phonetic_annotation ?? "",
            translation: word.translation ?? "",
            note: word.character_note ?? "",
        };
        editing = true;
    }

    $effect(() => {
        const charToLookup = editData.character.trim();
        if (editing && charToLookup && charToLookup !== word?.character) {
            if (lookupTimer) clearTimeout(lookupTimer);
            lookupTimer = setTimeout(async () => {
                autoLookupRunning = true;
                try {
                    const data = await getWordData(charToLookup);

                    if (data) {
                        editData.pinyin = data.pinyin || "";
                        if (data.translation)
                            editData.translation = data.translation;
                    } else if (splitCharacters(charToLookup).length === 1) {
                        const charData = await getCharData(charToLookup);
                        if (charData?.gloss) {
                            editData.translation = charData.gloss;
                        }
                        const pData = await getWordData(charToLookup);
                        if (pData?.pinyin) editData.pinyin = pData.pinyin;
                    } else {
                        const chars = splitCharacters(charToLookup);
                        const charPinyinRows = await getWordsData(chars);
                        if (charPinyinRows.size > 0) {
                            editData.pinyin = chars
                                .map((c) => charPinyinRows.get(c)?.pinyin ?? c)
                                .join(" ");
                            // We do NOT clear translation here to avoid losing data while typing phrases
                        }
                    }
                } finally {
                    autoLookupRunning = false;
                }
            }, 600);
        }
    });

    async function handleSave() {
        if (!word) return;
        if (!editData.character.trim()) {
            errorMsg = "Character cannot be empty";
            return;
        }
        saving = true;
        errorMsg = "";
        try {
            const { error } = await supabase
                .from("words")
                .update({
                    character: editData.character.trim(),
                    phonetic_annotation: editData.pinyin || null,
                    translation: editData.translation || null,
                    character_note: editData.note || null,
                    is_llm_pinyin: false, // manual edit resets flag
                    is_llm_translation: false,
                })
                .eq("id", word.id);
            if (error) throw error;
            editing = false;
            await load();
        } catch (e) {
            errorMsg =
                e instanceof Error ? e.message : "Failed to save changes";
        } finally {
            saving = false;
        }
    }

    async function handleEnrich() {
        if (!word || !list) return;
        enriching = true;
        errorMsg = "";
        try {
            const res = await supabase.functions.invoke("enrich-words", {
                body: {
                    phrases: [editData.character.trim()],
                    language: list.language,
                },
            });
            if (res.error) throw res.error;
            const { results } = res.data as {
                results: {
                    pinyin: string;
                    translation: string;
                    example?: string;
                    example_phonetic?: string;
                    example_translation?: string;
                }[];
            };
            if (results?.[0]) {
                const r = results[0];
                editData.pinyin = numberedToTone(stripHtml(r.pinyin) ?? r.pinyin);
                editData.translation = stripHtml(r.translation) ?? r.translation;
                // Persist example fields directly — no manual edit UI for these
                if (r.example !== undefined || r.example_translation !== undefined) {
                    await supabase.from('words').update({
                        example: stripHtml(r.example),
                        example_phonetic: r.example_phonetic ? numberedToTone(stripHtml(r.example_phonetic) ?? r.example_phonetic) : null,
                        example_translation: stripHtml(r.example_translation),
                        is_llm_translation: true,
                    }).eq('id', word.id);
                }
            }
        } catch (e) {
            errorMsg = e instanceof Error ? e.message : "AI enrichment failed";
        } finally {
            enriching = false;
        }
    }

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
        chainIndex = 0;
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
        if (!activeProfile) {
            goto("/profiles");
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
            <div class="title-group">
                <a href="/spellings/{list.id}" class="back-link">← {list.name}</a>
                <h1>{word.character}</h1>
                <p><small>Detailed breakdown and stroke-by-stroke guide for each character.</small></p>
            </div>
            <div class="header-actions">
                {#if editing}
                    <button
                        class="cancel-btn"
                        onclick={() => (editing = false)}
                        disabled={isBusy}
                    >
                        Cancel
                    </button>
                    <button
                        class="save-btn"
                        onclick={handleSave}
                        disabled={isBusy}
                    >
                        {saving ? "Saving…" : "Save"}
                    </button>
                {:else}
                    <button
                        class="listen-btn"
                        onclick={handleListen}
                        aria-label="Listen to {word.character}"
                    >
                        ♪ Listen
                    </button>
                    <button
                        class="edit-btn"
                        onclick={startEditing}
                        disabled={isBusy}
                    >
                        Edit
                    </button>
                {/if}
            </div>
        </header>

        <hgroup class="word-hero">
            {#if editing}
                <div class="edit-field">
                    <label for="edit-character">Character</label>
                    <input
                        id="edit-character"
                        type="text"
                        bind:value={editData.character}
                        disabled={isBusy}
                    />
                </div>
                <div class="edit-field">
                    <label for="edit-pinyin">Pinyin</label>
                    <div class="input-with-action">
                        <input
                            id="edit-pinyin"
                            type="text"
                            bind:value={editData.pinyin}
                            disabled={isBusy}
                        />
                        <button
                            class="enrich-btn"
                            onclick={handleEnrich}
                            disabled={isBusy}
                            title="Ask AI to enrich">✨ AI</button
                        >
                    </div>
                </div>
            {/if}

            <div class="word-character" lang={list.language}>
                <span class="visually-hidden">
                    {word.character}
                    {#if word.phonetic_annotation}
                        ({word.phonetic_annotation})
                    {/if}
                </span>
                <div class="hero-animation" aria-hidden="true">
                    {#each alignPinyin(word.character, word.phonetic_annotation) as {char, pinyin}, i (i)}
                        <div class="char-unit">
                            {#if pinyin}
                                <span class="char-unit-pinyin">{pinyin}</span>
                            {/if}
                            <CharacterWriter
                                {char}
                                language={list.language}
                                colorize={true}
                                autoplay={i <= chainIndex}
                                onAnimationDone={() => setTimeout(() => { chainIndex = i + 1 }, 400)}
                            />
                        </div>
                    {/each}
                </div>
            </div>

            {#if editing}
                <div class="edit-field">
                    <label for="edit-translation">Meaning</label>
                    <div class="input-with-action">
                        <input
                            id="edit-translation"
                            type="text"
                            bind:value={editData.translation}
                            disabled={isBusy}
                        />
                        <button
                            class="enrich-btn"
                            onclick={handleEnrich}
                            disabled={isBusy}
                            title="Ask AI to enrich">✨ AI</button
                        >
                    </div>
                </div>
                <div class="edit-field">
                    <label for="edit-note">Personal Note</label>
                    <textarea
                        id="edit-note"
                        bind:value={editData.note}
                        disabled={isBusy}
                        rows="3"
                    ></textarea>
                </div>
            {:else}
                {#if word.translation}
                    <p class="word-translation">
                        {@html word.translation}
                        {#if word.is_llm_translation}<span
                                class="llm-badge"
                                title="Generated by AI"
                                aria-label="Generated by AI">&#10022;</span
                            >{/if}
                    </p>
                {/if}
                {#if word.character_note}
                    <p class="word-note">{@html word.character_note}</p>
                {/if}
            {/if}
        </hgroup>

        {#if word.example}
            <section class="section-card example-section">
                <h2 class="section-label">Example</h2>
                <p class="example-text" lang={list.language}>{@html word.example}</p>
                {#if word.example_phonetic}
                    <p class="example-phonetic">{word.example_phonetic}</p>
                {/if}
                {#if word.example_translation}
                    <p class="example-translation">
                        {@html word.example_translation}
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
                                <th>Character</th>
                                <th>Listen</th>
                                <th>Pinyin</th>
                                <th>Meaning</th>
                                <th>Strokes</th>
                                <th>Made of</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each alignPinyin(word.character, word.phonetic_annotation) as {char, pinyin}, i (i)}
                                {@const data = charDataMap.get(char)}
                                <tr
                                    onclick={() => (modalChar = { char })}
                                    class="clickable-row"
                                    role="button"
                                    tabindex="0"
                                    aria-label="Details for {char}"
                                >
                                    <td class="td-char" lang={list.language}
                                        >{char}</td
                                    >
                                    <td>
                                        <button
                                            class="play-char-btn"
                                            onclick={(e) => {
                                                e.stopPropagation();
                                                speak(
                                                    char,
                                                    list?.language ?? "zh",
                                                );
                                            }}
                                            aria-label="Listen to {char}"
                                        >
                                            ♪
                                        </button>
                                    </td>
                                    <td class="td-pinyin"
                                        >{pinyin ?? data?.phonetic ?? "-"}</td
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
                                                    </button>                                                {/each}
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

    .edit-btn,
    .cancel-btn,
    .save-btn {
        padding: var(--size-2) var(--size-4);
        border: var(--border);
        font-size: var(--font-size-1);
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        background: var(--color-surface);
        box-shadow: var(--shadow-sm);
    }

    .save-btn {
        background: var(--color-mint);
    }

    .cancel-btn {
        opacity: 0.7;
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

    .edit-field {
        display: flex;
        flex-direction: column;
        gap: var(--size-1);
        max-width: 500px;
    }

    .edit-field label {
        font-size: var(--font-size-0);
        font-weight: 700;
        text-transform: uppercase;
        color: var(--color-text-muted);
    }

    .input-with-action {
        display: flex;
        gap: var(--size-2);
    }

    .input-with-action input {
        flex: 1;
    }

    .enrich-btn {
        background: var(--color-surface);
        border: var(--border);
        font-weight: 700;
        padding: 0 var(--size-3);
        box-shadow: var(--shadow-sm);
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
