// Chỉ số sinh tồn hiển thị trên bảng thông tin nhân vật.
(() => {
    const saveData = window.GameSave?.read() || {};
    const saved = saveData.survival || {};
    const savedName = typeof saveData.profile?.name === "string" ? saveData.profile.name.trim() : "";
    const savedGender = ["male", "female"].includes(saveData.profile?.gender) ? saveData.profile.gender : "";
    const nameGate = document.querySelector("#player-name-gate");
    const nameForm = document.querySelector("#player-name-form");
    const nameInput = document.querySelector("#player-name-input");
    const nameLabel = document.querySelector("#player-name-label");
    const genderOptions = [...document.querySelectorAll(".player-gender-option")];
    const genderSelection = document.querySelector("#player-gender-selection");
    const playerSprite = document.querySelector(".player-sprite");
    const playerAvatar = document.querySelector(".player-status-avatar");
    const nameAvatar = document.querySelector(".player-name-avatar");
    const hasCurrentWorld = window.GameSave?.hasCurrentWorld() ?? false;
    let selectedGender = savedGender;
    let profileReady = Boolean(savedName && savedGender);
    const stats = {
        hp: clamp(saved.hp, 100),
        water: clamp(saved.water, 100),
        food: clamp(saved.food, 100)
    };
    const elements = {
        hp: { value: document.querySelector("#player-hp-value"), fill: document.querySelector("#player-hp-fill") },
        water: { value: document.querySelector("#player-water-value"), fill: document.querySelector("#player-water-fill") },
        food: { value: document.querySelector("#player-food-value"), fill: document.querySelector("#player-food-fill") }
    };
    let paused = false;

    function clamp(value, fallback) {
        return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : fallback;
    }

    function render() {
        Object.entries(stats).forEach(([key, value]) => {
            const element = elements[key];
            element.value.value = `${Math.round(value)}%`;
            element.fill.style.width = `${value}%`;
            element.fill.parentElement.setAttribute("aria-valuenow", String(Math.round(value)));
            element.fill.parentElement.classList.toggle("is-low", value <= 50 && value > 20);
            element.fill.parentElement.classList.toggle("is-critical", value <= 20);
        });
    }

    function save() {
        window.GameSave?.update("survival", { ...stats });
    }

    nameInput.value = savedName;
    nameLabel.textContent = savedName || "Nhà nông";
    nameGate.hidden = !hasCurrentWorld || profileReady;
    if (hasCurrentWorld && !profileReady) nameInput.focus();

    function selectGender(gender) {
        selectedGender = gender;
        if (nameAvatar) nameAvatar.dataset.gender = gender;
        genderOptions.forEach(option => {
            const isSelected = option.dataset.gender === gender;
            option.setAttribute("aria-pressed", String(isSelected));
        });
        genderSelection.textContent = `Đã chọn nhân vật ${gender === "female" ? "Nữ" : "Nam"}`;
    }

    genderOptions.forEach(option => {
        option.addEventListener("click", () => selectGender(option.dataset.gender));
    });
    if (savedGender) selectGender(savedGender);

    nameForm.addEventListener("submit", event => {
        event.preventDefault();
        const name = nameInput.value.trim().replace(/\s+/g, " ");
        if (!name) {
            nameInput.focus();
            return;
        }
        if (!selectedGender) {
            genderSelection.textContent = "Hãy chọn nhân vật Nam hoặc Nữ.";
            genderOptions[0].focus();
            return;
        }
        window.SceneTransitions.fade(() => {
            window.GameSave?.update("profile", { name, gender: selectedGender });
            nameLabel.textContent = name;
            [playerSprite, playerAvatar, nameAvatar].forEach(element => {
                if (element) element.dataset.gender = selectedGender;
            });
            profileReady = true;
            nameGate.hidden = true;
        });
    });

    [playerSprite, playerAvatar, nameAvatar].forEach(element => {
        if (element && savedGender) element.dataset.gender = savedGender;
    });

    document.addEventListener("inventory:item-used", event => {
        if (event.detail?.id !== "apple") return;
        stats.food = Math.min(100, stats.food + 30);
        render();
        save();
    });

    window.setInterval(() => {
        if (!profileReady || paused || stats.food <= 0) return;
        stats.food = Math.max(0, stats.food - 1);
        render();
        save();
    }, 60000);

    render();
    window.PlayerStatus = Object.freeze({
        setPaused(value) { paused = Boolean(value); },
        getStats() { return { ...stats }; },
        isProfileReady() { return profileReady; }
    });
    window.addEventListener("pagehide", save);
})();
