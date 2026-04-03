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
        background-color: var(--color-surface);
        border-bottom: var(--border-width) solid var(--color-border);
        box-shadow: var(--shadow);
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
        font-weight: var(--font-weight-7);
        font-size: var(--font-size-4);
        text-decoration: none;
        color: var(--color-accent);
    }

    .nav-right {
        display: flex;
        align-items: center;
        gap: var(--size-4);
    }

    .active-profile {
        font-weight: var(--font-weight-6);
        color: var(--color-text-muted);
        font-size: var(--font-size-1);
        background: var(--color-bg);
        padding: var(--size-1) var(--size-2);
        border-radius: var(--radius);
    }

    nav a {
        text-decoration: none;
        color: var(--color-text);
        font-size: var(--font-size-1);
    }

    nav a:hover {
        color: var(--color-accent);
    }

    nav button {
        background: none;
        border: var(--border-width) solid var(--color-border);
        border-radius: var(--radius);
        padding: var(--size-1) var(--size-3);
        font-size: var(--font-size-1);
        color: var(--color-text);
        transition: border-color var(--transition-speed);
    }

    nav button:hover {
        border-color: var(--color-accent);
        color: var(--color-accent);
    }

    main {
        max-width: 1200px;
        margin: 0 auto;
        padding: var(--size-6) var(--size-4);
    }
</style>
