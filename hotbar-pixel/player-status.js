// Hồ sơ nhân vật: lưu tên/giới tính và áp dụng ngoại hình đã chọn.
(() => {
    const saveData = window.GameSave?.read() || {};
    const savedName = typeof saveData.profile?.name === "string" ? saveData.profile.name.trim() : "";
    const savedGender = ["male", "female"].includes(saveData.profile?.gender) ? saveData.profile.gender : "";
    const nameGate = document.querySelector("#player-name-gate");
    const nameForm = document.querySelector("#player-name-form");
    const nameInput = document.querySelector("#player-name-input");
    const genderOptions = [...document.querySelectorAll(".player-gender-option")];
    const genderSelection = document.querySelector("#player-gender-selection");
    const playerSprite = document.querySelector(".player-sprite");
    const nameAvatar = document.querySelector(".player-name-avatar");
    const hasCurrentWorld = window.GameSave?.hasCurrentWorld() ?? false;
    let selectedGender = savedGender;
    let profileReady = Boolean(savedName && savedGender);

    nameInput.value = savedName;
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
        window.dispatchEvent(new Event("farmgame:begin"));
        window.SceneTransitions.fade(() => {
            window.GameSave?.update("profile", { name, gender: selectedGender });
            [playerSprite, nameAvatar].forEach(element => {
                if (element) element.dataset.gender = selectedGender;
            });
            profileReady = true;
            nameGate.hidden = true;
        });
    });

    [playerSprite, nameAvatar].forEach(element => {
        if (element && savedGender) element.dataset.gender = savedGender;
    });

    window.PlayerProfile = Object.freeze({
        isProfileReady() { return profileReady; }
    });
})();
