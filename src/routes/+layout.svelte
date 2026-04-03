<script lang="ts">
    import "../app.css";
    import { supabase } from "$lib/supabase.ts";
    import { goto } from "$app/navigation";
    import { page } from "$app/state";
    import {
        initActiveProfile,
        getActiveProfile,
        setActiveProfile,
        clearActiveProfile,
    } from "$lib/stores.svelte.ts";
    import { onMount } from "svelte";
    import type { Profile } from "$lib/types.ts";

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

    let profiles = $state<Profile[]>([]);
    let dropdownOpen = $state(false);

    async function loadProfiles() {
        const { data } = await supabase
            .from("profiles")
            .select("*")
            .order("created_at");
        profiles = (data ?? []) as Profile[];
    }

    onMount(() => {
        initActiveProfile();

        supabase.auth.getSession().then(({ data }) => {
            session = data.session;
            if (!session && !PUBLIC_ROUTES.includes(page.url.pathname)) {
                goto("/auth/login");
            } else if (session) {
                loadProfiles();
            }
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, newSession) => {
            session = newSession;
            if (!session && !PUBLIC_ROUTES.includes(page.url.pathname)) {
                goto("/auth/login");
            } else if (newSession) {
                loadProfiles();
            }
        });

        return () => subscription.unsubscribe();
    });

    $effect(() => {
        if (!dropdownOpen) return;
        function close(e: MouseEvent) {
            const el = document.querySelector(".profile-dropdown");
            if (el && !el.contains(e.target as Node)) dropdownOpen = false;
        }
        document.addEventListener("click", close);
        return () => document.removeEventListener("click", close);
    });

    async function handleLogout() {
        clearActiveProfile();
        await supabase.auth.signOut();
        goto("/auth/login");
    }

    function switchProfile(profile: Profile) {
        setActiveProfile(profile);
        dropdownOpen = false;
        goto("/lists");
    }

    function handleDropdownKeydown(e: KeyboardEvent) {
        if (e.key === "Escape") dropdownOpen = false;
    }

    const activeProfile = $derived(getActiveProfile());
    const isPublicRoute = $derived(PUBLIC_ROUTES.includes(page.url.pathname));
    const activeSection = $derived(
        page.url.pathname.startsWith("/lists")
            ? "lists"
            : page.url.pathname.startsWith("/words")
              ? "words"
              : page.url.pathname.startsWith("/characters")
                ? "characters"
                : page.url.pathname.startsWith("/settings")
                  ? "settings"
                  : "",
    );
</script>

{#if isPublicRoute}
    {@render children()}
{:else if session}
    <header>
        <nav>
            <a href="/" class="brand">
                <span class="brand-name">Inkido</span>
            </a>
            <div class="nav-right">
                <a href="/lists" class:active={activeSection === "lists"}>Lists</a>
                <a href="/words" class:active={activeSection === "words"}>My Words</a>
                <a href="/characters" class:active={activeSection === "characters"}>Explore</a>
                <a href="/settings" class:active={activeSection === "settings"}>Settings</a>
                {#if activeProfile}
                    <div class="profile-dropdown">
                        <button
                            class="profile-trigger"
                            onclick={() => (dropdownOpen = !dropdownOpen)}
                            onkeydown={handleDropdownKeydown}
                            aria-haspopup="listbox"
                            aria-expanded={dropdownOpen}
                        >
                            {activeProfile.name} ▾
                        </button>
                        {#if dropdownOpen}
                            <ul class="profile-menu" role="listbox">
                                {#each profiles as profile (profile.id)}
                                    <li>
                                        <button
                                            class="profile-option"
                                            class:current={profile.id === activeProfile.id}
                                            role="option"
                                            aria-selected={profile.id === activeProfile.id}
                                            onclick={() => switchProfile(profile)}
                                        >
                                            {profile.name}
                                        </button>
                                    </li>
                                {/each}
                                <li class="menu-divider"></li>
                                <li>
                                    <a
                                        href="/"
                                        class="profile-manage"
                                        onclick={() => (dropdownOpen = false)}
                                    >
                                        Manage profiles
                                    </a>
                                </li>
                            </ul>
                        {/if}
                    </div>
                {/if}
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
        text-decoration: none;
    }

    .brand-name {
        font-family: var(--font-display);
        font-weight: 800;
        font-size: var(--font-size-5);
        color: var(--color-text);
        text-transform: uppercase;
        letter-spacing: 0.06em;
        line-height: 1;
    }

    .nav-right {
        display: flex;
        align-items: center;
        gap: var(--size-4);
    }

    nav a {
        text-decoration: none;
        color: var(--color-text);
        font-size: var(--font-size-1);
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
    }

    nav a:not(.brand):not(.profile-manage):hover {
        text-decoration: underline;
        text-underline-offset: 3px;
        text-decoration-thickness: 3px;
    }

    nav a.active {
        text-decoration: underline;
        text-underline-offset: 4px;
        text-decoration-thickness: 3px;
        background: var(--color-text);
        color: var(--color-lemon);
        padding: var(--size-1) var(--size-2);
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

    /* Profile dropdown */
    .profile-dropdown {
        position: relative;
    }

    .profile-trigger {
        white-space: nowrap;
    }

    .profile-menu {
        position: absolute;
        right: 0;
        top: calc(100% + var(--size-2));
        background: var(--color-surface);
        border: var(--border);
        box-shadow: var(--shadow);
        list-style: none;
        padding: var(--size-1) 0;
        margin: 0;
        min-width: 160px;
        z-index: 100;
    }

    .profile-option,
    .profile-manage {
        display: block;
        width: 100%;
        padding: var(--size-2) var(--size-4);
        text-align: left;
        background: none;
        border: none;
        box-shadow: none;
        font-size: var(--font-size-1);
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--color-text);
        text-decoration: none;
        cursor: pointer;
    }

    .profile-option:hover:not(:disabled),
    .profile-manage:hover {
        background: var(--color-lemon);
        transform: none;
        box-shadow: none;
    }

    .profile-option.current {
        background: var(--color-mint);
    }

    .menu-divider {
        border-top: var(--border);
        margin: var(--size-1) 0;
    }

    main {
        max-width: 1200px;
        margin: 0 auto;
        padding: var(--size-8) var(--size-4);
    }
</style>
