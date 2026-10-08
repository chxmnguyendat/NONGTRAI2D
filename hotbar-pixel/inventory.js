// Túi đồ: quản lý các ô, số lượng vật phẩm và giới hạn xếp chồng.
(() => {
    const SLOT_COUNT = 5;
    const MAX_STACK = 20;
    const inventoryElement = document.querySelector(".inventory-bar");
    const slotsElement = inventoryElement.querySelector(".inventory-slots");
    const capacityElement = inventoryElement.querySelector(".inventory-capacity");
    const items = Array(SLOT_COUNT).fill(null);
    const savedItems = window.GameSave?.read().inventory;
    if (Array.isArray(savedItems)) {
        savedItems.slice(0, SLOT_COUNT).forEach((savedItem, index) => {
            if (!savedItem || typeof savedItem.id !== "string" || !Number.isFinite(savedItem.count)) return;
            const count = Math.floor(savedItem.count);
            if (count < 1 || count > MAX_STACK) return;
            items[index] = {
                id: savedItem.id,
                name: typeof savedItem.name === "string" ? savedItem.name : savedItem.id,
                icon: typeof savedItem.icon === "string" ? savedItem.icon : "📦",
                count
            };
        });
    }

    function saveInventory() {
        window.GameSave?.update("inventory", getItems());
    }

    const slots = Array.from({ length: SLOT_COUNT }, (_, index) => {
        const slot = document.createElement("button");
        slot.type = "button";
        slot.className = "inventory-slot";
        slot.setAttribute("aria-label", `Ô túi đồ ${index + 1}, trống`);
        slotsElement.append(slot);
        return slot;
    });
    slotsElement.setAttribute("role", "list");

    function render() {
        const total = items.reduce((sum, item) => sum + (item?.count || 0), 0);
        capacityElement.value = `${total}/${SLOT_COUNT * MAX_STACK}`;
        slots.forEach((slot, index) => {
            const item = items[index];
            slot.replaceChildren();
            if (!item) {
                const keyHint = document.createElement("span");
                keyHint.className = "inventory-slot-key";
                keyHint.textContent = String(index + 1);
                keyHint.setAttribute("aria-hidden", "true");
                slot.append(keyHint);
                slot.setAttribute("aria-label", `Ô túi đồ ${index + 1}, trống, phím ${index + 1}`);
                slot.title = "";
                return;
            }

            const icon = document.createElement("span");
            icon.className = "inventory-item-icon";
            icon.textContent = item.icon;
            icon.setAttribute("aria-hidden", "true");
            const count = document.createElement("span");
            count.className = "inventory-item-count";
            count.textContent = String(item.count);
            const keyHint = document.createElement("span");
            keyHint.className = "inventory-slot-key";
            keyHint.textContent = String(index + 1);
            keyHint.setAttribute("aria-hidden", "true");
            slot.append(icon, count, keyHint);
            slot.setAttribute("aria-label", `Ô túi đồ ${index + 1}: ${item.name}, ${item.count} trên ${MAX_STACK}, phím ${index + 1}`);
            slot.title = item.id === "apple" ? `Nhấn hoặc bấm phím ${index + 1} để ăn táo` : `${item.name} · phím ${index + 1}`;
        });
    }

    // Thêm vật phẩm vào chồng cùng loại trước, sau đó dùng ô trống. Trả về số món đã thêm.
    function addItem(id, { name = id, icon = "📦", count = 1 } = {}) {
        let remaining = Math.max(0, Math.floor(count));
        const requested = remaining;

        for (const item of items) {
            if (remaining === 0) break;
            if (item?.id !== id || item.count >= MAX_STACK) continue;
            const added = Math.min(MAX_STACK - item.count, remaining);
            item.count += added;
            remaining -= added;
        }

        for (let index = 0; index < items.length && remaining > 0; index += 1) {
            if (items[index]) continue;
            const added = Math.min(MAX_STACK, remaining);
            items[index] = { id, name, icon, count: added };
            remaining -= added;
        }

        render();
        saveInventory();
        return requested - remaining;
    }

    function getItems() {
        return items.map(item => item && { ...item });
    }

    function removeItem(id, count = 1) {
        let remaining = Math.max(0, Math.floor(count));
        const requested = remaining;
        for (let index = items.length - 1; index >= 0 && remaining > 0; index -= 1) {
            const item = items[index];
            if (item?.id !== id) continue;
            const removed = Math.min(item.count, remaining);
            item.count -= removed;
            remaining -= removed;
            if (item.count === 0) items[index] = null;
        }
        if (remaining !== requested) {
            render();
            saveInventory();
        }
        return requested - remaining;
    }

    function useSlot(index) {
        const item = items[index];
        if (!item || item.id !== "apple" || document.querySelector(".game")?.classList.contains("is-customizing")) return;
        if (removeItem("apple", 1)) {
            document.dispatchEvent(new CustomEvent("inventory:item-used", { detail: { id: "apple", name: item.name } }));
        }
    }

    slots.forEach((slot, index) => slot.addEventListener("click", () => useSlot(index)));

    document.addEventListener("keydown", event => {
        if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
        if (event.target instanceof HTMLElement && (event.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName))) return;
        const index = Number(event.key) - 1;
        if (index < 0 || index >= slots.length) return;
        if (!items[index] || items[index].id !== "apple") return;
        event.preventDefault();
        useSlot(index);
    });

    render();
    window.Inventory = Object.freeze({ addItem, getItems, removeItem, slotCount: SLOT_COUNT, maxStack: MAX_STACK });
})();
