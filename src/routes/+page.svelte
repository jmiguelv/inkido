<script lang="ts">
  import { supabase } from '$lib/supabase.ts'
  import { goto } from '$app/navigation'
  import { setActiveChild, getActiveChild } from '$lib/stores.svelte.ts'
  import type { ChildProfile } from '$lib/types.ts'

  let children = $state<ChildProfile[]>([])
  let newChildName = $state('')
  let errorMsg = $state('')
  let loading = $state(false)

  const activeChild = $derived(getActiveChild())

  async function loadChildren() {
    const { data, error } = await supabase.from('child_profiles').select('*').order('created_at')
    if (error) throw error
    children = data as ChildProfile[]
  }

  async function handleAddChild() {
    if (!newChildName.trim()) return
    errorMsg = ''
    loading = true
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase.from('child_profiles').insert({ name: newChildName.trim(), parent_id: user.id })
      if (error) throw error
      newChildName = ''
      await loadChildren()
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : 'Failed to add child'
    } finally {
      loading = false
    }
  }

  async function handleDeleteChild(id: string) {
    const { error } = await supabase.from('child_profiles').delete().eq('id', id)
    if (error) throw error
    if (activeChild?.id === id) setActiveChild(children.find(c => c.id !== id) ?? null as unknown as ChildProfile)
    await loadChildren()
  }

  function handleSelectChild(child: ChildProfile) {
    setActiveChild(child)
    goto('/lists')
  }

  $effect(() => {
    loadChildren()
  })
</script>

<section>
  <h1>Dashboard</h1>

  <h2>Children</h2>

  {#if children.length === 0}
    <p>No children yet. Add one below.</p>
  {:else}
    <ul class="child-list">
      {#each children as child (child.id)}
        <li>
          <article class="child-card" class:active={activeChild?.id === child.id}>
            <span class="child-name">{child.name}</span>
            <div class="child-actions">
              <button onclick={() => handleSelectChild(child)}>Select</button>
              <button class="danger" onclick={() => handleDeleteChild(child.id)} aria-label="Delete {child.name}">Delete</button>
            </div>
          </article>
        </li>
      {/each}
    </ul>
  {/if}

  <form onsubmit={(e) => { e.preventDefault(); handleAddChild() }} class="add-child-form">
    <h3>Add a child</h3>
    <div class="field">
      <label for="child-name">Name</label>
      <input id="child-name" type="text" bind:value={newChildName} required placeholder="e.g. Alice" />
    </div>
    {#if errorMsg}
      <output role="alert" class="error">{errorMsg}</output>
    {/if}
    <button type="submit" disabled={loading}>
      {loading ? 'Adding…' : 'Add child'}
    </button>
  </form>
</section>

<style>
  h1 {
    font-size: var(--font-size-8);
    margin: 0 0 var(--size-6);
  }

  h2 {
    font-size: var(--font-size-5);
    margin: 0 0 var(--size-4);
  }

  .child-list {
    list-style: none;
    padding: 0;
    margin: 0 0 var(--size-6);
    display: grid;
    gap: var(--size-3);
  }

  @media (min-width: 600px) {
    .child-list { grid-template-columns: repeat(2, 1fr); }
  }

  @media (min-width: 900px) {
    .child-list { grid-template-columns: repeat(3, 1fr); }
  }

  .child-card {
    background: var(--color-surface);
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--radius);
    padding: var(--size-4);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--size-3);
    transition: border-color var(--transition-speed);
  }

  .child-card.active {
    border-color: var(--color-accent);
  }

  .child-name {
    font-weight: var(--font-weight-6);
    font-size: var(--font-size-3);
  }

  .child-actions {
    display: flex;
    gap: var(--size-2);
  }

  .child-actions button {
    padding: var(--size-1) var(--size-3);
    border-radius: var(--radius);
    font-size: var(--font-size-1);
    border: var(--border-width) solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text);
    transition: all var(--transition-speed);
  }

  .child-actions button:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }

  .child-actions button.danger:hover {
    border-color: var(--color-danger);
    color: var(--color-danger);
  }

  .add-child-form {
    background: var(--color-surface);
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--radius);
    padding: var(--size-6);
    max-width: 400px;
  }

  h3 {
    margin: 0 0 var(--size-4);
    font-size: var(--font-size-4);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--size-1);
    margin-bottom: var(--size-4);
  }

  label {
    font-size: var(--font-size-1);
    font-weight: var(--font-weight-6);
  }

  input {
    padding: var(--size-2) var(--size-3);
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--radius);
    font-size: var(--font-size-2);
  }

  input:focus {
    outline: 2px solid var(--color-accent);
    outline-offset: 1px;
    border-color: var(--color-accent);
  }

  .error {
    display: block;
    color: var(--color-danger);
    font-size: var(--font-size-1);
    margin-bottom: var(--size-3);
  }

  button[type="submit"] {
    padding: var(--size-2) var(--size-5);
    background: var(--color-accent);
    color: var(--color-accent-fg);
    border: none;
    border-radius: var(--radius);
    font-size: var(--font-size-2);
    font-weight: var(--font-weight-6);
  }

  button[type="submit"]:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
