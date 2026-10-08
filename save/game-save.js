// Mỗi nông trại có save riêng; danh sách nông trại được lưu trên thiết bị hiện tại.
(() => {
    const WORLDS_KEY = "nongtrai2d-world-list-v1";
    const LEGACY_SAVE_KEY = "nongtrai2d-game-save-v1";
    const MAX_WORLDS = 2;

    function parseJson(value, fallback) {
        try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
    }

    function readWorlds() {
        const value = parseJson(localStorage.getItem(WORLDS_KEY), []);
        return Array.isArray(value) ? value.filter(world => world && typeof world.id === "string" && typeof world.name === "string").slice(0, MAX_WORLDS) : [];
    }

    let worlds = readWorlds();

    // Chuyển save cũ thành map đầu tiên để giữ lại tiến trình đang có.
    const legacySave = localStorage.getItem(LEGACY_SAVE_KEY);
    if (legacySave && worlds.length < MAX_WORLDS && !worlds.some(world => world.fromLegacy)) {
        const oldData = parseJson(legacySave, null);
        if (oldData && typeof oldData === "object") {
            const migratedWorld = { id: "world-legacy", name: "Nông trại cũ", createdAt: Date.now(), fromLegacy: true };
            worlds.push(migratedWorld);
            localStorage.setItem(`nongtrai2d-world-save-${migratedWorld.id}`, JSON.stringify(oldData));
            localStorage.setItem(WORLDS_KEY, JSON.stringify(worlds));
            localStorage.removeItem(LEGACY_SAVE_KEY);
        }
    }

    const requestedWorldId = new URLSearchParams(window.location.search).get("world");
    const activeWorldId = worlds.some(world => world.id === requestedWorldId) ? requestedWorldId : null;

    function getWorldSaveKey(worldId) {
        return `nongtrai2d-world-save-${worldId}`;
    }

    function read() {
        if (!activeWorldId) return {};
        const value = parseJson(localStorage.getItem(getWorldSaveKey(activeWorldId)), {});
        return value && typeof value === "object" ? value : {};
    }

    function update(section, value) {
        if (!activeWorldId) return;
        try {
            const save = read();
            save[section] = value;
            save.updatedAt = Date.now();
            localStorage.setItem(getWorldSaveKey(activeWorldId), JSON.stringify(save));
        } catch (error) {
            console.warn("Không thể lưu tiến trình nông trại trên thiết bị này.", error);
        }
    }

    function listWorlds() {
        return worlds.map(world => ({ ...world }));
    }

    function createWorld(name) {
        const cleanName = String(name || "").trim().replace(/\s+/g, " ").slice(0, 24);
        if (!cleanName || worlds.length >= MAX_WORLDS) return null;
        const id = `world-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
        const world = { id, name: cleanName, createdAt: Date.now() };
        worlds = [...worlds, world];
        localStorage.setItem(getWorldSaveKey(id), JSON.stringify({}));
        localStorage.setItem(WORLDS_KEY, JSON.stringify(worlds));
        return { ...world };
    }

    function deleteWorld(worldId) {
        if (!worlds.some(world => world.id === worldId)) return false;
        worlds = worlds.filter(world => world.id !== worldId);
        localStorage.removeItem(getWorldSaveKey(worldId));
        localStorage.setItem(WORLDS_KEY, JSON.stringify(worlds));
        return true;
    }

    function enterWorld(worldId) {
        if (!worlds.some(world => world.id === worldId)) return;
        const url = new URL(window.location.href);
        url.searchParams.delete("save");
        url.searchParams.delete("selectMap");
        url.searchParams.set("world", worldId);
        const destination = `${url.pathname}${url.search}${url.hash}`;
        if (window.SceneTransitions) window.SceneTransitions.navigate(destination);
        else window.location.assign(destination);
    }

    function returnToWorldSelect() {
        const url = new URL(window.location.href);
        url.searchParams.delete("world");
        url.searchParams.delete("save");
        url.searchParams.set("selectMap", "1");
        const destination = `${url.pathname}${url.search}${url.hash}`;
        if (window.SceneTransitions) window.SceneTransitions.navigate(destination);
        else window.location.assign(destination);
    }

    function returnToTitle() {
        const url = new URL(window.location.href);
        url.searchParams.delete("world");
        url.searchParams.delete("save");
        url.searchParams.delete("selectMap");
        const destination = `${url.pathname}${url.search}${url.hash}`;
        if (window.SceneTransitions) window.SceneTransitions.navigate(destination);
        else window.location.assign(destination);
    }

    window.GameSave = Object.freeze({
        read,
        update,
        listWorlds,
        createWorld,
        deleteWorld,
        enterWorld,
        returnToWorldSelect,
        returnToTitle,
        hasCurrentWorld() { return Boolean(activeWorldId); },
        maxWorlds: MAX_WORLDS
    });
})();
