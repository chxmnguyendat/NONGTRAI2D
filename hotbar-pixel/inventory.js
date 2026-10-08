// Túi đồ: quản lý các ô, số lượng vật phẩm và giới hạn xếp chồng.
(() => {
    const SLOT_COUNT = 5;
    const MAX_STACK = 20;
    const inventoryElement = document.querySelector(".inventory-bar");
    const slotsElement = document.querySelector(".inventory-slots");
    const capacityElement = document.querySelector(".inventory-capacity");
    const inventoryToggle = inventoryElement.querySelector(".inventory-toggle");
    const inventoryContent = document.querySelector(".inventory-content");
    const inventoryClose = inventoryContent.querySelector(".inventory-close");
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

    function setInventoryOpen(isOpen) {
        inventoryContent.hidden = !isOpen;
        inventoryToggle.setAttribute("aria-expanded", String(isOpen));
        inventoryToggle.setAttribute("aria-label", isOpen ? "Đóng túi đồ" : "Mở túi đồ");
    }

    inventoryToggle.addEventListener("click", () => {
        setInventoryOpen(inventoryContent.hidden);
    });

    inventoryClose.addEventListener("click", () => {
        setInventoryOpen(false);
    });

    document.addEventListener("pointerdown", event => {
        if (!inventoryContent.hidden && !inventoryContent.contains(event.target) && !inventoryToggle.contains(event.target)) {
            setInventoryOpen(false);
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && !inventoryContent.hidden) setInventoryOpen(false);
    });

    setInventoryOpen(false);

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
            slot.title = `${item.name} · phím ${index + 1}`;
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

    function removeFromSlot(index, count = Infinity) {
        if (!Number.isInteger(index) || index < 0 || index >= items.length) return null;
        const item = items[index];
        if (!item) return null;

        const removed = Math.min(item.count, Math.max(0, Math.floor(count)));
        if (removed === 0) return null;
        const result = { ...item, count: removed };
        item.count -= removed;
        if (item.count === 0) items[index] = null;
        render();
        saveInventory();
        return result;
    }

    render();
    window.Inventory = Object.freeze({ addItem, getItems, removeItem, removeFromSlot, slotCount: SLOT_COUNT, maxStack: MAX_STACK });
})();
