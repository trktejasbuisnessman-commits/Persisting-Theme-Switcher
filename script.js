/**
 * Theme controller.
 *
 * State model:
 *   - localStorage "theme" holds ONLY an explicit user choice ("light" | "dark").
 *   - When it is absent, the app follows the OS preference (live).
 *   - The inline <head> script in index.html performs the same resolution
 *     before first paint; this module takes over afterwards.
 */
(() => {
    "use strict";

    const STORAGE_KEY = "theme";
    const THEMES = { LIGHT: "light", DARK: "dark" };
    const DARK_QUERY = "(prefers-color-scheme: dark)";

    const root = document.documentElement;
    const toggleBtn = document.getElementById("theme-toggle");
    const toggleText = document.getElementById("theme-toggle-text");
    const systemBtn = document.getElementById("theme-system");
    const statusEl = document.getElementById("theme-status");

    // matchMedia may be missing in very old / restricted environments.
    const mediaQuery =
        typeof window.matchMedia === "function" ? window.matchMedia(DARK_QUERY) : null;

    /* ---------- Storage helpers (all guarded: storage can throw) ---------- */

    /** @returns {"light"|"dark"|null} Valid saved choice, or null. */
    const getStoredTheme = () => {
        try {
            const value = localStorage.getItem(STORAGE_KEY);
            return value === THEMES.LIGHT || value === THEMES.DARK ? value : null;
        } catch {
            return null;
        }
    };

    const storeTheme = (theme) => {
        try {
            localStorage.setItem(STORAGE_KEY, theme);
        } catch {
            /* Storage unavailable (private mode / quota): theme still applies for this session. */
        }
    };

    const clearStoredTheme = () => {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch {
            /* ignore */
        }
    };

    /* ---------- Resolution ---------- */

    const getSystemTheme = () =>
        mediaQuery && mediaQuery.matches ? THEMES.DARK : THEMES.LIGHT;

    /** Priority: saved choice -> system -> light (safe fallback). */
    const resolveTheme = () => getStoredTheme() ?? getSystemTheme();

    /* ---------- UI ---------- */

    const render = (theme) => {
        const isDark = theme === THEMES.DARK;
        const followingSystem = getStoredTheme() === null;

        root.setAttribute("data-theme", theme);

        // Accessible name describes the ACTION; visible text + icon show the STATE.
        toggleBtn.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
        toggleText.textContent = isDark ? "Dark" : "Light";

        statusEl.textContent = `${isDark ? "Dark" : "Light"} theme${followingSystem ? " (system)" : ""}`;
        systemBtn.hidden = followingSystem; // Nothing to reset when already following system.
    };

    /* ---------- Actions ---------- */

    const setUserTheme = (theme) => {
        storeTheme(theme);
        render(theme);
    };

    const toggleTheme = () => {
        const current = root.getAttribute("data-theme") === THEMES.DARK ? THEMES.DARK : THEMES.LIGHT;
        setUserTheme(current === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK);
    };

    const resetToSystem = () => {
        clearStoredTheme();
        render(resolveTheme());
    };

    /* ---------- Event wiring ---------- */

    toggleBtn.addEventListener("click", toggleTheme);
    systemBtn.addEventListener("click", resetToSystem);

    // OS theme changed: only follow it when the user has no explicit choice.
    const onSystemChange = () => {
        if (getStoredTheme() === null) render(getSystemTheme());
    };
    if (mediaQuery) {
        if (typeof mediaQuery.addEventListener === "function") {
            mediaQuery.addEventListener("change", onSystemChange);
        } else if (typeof mediaQuery.addListener === "function") {
            mediaQuery.addListener(onSystemChange); // Safari < 14 fallback
        }
    }

    // Keep multiple tabs in sync when the choice changes elsewhere.
    window.addEventListener("storage", (event) => {
        if (event.key === STORAGE_KEY || event.key === null) render(resolveTheme());
    });

    // Restore from the back/forward cache with fresh state.
    window.addEventListener("pageshow", (event) => {
        if (event.persisted) render(resolveTheme());
    });

    /* ---------- Init ---------- */

    render(resolveTheme());

    // Enable CSS transitions only after the first paint, so load never animates.
    requestAnimationFrame(() => {
        requestAnimationFrame(() => root.classList.add("theme-ready"));
    });
})();