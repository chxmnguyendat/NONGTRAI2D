// Màn hình tạo, chọn và xóa tối đa hai nông trại độc lập.
(() => {
    const gate = document.querySelector("#world-select-gate");
    const startScreen = document.querySelector("#start-screen");
    const startButton = document.querySelector("#start-screen-play");
    const slotList = document.querySelector("#world-slot-list");
    const createForm = document.querySelector("#world-create-form");
    const nameInput = document.querySelector("#world-name-input");
    const cancelButton = document.querySelector("#world-create-cancel");
    const backToTitleButton = document.querySelector("#back-to-title");
    const selectWorldButton = document.querySelector("#open-world-select");
    const backButton = document.querySelector("#back-to-world-select");
    let showingWorldList = new URLSearchParams(window.location.search).get("selectMap") === "1";

    function makeButton(className, text, onClick) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = className;
        button.textContent = text;
        button.addEventListener("click", onClick);
        return button;
    }

    function render() {
        const worlds = window.GameSave.listWorlds();
        const hasCurrentWorld = window.GameSave.hasCurrentWorld();
        startScreen.hidden = hasCurrentWorld || showingWorldList;
        gate.hidden = hasCurrentWorld || !showingWorldList;
        slotList.replaceChildren();

        worlds.forEach((world, index) => {
            const card = document.createElement("article");
            card.className = "world-slot-card";
            const heading = document.createElement("h2");
            heading.textContent = `Map ${index + 1}: ${world.name}`;
            const date = document.createElement("p");
            if (world.createdAt) {
                const createdAt = new Date(world.createdAt);
                const createdDate = createdAt.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
                const createdTime = createdAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
                date.textContent = `Tạo ngày ${createdDate} lúc ${createdTime}`;
            } else {
                date.textContent = "Nông trại đã lưu";
            }
            const actions = document.createElement("div");
            actions.className = "world-slot-actions";
            actions.append(
                makeButton("world-enter-button", "Vào chơi", () => window.GameSave.enterWorld(world.id)),
                makeButton("world-delete-button", "Xóa map", () => {
                    if (!window.confirm(`Xóa “${world.name}” và toàn bộ tiến trình trong map này?`)) return;
                    window.GameSave.deleteWorld(world.id);
                    render();
                })
            );
            card.append(heading, date, actions);
            slotList.append(card);
        });

        for (let index = worlds.length; index < window.GameSave.maxWorlds; index += 1) {
            slotList.append(makeButton("world-create-slot", `＋  Tạo map ${index + 1}`, () => {
                createForm.hidden = false;
                nameInput.focus();
            }));
        }
    }

    startButton.addEventListener("click", () => {
        window.SceneTransitions.fade(() => {
            showingWorldList = true;
            render();
        });
    });

    createForm.addEventListener("submit", event => {
        event.preventDefault();
        const world = window.GameSave.createWorld(nameInput.value);
        if (!world) return;
        window.GameSave.enterWorld(world.id);
    });

    cancelButton.addEventListener("click", () => {
        createForm.reset();
        createForm.hidden = true;
    });

    selectWorldButton?.addEventListener("click", () => window.GameSave.returnToWorldSelect());
    backButton?.addEventListener("click", () => window.GameSave.returnToWorldSelect());
    backToTitleButton?.addEventListener("click", () => window.GameSave.returnToTitle());
    render();
})();
