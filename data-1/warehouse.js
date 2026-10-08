// Nhà kho: lưu độc lập từng nông trại và cho phép chuyển vật phẩm giữa các ô.
(() => {
    const SLOT_COUNT = 15;
    const MAX_STACK = 20;
    const CAPACITY = SLOT_COUNT * MAX_STACK;
    const content = document.querySelector("#warehouse-content");
    const closeButton = document.querySelector("#warehouse-close");
    const hint = document.querySelector("#warehouse-hint");
    const capacityElement = content.querySelector(".warehouse-capacity");
    const inventorySlotsElement = content.querySelector(".warehouse-inventory-slots");
    const storageSlotsElement = content.querySelector(".warehouse-storage-slots");
    const items = Array(SLOT_COUNT).fill(null);
    const savedItems = window.GameSave?.read().warehouse;

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

    function getItems() {
        return items.map(item => item && { ...item });
    }

    function saveItems() {
        window.GameSave?.update("warehouse", getItems());
    }

    function itemCount() {
        return items.reduce((sum, item) => sum + (item?.count || 0), 0);
    }

    function addItem({ id, name = id, icon = "📦", count = 1 }) {
        let remaining = Math.max(0, Math.floor(count));
        const requested = remaining;
        for (const item of items) {
            if (!remaining) break;
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
        if (remaining !== requested) {
            saveItems();
            render();
        }
        return requested - remaining;
    }

    function removeFromSlot(index, count) {
        const item = items[index];
        if (!Number.isInteger(index) || index < 0 || index >= SLOT_COUNT || !item) return null;
        const removed = Math.min(item.count, Math.max(0, Math.floor(count)));
        if (!removed) return null;
        const result = { ...item, count: removed };
        item.count -= removed;
        if (!item.count) items[index] = null;
        saveItems();
        render();
        return result;
    }

    function makeSlots(container, count, label, onSelect) {
        return Array.from({ length: count }, (_, index) => {
            const slot = document.createElement("button");
            slot.type = "button";
            slot.className = "inventory-slot";
            slot.setAttribute("role", "listitem");
            slot.addEventListener("click", () => onSelect(index));
            container.append(slot);
            return slot;
        });
    }

    function renderSlots(slots, slotItems, label) {
        slots.forEach((slot, index) => {
            const item = slotItems[index];
            slot.replaceChildren();
            if (!item) {
                slot.setAttribute("aria-label", `${label} ${index + 1}, trống`);
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
            slot.append(icon, count);
            slot.setAttribute("aria-label", `${label} ${index + 1}: ${item.name}, ${item.count} món`);
            slot.title = `${item.name} · ${item.count} món`;
        });
    }

    const inventorySlots = makeSlots(inventorySlotsElement, window.Inventory.slotCount, "Ô túi đồ", transferToWarehouse);
    const storageSlots = makeSlots(storageSlotsElement, SLOT_COUNT, "Ô nhà kho", transferToInventory);

    function render() {
        capacityElement.value = `${itemCount()}/${CAPACITY}`;
        renderSlots(inventorySlots, window.Inventory.getItems(), "Ô túi đồ");
        renderSlots(storageSlots, items, "Ô nhà kho");
    }

    function transferToWarehouse(index) {
        const item = window.Inventory.getItems()[index];
        if (!item) {
            hint.textContent = "Ô túi đồ này đang trống.";
            return;
        }
        const added = addItem(item);
        if (!added) {
            hint.textContent = "Nhà kho đã đầy.";
            return;
        }
        window.Inventory.removeFromSlot(index, added);
        hint.textContent = added === item.count
            ? `Đã cất ${item.name} ×${added}.`
            : `Đã cất ${item.name} ×${added}; nhà kho đã đầy.`;
        render();
    }

    function transferToInventory(index) {
        const item = items[index];
        if (!item) {
            hint.textContent = "Ô nhà kho này đang trống.";
            return;
        }
        const requested = item.count;
        const added = window.Inventory.addItem(item.id, item);
        if (!added) {
            hint.textContent = "Túi đồ đã đầy.";
            return;
        }
        removeFromSlot(index, added);
        hint.textContent = added === requested
            ? `Đã lấy ${item.name} ×${added}.`
            : `Đã lấy ${item.name} ×${added}; túi đồ đã đầy.`;
        render();
    }

    function setOpen(isOpen) {
        content.hidden = !isOpen;
        if (isOpen) {
            hint.textContent = "Chọn một ô Túi Đồ để cất cả chồng, hoặc ô Nhà Kho để lấy.";
            render();
            closeButton.focus();
        }
    }

    function isWarehouseActivation(target) {
        if (target.closest(".storage")) return true;
        const player = target.closest(".player");
        if (!player) return false;
        const playerRect = player.getBoundingClientRect();
        return [...document.querySelectorAll(".storage")].some(storage => {
            const storageRect = storage.getBoundingClientRect();
            return storageRect.left < playerRect.right && storageRect.right > playerRect.left &&
                storageRect.top < playerRect.bottom && storageRect.bottom > playerRect.top;
        });
    }

    closeButton.addEventListener("click", () => setOpen(false));
    document.addEventListener("pointerdown", event => {
        if (!content.hidden && !content.contains(event.target) && !isWarehouseActivation(event.target)) setOpen(false);
    });
    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && !content.hidden) setOpen(false);
    });

    render();
    window.WarehouseSystem = Object.freeze({
        open: () => setOpen(true),
        close: () => setOpen(false),
        isOpen: () => !content.hidden,
        getItems,
        capacity: CAPACITY
    });
})();
