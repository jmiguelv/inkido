<script lang="ts">
    import "../app.css";
    import { supabase } from "$lib/supabase.ts";
    import { goto } from "$app/navigation";
    import { page } from "$app/state";
    import {
        initActiveProfile,
        getActiveProfile,
        clearActiveProfile,
    } from "$lib/stores.svelte.ts";
    import { onMount } from "svelte";

    const PUBLIC_ROUTES = [
        "/auth/login",
        "/auth/signup",
        "/auth/confirm",
        "/auth/callback",
        "/auth/reset",
    ];

    let { children } = $props();

    let session =
        $state<
            Awaited<
                ReturnType<typeof supabase.auth.getSession>
            >["data"]["session"]
        >(null);

    onMount(() => {
        initActiveProfile();

        supabase.auth.getSession().then(({ data }) => {
            session = data.session;
            if (!session && !PUBLIC_ROUTES.includes(page.url.pathname)) {
                goto("/auth/login");
            }
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, newSession) => {
            session = newSession;
            if (!session && !PUBLIC_ROUTES.includes(page.url.pathname)) {
                goto("/auth/login");
            }
        });

        return () => subscription.unsubscribe();
    });

    async function handleLogout() {
        clearActiveProfile();
        await supabase.auth.signOut();
        goto("/auth/login");
    }

    const activeProfile = $derived(getActiveProfile());
    const isPublicRoute = $derived(PUBLIC_ROUTES.includes(page.url.pathname));
</script>

{#if isPublicRoute}
    {@render children()}
{:else if session}
    <header>
        <nav>
            <a href="/" class="brand">InkiDo</a>
            <div class="nav-right">
                {#if activeProfile}
                    <span class="active-profile">{activeProfile.name}</span>
                {/if}
                <a href="/lists">Lists</a>
                <a href="/words">Dictionary</a>
                <a href="/characters">Characters</a>
                <a href="/settings">Settings</a>
                <button onclick={handleLogout}>Log out</button>
            </div>
        </nav>
    </header>
    <main>
        {@render children()}
    </main>
{/if}

<style>
    header {
        background-color: var(--color-lemon);
        border-bottom: var(--border);
        box-shadow: 0 3px 0 var(--color-border);
    }

    nav {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--size-3) var(--size-4);
        max-width: 1200px;
        margin: 0 auto;
    }

    .brand {
        font-family: var(--font-display);
        font-weight: 800;
        font-size: var(--font-size-5);
        text-decoration: none;
        color: var(--color-text);
        text-transform: uppercase;
        letter-spacing: 0.06em;
    }

    .nav-right {
        display: flex;
        align-items: center;
        gap: var(--size-4);
    }

    .active-profile {
        font-weight: 700;
        color: var(--color-text);
        font-size: var(--font-size-1);
        background: var(--color-surface);
        padding: var(--size-1) var(--size-2);
        border: var(--border);
        border-radius: 0;
    }

    nav a {
        text-decoration: none;
        color: var(--color-text);
        font-size: var(--font-size-1);
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
    }

    nav a:hover {
        text-decoration: underline;
        text-underline-offset: 3px;
        text-decoration-thickness: 3px;
    }

    nav button {
        background: var(--color-surface);
        border: var(--border);
        border-radius: 0;
        padding: var(--size-1) var(--size-3);
        font-size: var(--font-size-1);
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--color-text);
        box-shadow: var(--shadow-sm);
    }

    nav button:hover:not(:disabled) {
        transform: translate(-2px, -2px);
        box-shadow: 2px 2px 0 var(--color-border);
    }

    nav button:active:not(:disabled) {
        transform: translate(0, 0);
        box-shadow: none;
    }

    main {
        max-width: 1200px;
        margin: 0 auto;
        padding: var(--size-8) var(--size-4);
    }
</style>
