<script lang="ts">
    import { supabase } from "$lib/supabase";
    import { goto } from "$app/navigation";
    import { getActiveProfile } from "$lib/stores.svelte";
    import { onMount } from "svelte";
    import { splitCharacters, stripDiacritics } from "$lib/characters";
    import CharacterModal from "$lib/components/CharacterModal.svelte";
    import type { Word, WordList } from "$lib/types";

    type WordEntry = Word & { listName: string; language: string };

    const activeProfile = $derived(getActiveProfile());

    let words = $state<WordEntry[]>([]);
    let loading = $state(true);
    let query = $state("");
    let modalChar = $state<{ char: string; language: string } | null>(null);

    const filtered = $derived(
        query.trim()
            ? words.filter((w) => {
                  const q = stripDiacritics(query);
                  return (
                      w.character.includes(query) ||
                      stripDiacritics(w.phonetic_annotation ?? "").includes(
                          q,
                      ) ||
                      stripDiacritics(w.translation ?? "").includes(q)
                  );
              })
            : words,
    );

    async function loadWords() {
        if (!activeProfile) return;
        loading = true;
        try {
            const { data: lists, error: listsError } = await supabase
                .from("word_lists")
                .select("id, name, language")
                .eq("profile_id", activeProfile.id);
            if (listsError) throw listsError;

            const listMap = new Map<string, WordList>(
                lists?.map((l) => [l.id, l as WordList]) ?? [],
            );
            const listIds = [...listMap.keys()];

            if (!listIds.length) {
                words = [];
                return;
            }

            const { data, error } = await supabase
                .from("words")
                .select("*")
                .in("list_id", listIds);
            if (error) throw error;

            words = (data as Word[])
                .map((w) => ({
                    ...w,
                    listName: listMap.get(w.list_id)?.name ?? "",
                    language: listMap.get(w.list_id)?.language ?? "zh",
                }))
                .sort((a, b) => {
                    const pA =
                        stripDiacritics(a.phonetic_annotation ?? "").trim() ||
                        a.character;
                    const pB =
                        stripDiacritics(b.phonetic_annotation ?? "").trim() ||
                        b.character;
                    return pA.localeCompare(pB, "en", { sensitivity: "base" });
                });
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
            loadWords();
        }
    });
</script>

<section>
    <hgroup class="page-header">
        <div class="title-group">
            <h1>My Words</h1>
            <p>
                <small
                    >Review and search every word across all your practice
                    sets.</small
                >
            </p>
        </div>
        {#if !loading}
            <span class="word-count">
                {filtered.length}{query.trim() ? ` of ${words.length}` : ""} word{words.length ===
                1
                    ? ""
                    : "s"}
            </span>
        {/if}
    </hgroup>

    <div class="search-bar">
        <label for="search" class="visually-hidden">Search words</label>
        <input
            id="search"
            type="search"
            bind:value={query}
            placeholder="Search by character, pinyin or meaning…"
            autocomplete="off"
            spellcheck="false"
        />
    </div>

    {#if loading}
        <p class="state-msg" aria-live="polite">Loading…</p>
    {:else if words.length === 0}
        <p class="state-msg">
            No words yet. Add some from a <a href="/lists">set</a>.
        </p>
    {:else if filtered.length === 0}
        <p class="state-msg">No words match <strong>{query}</strong>.</p>
    {:else}
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th scope="col">Word/Sentence</th>
                        <th scope="col">Pinyin</th>
                        <th scope="col">Meaning</th>
                        <th scope="col">Spelling</th>
                        <th scope="col"
                            ><span class="visually-hidden">Detail</span></th
                        >
                    </tr>
                </thead>
                <tbody>
                    {#each filtered as word (word.id)}
                        <tr>
                            <td class="col-char">
                                <div class="char-row">
                                    {#each splitCharacters(word.character) as char, i (i)}
                                        {@const pinyinParts = word.phonetic_annotation?.trim().split(/\s+/) ?? []}
                                        <button
                                            class="char-btn"
                                            lang={word.language}
                                            onclick={() =>
                                                (modalChar = {
                                                    char,
                                                    language: word.language,
                                                })}
                                            aria-label="Details for {char}"
                                            title={pinyinParts[i] ?? undefined}
                                            >{char}</button
                                        >
                                    {/each}
                                </div>
                            </td>
                            <td class="col-phonetic" lang={word.language}
                                >{word.phonetic_annotation ?? "—"}</td
                            >
                            <td class="col-translation"
                                >{word.translation ?? "—"}</td
                            >
                            <td class="col-list">
                                <a
                                    href="/lists/{word.list_id}"
                                    class="list-badge">{word.listName}</a
                                >
                            </td>
                            <td class="col-detail">
                                <a
                                    href="/words/{word.id}"
                                    class="detail-link"
                                    aria-label="Full details for {word.character}"
                                    >→</a
                                >
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {/if}
</section>

{#if modalChar}
    <CharacterModal
        character={modalChar.char}
        language={modalChar.language}
        onclose={() => (modalChar = null)}
    />
{/if}

<style>
    .word-count {
        font-size: var(--font-size-1);
        color: var(--color-text-muted);
    }

    .search-bar {
        margin-bottom: var(--size-5);
    }

    input[type="search"] {
        width: 100%;
        max-width: 480px;
        padding: var(--size-2) var(--size-4);
        border-radius: 0;
        font-size: var(--font-size-2);
    }

    .state-msg {
        color: var(--color-text-muted);
        font-size: var(--font-size-2);
    }

    .table-wrapper {
        width: 100%;
        overflow-x: auto;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        background: var(--color-surface);
        border: var(--border);
        box-shadow: var(--shadow-sm);
        text-align: left;
    }

    thead th {
        padding: var(--size-3) var(--size-4);
        border-bottom: var(--border);
        font-size: var(--font-size-1);
        font-weight: 700;
        font-family: var(--font-body);
        color: var(--color-text);
        text-transform: uppercase;
        letter-spacing: 0.06em;
        background: var(--color-sky);
    }

    tbody tr {
        border-bottom: 1px solid var(--color-border);
        transition: background var(--transition-speed);
    }

    tbody tr:hover {
        background: var(--color-lemon);
    }

    tbody tr:last-child {
        border-bottom: none;
    }

    tbody td {
      padding: var(--size-3) var(--size-4);
      vertical-align: middle;
    }

    .col-phonetic {        color: var(--color-text-muted);
        font-size: var(--font-size-2);
        word-break: break-word;
    }

    .col-translation {
        font-size: var(--font-size-2);
        font-weight: 700;
    }

    .list-badge {
        display: inline-block;
        padding: var(--size-1) var(--size-2);
        border: var(--border);
        border-radius: 0;
        font-size: var(--font-size-0);
        font-weight: 700;
        color: var(--color-text);
        text-decoration: none;
        white-space: nowrap;
        transition:
            transform var(--transition-speed) ease,
            box-shadow var(--transition-speed) ease,
            background var(--transition-speed);
        box-shadow: 2px 2px 0 var(--color-border);
    }

    .list-badge:hover {
        background: var(--color-lemon);
        transform: translate(-1px, -1px);
        box-shadow: 2px 2px 0 var(--color-border);
        text-decoration: none;
    }

    .col-detail {
        width: 2rem;
        text-align: center;
    }

    .detail-link {
        font-size: var(--font-size-3);
        font-weight: 700;
        color: var(--color-text-muted);
        text-decoration: none;
    }

    .detail-link:hover {
        color: var(--color-text);
    }
</style>
