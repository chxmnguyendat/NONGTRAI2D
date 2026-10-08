// Lưu tối đa ba bản sao của dữ liệu Farming Pixel trong localStorage trên thiết bị này.
(() => {
    const BACKUPS_KEY = "nongtrai2d-backups-v1";
    const GAME_KEY_PREFIX = "nongtrai2d-";
    const MAX_BACKUPS = 3;

    const widget = document.querySelector("#game-backup-widget");
    const startScreen = document.querySelector("#start-screen");
    const toggle = document.querySelector("#game-backup-toggle");
    const panel = document.querySelector("#game-backup-panel");
    const close = document.querySelector("#game-backup-close");
    const createButton = document.querySelector("#game-backup-create");
    const resetButton = document.querySelector("#game-backup-reset");
    const list = document.querySelector("#game-backup-list");
    const notice = document.querySelector("#game-backup-notice");

    if (!widget || !startScreen || startScreen.hidden) return;
    widget.hidden = false;

    function readBackups() {
        try {
            const parsed = JSON.parse(localStorage.getItem(BACKUPS_KEY) || "[]");
            return Array.isArray(parsed) ? parsed.filter(item => item && typeof item.id === "string" && item.data && typeof item.data === "object").slice(-MAX_BACKUPS) : [];
        } catch {
            return [];
        }
    }

    function writeBackups(backups) {
        localStorage.setItem(BACKUPS_KEY, JSON.stringify(backups.slice(-MAX_BACKUPS)));
    }

    function captureGameData() {
        const data = {};
        for (let index = 0; index < localStorage.length; index += 1) {
            const key = localStorage.key(index);
            if (key?.startsWith(GAME_KEY_PREFIX) && key !== BACKUPS_KEY) {
                data[key] = localStorage.getItem(key);
            }
        }
        return data;
    }

    function replaceGameData(data) {
        const currentKeys = [];
        for (let index = 0; index < localStorage.length; index += 1) {
            const key = localStorage.key(index);
            if (key?.startsWith(GAME_KEY_PREFIX) && key !== BACKUPS_KEY) currentKeys.push(key);
        }
        currentKeys.forEach(key => localStorage.removeItem(key));
        Object.entries(data).forEach(([key, value]) => {
            if (key.startsWith(GAME_KEY_PREFIX) && key !== BACKUPS_KEY && typeof value === "string") {
                localStorage.setItem(key, value);
            }
        });
    }

    function setNotice(message, isError = false) {
        notice.textContent = message;
        notice.classList.toggle("is-error", isError);
    }

    function makeBackup(name) {
        const backups = readBackups();
        if (backups.length >= MAX_BACKUPS) {
            const shouldReplace = window.confirm("Đã có đủ 3 bản sao lưu. Tạo bản mới sẽ xóa bản cũ nhất. Bạn muốn tiếp tục không?");
            if (!shouldReplace) return;
            backups.sort((a, b) => a.createdAt - b.createdAt).shift();
        }

        const newestCreatedAt = backups.reduce((latest, item) => Math.max(latest, Number(item.createdAt) || 0), 0);
        const now = Math.max(Date.now(), newestCreatedAt + 1);
        const backup = {
            id: `backup-${now.toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
            name: name || `Bản sao lưu ${new Date(now).toLocaleString("vi-VN")}`,
            createdAt: now,
            data: captureGameData()
        };

        try {
            backups.push(backup);
            writeBackups(backups);
            setNotice(`Đã tạo “${backup.name}”.`);
            render();
        } catch (error) {
            console.error("Không thể tạo bản sao lưu game.", error);
            setNotice("Không đủ dung lượng lưu trên thiết bị để tạo bản sao lưu.", true);
        }
    }

    function restoreBackup(backup) {
        const confirmed = window.confirm(`Khôi phục “${backup.name}”? Dữ liệu game hiện tại sẽ được thay bằng bản sao lưu này.`);
        if (!confirmed) return;

        const currentGameData = captureGameData();
        try {
            replaceGameData(backup.data);
            window.location.reload();
        } catch (error) {
            console.error("Không thể khôi phục bản sao lưu game.", error);
            try {
                replaceGameData(currentGameData);
                setNotice("Khôi phục thất bại; dữ liệu hiện tại đã được giữ lại.", true);
            } catch (rollbackError) {
                console.error("Không thể hoàn tác thao tác khôi phục.", rollbackError);
                setNotice("Khôi phục bị lỗi. Bản sao lưu vẫn còn để thử lại.", true);
            }
        }
    }

    function render() {
        const backups = readBackups().sort((a, b) => b.createdAt - a.createdAt);
        list.replaceChildren();

        if (!backups.length) {
            const empty = document.createElement("p");
            empty.className = "game-backup-empty";
            empty.textContent = "Chưa có bản sao lưu.";
            list.append(empty);
            return;
        }

        backups.forEach(backup => {
            const card = document.createElement("article");
            card.className = "game-backup-card";

            const date = document.createElement("p");
            date.className = "game-backup-date";
            date.textContent = new Date(backup.createdAt).toLocaleString("vi-VN");

            const nameLabel = document.createElement("label");
            nameLabel.textContent = "Tên bản sao lưu";
            const nameInput = document.createElement("input");
            nameInput.type = "text";
            nameInput.maxLength = 32;
            nameInput.value = backup.name;
            nameInput.setAttribute("aria-label", `Tên bản sao lưu ${backup.name}`);
            nameLabel.append(nameInput);

            const actions = document.createElement("div");
            actions.className = "game-backup-actions";

            const renameButton = document.createElement("button");
            renameButton.type = "button";
            renameButton.textContent = "Đổi tên";
            renameButton.addEventListener("click", () => {
                const cleanName = nameInput.value.trim().replace(/\s+/g, " ").slice(0, 32);
                if (!cleanName) {
                    setNotice("Tên bản sao lưu không được để trống.", true);
                    nameInput.focus();
                    return;
                }
                const current = readBackups();
                const target = current.find(item => item.id === backup.id);
                if (!target) return;
                target.name = cleanName;
                try {
                    writeBackups(current);
                    setNotice("Đã đổi tên bản sao lưu.");
                    render();
                } catch (error) {
                    console.error("Không thể đổi tên bản sao lưu.", error);
                    setNotice("Không thể lưu tên mới trên thiết bị này.", true);
                }
            });

            const restoreButton = document.createElement("button");
            restoreButton.type = "button";
            restoreButton.className = "game-backup-restore";
            restoreButton.textContent = "Khôi phục";
            restoreButton.addEventListener("click", () => restoreBackup(backup));

            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "game-backup-delete";
            deleteButton.textContent = "Xóa";
            deleteButton.addEventListener("click", () => {
                if (!window.confirm(`Xóa bản sao lưu “${backup.name}”? Tiến trình game hiện tại sẽ không bị ảnh hưởng.`)) return;
                try {
                    writeBackups(readBackups().filter(item => item.id !== backup.id));
                    setNotice(`Đã xóa bản sao lưu “${backup.name}”.`);
                    render();
                } catch (error) {
                    console.error("Không thể xóa bản sao lưu.", error);
                    setNotice("Không thể xóa bản sao lưu trên thiết bị này.", true);
                }
            });

            actions.append(renameButton, restoreButton, deleteButton);
            card.append(date, nameLabel, actions);
            list.append(card);
        });
    }

    toggle.addEventListener("click", () => {
        panel.hidden = !panel.hidden;
        toggle.setAttribute("aria-expanded", String(!panel.hidden));
        if (!panel.hidden) render();
    });

    close.addEventListener("click", () => {
        panel.hidden = true;
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
    });

    createButton.addEventListener("click", () => makeBackup());
    resetButton.addEventListener("click", () => {
        const confirmed = window.confirm("Đặt lại game về trạng thái ban đầu? Tất cả map, tiến trình, cài đặt và các bản sao lưu sẽ bị xóa khỏi thiết bị này.");
        if (!confirmed) return;

        try {
            const gameKeys = [];
            for (let index = 0; index < localStorage.length; index += 1) {
                const key = localStorage.key(index);
                if (key?.startsWith(GAME_KEY_PREFIX)) gameKeys.push(key);
            }
            gameKeys.forEach(key => localStorage.removeItem(key));
            window.location.replace(window.location.pathname);
        } catch (error) {
            console.error("Không thể đặt lại dữ liệu game.", error);
            setNotice("Không thể xóa dữ liệu game trên thiết bị này.", true);
        }
    });
    render();
})();
