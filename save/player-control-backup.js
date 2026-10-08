const player = document.querySelector(".player");
// HIỆU ỨNG VÀO GAME: bắt đầu rơi sau khi cảnh đầu tiên đã được vẽ.
requestAnimationFrame(() => {
    requestAnimationFrame(() => player.classList.add("is-entering"));
});
const entryGreeting = document.querySelector("#entry-greeting");
const playerSprite = player.querySelector(".player-sprite");
const landingWind = document.querySelector("#landing-wind");
const playerIdleLines = [
    "Chán quá :<",
    "Muốn ăn táo :>",
    "Mình muốn câu cá",
    "Làm gì bây giờ :>",
    "Nghỉ tay chút thôi!",
    "Hôm nay trời đẹp ghê",
    "Không biết táo chín chưa nhỉ?"
];
const idleDialogueIntervals = [10, 15, 20].map(minutes => minutes * 60 * 1000);

function showPlayerDialogue(line) {
    entryGreeting.textContent = line;
    entryGreeting.hidden = false;

    const visibleDuration = 3000 + Math.random() * 5000;
    window.setTimeout(() => {
        entryGreeting.hidden = true;
    }, visibleDuration);
}

function scheduleIdleDialogue() {
    const nextInterval = idleDialogueIntervals[Math.floor(Math.random() * idleDialogueIntervals.length)];

    window.setTimeout(() => {
        showPlayerDialogue(playerIdleLines[Math.floor(Math.random() * playerIdleLines.length)]);
        const visibleDuration = 3000 + Math.random() * 5000;
        window.setTimeout(scheduleIdleDialogue, visibleDuration);
    }, nextInterval);
}

player.addEventListener("animationend", event => {
    if (event.animationName !== "player-entry-drop") return;
    landingWind.classList.add("is-active");
    window.setTimeout(() => landingWind.classList.remove("is-active"), 800);
    player.append(entryGreeting);
    window.setTimeout(() => {
        entryGreeting.textContent = "Hi";
        entryGreeting.hidden = false;
        window.setTimeout(() => {
            entryGreeting.hidden = true;
        }, 4000);
    }, 2000);
    window.setTimeout(() => showPlayerDialogue("Làm gì bây giờ :>"), 10000);
    scheduleIdleDialogue();
});

const world = document.querySelector(".world");
const game = document.querySelector(".game");

// MAP LEFT EXPANSION: đọc cùng biến CSS để giữ nhân vật tại đúng vị trí so với cảnh cũ.
const mapLeftExpansion = Number.parseFloat(getComputedStyle(world).getPropertyValue("--map-left-expansion")) || 0;
const mapTopExpansion = Number.parseFloat(getComputedStyle(world).getPropertyValue("--map-top-expansion")) || 0;
// Điểm xuất hiện mặc định trên đường, sát bên trái nhà kho; luôn dùng điểm này khi tải game.
const defaultSpawnX = 1500 + mapLeftExpansion - 100;
const defaultSpawnY = 200 + mapTopExpansion;
let x = defaultSpawnX;
let y = defaultSpawnY;
const savedPlayerPosition = window.GameSave?.read().player;
if (savedPlayerPosition && Number.isFinite(savedPlayerPosition.x) && Number.isFinite(savedPlayerPosition.y)) {
    x = Math.max(0, Math.min(world.offsetWidth - 50, savedPlayerPosition.x));
    y = Math.max(0, Math.min(world.offsetHeight - 50, savedPlayerPosition.y));
}
let lastPlayerSaveAt = 0;
// TỐC ĐỘ DI CHUYỂN: tăng/giảm số này để chỉnh tốc độ nhân vật (đơn vị mỗi khung hình).
const speed = 3;
const keys = {};
let moveTarget = null;
const spriteRows = { down: 0, up: 1, right: 2, left: 3 };
const spriteFrameCounts = { down: 5, up: 5, right: 6, left: 6 };
const femaleSpriteFrameCounts = { down: 3, up: 3, right: 2, left: 2 };
const spriteCellWidth = 50;
const spriteCellHeight = 81.25;
const spriteFrameDuration = 130;
let currentFacing = "down";
let currentWalkFrame = 0;
let lastWalkFrameAt = 0;
let wasMoving = false;
let gamePaused = false;
let isCustomizingControls = false;

game.addEventListener("pointerdown", event => {
    if (gamePaused || isCustomizingControls || !window.PlayerProfile?.isProfileReady()) return;
    if (event.target.closest("button, input, select, textarea, a, [contenteditable='true'], .selectable-object, .inventory-bar, .target-select-widget")) return;
    event.preventDefault();

    const worldBounds = world.getBoundingClientRect();
    const zoom = Number(window.FarmCameraZoom) || 1;
    const playerWidth = playerSprite.offsetWidth * 1.5;
    const playerHeight = playerSprite.offsetHeight * 1.5;
    const mapX = (event.clientX - worldBounds.left) / zoom;
    const mapY = (event.clientY - worldBounds.top) / zoom;

    moveTarget = {
        x: Math.max(0, Math.min(world.offsetWidth - playerWidth, mapX - playerWidth / 2)),
        y: Math.max(0, Math.min(world.offsetHeight - playerHeight, mapY - playerHeight / 2))
    };
});

const keyboardDirections = {
    w: "ArrowUp",
    a: "ArrowLeft",
    s: "ArrowDown",
    d: "ArrowRight",
    W: "ArrowUp",
    A: "ArrowLeft",
    S: "ArrowDown",
    D: "ArrowRight"
};

document.addEventListener("keydown", event => {
    const direction = keyboardDirections[event.key];
    if (direction && !gamePaused && window.PlayerProfile?.isProfileReady()) {
        moveTarget = null;
        keys[direction] = true;
        event.preventDefault();
    }
});

document.addEventListener("keyup", event => {
    const direction = keyboardDirections[event.key];
    if (direction) keys[direction] = false;
});

const inventorySizeSlider = document.querySelector("#inventory-size");
const inventorySizeValue = document.querySelector("#inventory-size-value");
const cameraZoomSlider = document.querySelector("#camera-zoom");
const cameraZoomValue = document.querySelector("#camera-zoom-value");
const inventoryBar = document.querySelector(".inventory-bar");
const settingsToggle = document.querySelector(".settings-toggle");
const settingsPanel = document.querySelector("#settings-panel");
const settingsClose = document.querySelector("#settings-close");
const menuBackdrop = document.querySelector("#menu-backdrop");
const menuHome = document.querySelector("#menu-home");
const gameSettings = document.querySelector("#game-settings");
const openGameSettings = document.querySelector("#open-game-settings");
const returnToTitleButton = document.querySelector("#return-to-title");
const settingsBack = document.querySelector("#settings-back");
const customizeControlsButton = document.querySelector("#customize-controls");
const customizeToolbar = document.querySelector("#customize-toolbar");
const finishCustomizingButton = document.querySelector("#finish-customizing");
const customizableElements = {
    inventory: inventoryBar,
    select: document.querySelector(".target-select-widget")
};
const CONTROL_POSITIONS_KEY = "nongtrai2d-control-positions";
let savedControlPositions = loadControlPositions();
// Vị trí đã lưu từ phiên cũ đặt túi đồ lệch trái; khởi tạo lại mặc định giữa dưới một lần.
try {
    if (!localStorage.getItem("nongtrai2d-inventory-position-centered")) {
        delete savedControlPositions.inventory;
        localStorage.setItem("nongtrai2d-inventory-position-centered", "true");
    }
} catch {}

const INVENTORY_SIZE_KEY = "nongtrai2d-inventory-size";
let savedInventorySize = 100;
try { savedInventorySize = Number(localStorage.getItem(INVENTORY_SIZE_KEY)) || 100; } catch {}
inventorySizeSlider.value = String(Math.min(150, Math.max(60, savedInventorySize)));
applyInventorySize();
inventorySizeSlider.addEventListener("input", () => {
    applyInventorySize();
    applySavedControlPosition("inventory");
    try { localStorage.setItem(INVENTORY_SIZE_KEY, inventorySizeSlider.value); } catch {}
});

function applyInventorySize() {
    inventorySizeValue.value = `${inventorySizeSlider.value}%`;
    inventoryBar.style.setProperty("--inventory-scale", Number(inventorySizeSlider.value) / 100);
}

const CAMERA_ZOOM_KEY = "nongtrai2d-camera-zoom";
const defaultCameraZoom = window.matchMedia("(pointer: coarse)").matches ? 1.5 : 1.4;
let savedCameraZoom = defaultCameraZoom;
try {
    const storedCameraZoom = Number(localStorage.getItem(CAMERA_ZOOM_KEY));
    if (Number.isFinite(storedCameraZoom) && storedCameraZoom >= 0.8 && storedCameraZoom <= 1.8) {
        savedCameraZoom = storedCameraZoom;
    }
} catch {}
cameraZoomSlider.value = String(Math.round(savedCameraZoom * 100 / 5) * 5);
cameraZoomValue.value = `${cameraZoomSlider.value}%`;
window.FarmCameraZoom = Number(cameraZoomSlider.value) / 100;
cameraZoomSlider.addEventListener("input", () => {
    cameraZoomValue.value = `${cameraZoomSlider.value}%`;
    window.FarmCameraZoom = Number(cameraZoomSlider.value) / 100;
    try { localStorage.setItem(CAMERA_ZOOM_KEY, String(window.FarmCameraZoom)); } catch {}
});

// TÙY BIẾN NÚT: lưu vị trí theo tỷ lệ để bố cục phù hợp khi đổi kích thước màn hình.
function loadControlPositions() {
    try {
        return JSON.parse(localStorage.getItem(CONTROL_POSITIONS_KEY) || "{}");
    } catch {
        return {};
    }
}

function saveControlPositions() {
    try {
        localStorage.setItem(CONTROL_POSITIONS_KEY, JSON.stringify(savedControlPositions));
    } catch {
        // Game vẫn dùng vị trí tùy biến trong phiên hiện tại nếu trình duyệt chặn lưu trữ.
    }
}

function applySavedControlPosition(name) {
    const position = savedControlPositions[name];
    const element = customizableElements[name];
    if (!position || !element) return;

    const gameRect = game.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const maxLeft = Math.max(0, game.clientWidth - elementRect.width);
    const maxTop = Math.max(0, game.clientHeight - elementRect.height);
    const visualLeft = position.x * maxLeft;
    const visualTop = position.y * maxTop;
    const scaleOffsetY = name === "inventory" ? element.offsetHeight - elementRect.height : 0;

    element.style.left = `${visualLeft}px`;
    element.style.top = `${visualTop - scaleOffsetY}px`;
    element.style.right = "auto";
    element.style.bottom = "auto";
    if (name === "inventory") element.style.translate = "0 0";
}

function applyAllSavedControlPositions() {
    applySavedControlPosition("inventory");
    applySavedControlPosition("select");
}

function saveElementPosition(name, element) {
    const gameRect = game.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const maxLeft = Math.max(1, game.clientWidth - elementRect.width);
    const maxTop = Math.max(1, game.clientHeight - elementRect.height);
    const visualLeft = elementRect.left - gameRect.left - game.clientLeft;
    const visualTop = elementRect.top - gameRect.top - game.clientTop;

    savedControlPositions[name] = {
        x: Math.min(1, Math.max(0, visualLeft / maxLeft)),
        y: Math.min(1, Math.max(0, visualTop / maxTop))
    };
    saveControlPositions();
}

function beginControlDrag(event, name, element) {
    if (!isCustomizingControls || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    element.setPointerCapture(event.pointerId);

    const gameRect = game.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const grabX = event.clientX - elementRect.left;
    const grabY = event.clientY - elementRect.top;

    const move = moveEvent => {
        const maxLeft = Math.max(0, game.clientWidth - elementRect.width);
        const maxTop = Math.max(0, game.clientHeight - elementRect.height);
        const visualLeft = Math.min(maxLeft, Math.max(0, moveEvent.clientX - gameRect.left - game.clientLeft - grabX));
        const visualTop = Math.min(maxTop, Math.max(0, moveEvent.clientY - gameRect.top - game.clientTop - grabY));
        const scaleOffsetY = name === "inventory" ? element.offsetHeight - elementRect.height : 0;

        element.style.left = `${visualLeft}px`;
        element.style.top = `${visualTop - scaleOffsetY}px`;
        element.style.right = "auto";
        element.style.bottom = "auto";
        if (name === "inventory") element.style.translate = "0 0";
    };
    const finish = () => {
        element.removeEventListener("pointermove", move);
        element.removeEventListener("pointerup", finish);
        element.removeEventListener("pointercancel", finish);
        saveElementPosition(name, element);
    };

    element.addEventListener("pointermove", move);
    element.addEventListener("pointerup", finish, { once: true });
    element.addEventListener("pointercancel", finish, { once: true });
}

Object.entries(customizableElements).forEach(([name, element]) => {
    element.addEventListener("pointerdown", event => beginControlDrag(event, name, element), true);
});

applyAllSavedControlPositions();
window.addEventListener("resize", applyAllSavedControlPositions);

customizeControlsButton.addEventListener("click", () => {
    settingsPanel.hidden = true;
    settingsToggle.setAttribute("aria-expanded", "false");
    isCustomizingControls = true;
    customizeToolbar.hidden = false;
    game.classList.add("is-customizing");
    setGamePaused(true);
    menuBackdrop.hidden = true;
});

finishCustomizingButton.addEventListener("click", () => {
    isCustomizingControls = false;
    customizeToolbar.hidden = true;
    game.classList.remove("is-customizing");
    menuHome.hidden = true;
    gameSettings.hidden = false;
    settingsPanel.hidden = false;
    settingsToggle.setAttribute("aria-expanded", "true");
    setGamePaused(true);
    settingsClose.focus();
});

settingsToggle.addEventListener("click", () => {
    const isOpening = settingsPanel.hidden;
    if (isOpening && isCustomizingControls) {
        isCustomizingControls = false;
        customizeToolbar.hidden = true;
        game.classList.remove("is-customizing");
    }
    settingsPanel.hidden = !isOpening;
    settingsToggle.setAttribute("aria-expanded", isOpening);
    if (isOpening) {
        showMenuHome();
        setGamePaused(true);
    } else {
        setGamePaused(false);
    }
});

// MENU TẠM DỪNG: khóa di chuyển và báo cho module cây táo dừng/tiếp tục bộ đếm.
function setGamePaused(paused) {
    gamePaused = paused;
    game.classList.toggle("is-paused", paused);
    menuBackdrop.hidden = !paused;
    moveTarget = null;
    keys.ArrowUp = keys.ArrowDown = keys.ArrowLeft = keys.ArrowRight = false;
    keys.w = keys.a = keys.s = keys.d = false;

    AppleTreeSystem.setPaused(paused);
}

// MENU GAME: điều hướng giữa danh mục chính và trang cài đặt.
function showMenuHome() {
    menuHome.hidden = false;
    gameSettings.hidden = true;
}

openGameSettings.addEventListener("click", () => {
    menuHome.hidden = true;
    gameSettings.hidden = false;
});

returnToTitleButton.addEventListener("click", () => window.GameSave.returnToTitle());

settingsBack.addEventListener("click", showMenuHome);

// MENU GAME: nút đóng ẩn bảng và đồng bộ trạng thái nút menu.
settingsClose.addEventListener("click", () => {
    settingsPanel.hidden = true;
    settingsToggle.setAttribute("aria-expanded", "false");
    setGamePaused(false);
    settingsToggle.focus();
});

menuBackdrop.addEventListener("click", () => settingsToggle.click());

function update(timestamp) {
    const now = timestamp ?? performance.now();
    const keyboardMovingUp = keys["w"] || keys.ArrowUp;
    const keyboardMovingDown = keys["s"] || keys.ArrowDown;
    const keyboardMovingLeft = keys["a"] || keys.ArrowLeft;
    const keyboardMovingRight = keys["d"] || keys.ArrowRight;
    let targetVector = null;
    if (!gamePaused && !keyboardMovingUp && !keyboardMovingDown && !keyboardMovingLeft && !keyboardMovingRight && moveTarget) {
        const deltaX = moveTarget.x - x;
        const deltaY = moveTarget.y - y;
        const distance = Math.hypot(deltaX, deltaY);
        if (distance <= 1) {
            moveTarget = null;
        } else {
            targetVector = { x: deltaX / distance, y: deltaY / distance, distance };
        }
    }
    const movingUp = keyboardMovingUp || Boolean(targetVector && targetVector.y < -0.15);
    const movingDown = keyboardMovingDown || Boolean(targetVector && targetVector.y > 0.15);
    const movingLeft = keyboardMovingLeft || Boolean(targetVector && targetVector.x < -0.15);
    const movingRight = keyboardMovingRight || Boolean(targetVector && targetVector.x > 0.15);
    const isMoving = !gamePaused && (movingUp || movingDown || movingLeft || movingRight);

    if (!gamePaused) {
        const playerWidth = playerSprite.offsetWidth * 1.5;
        const playerHeight = playerSprite.offsetHeight * 1.5;
        // Va chạm dùng vùng chân nhỏ gọn để hàng rào sát mép đường không chặn lối đi.
        const collisionWidth = playerWidth * 0.6;
        const collisionHeight = 12;
        const collisionXOffset = (playerWidth - collisionWidth) / 2;
        const collisionYOffset = playerHeight - collisionHeight;
        let nextX = x;
        let nextY = y;

        if (targetVector) {
            const step = Math.min(speed, targetVector.distance);
            nextX += targetVector.x * step;
            nextY += targetVector.y * step;
        } else {
            if (movingLeft) nextX -= speed;
            if (movingRight) nextX += speed;
            if (movingUp) nextY -= speed;
            if (movingDown) nextY += speed;
        }

        const previousX = x;
        const previousY = y;
        if (FenceCollision.canOccupy(
            world,
            nextX + collisionXOffset,
            y + collisionYOffset,
            collisionWidth,
            collisionHeight
        )) x = nextX;
        if (FenceCollision.canOccupy(
            world,
            x + collisionXOffset,
            nextY + collisionYOffset,
            collisionWidth,
            collisionHeight
        )) y = nextY;
        if (targetVector && x === previousX && y === previousY) moveTarget = null;
    }

    if (isMoving) {
        const activeSpriteFrameCounts = playerSprite.dataset.gender === "female"
            ? femaleSpriteFrameCounts
            : spriteFrameCounts;
        const previousFacing = currentFacing;
        if (movingUp) currentFacing = "up";
        else if (movingDown) currentFacing = "down";
        else if (movingLeft) currentFacing = "left";
        else if (movingRight) currentFacing = "right";

        if (!wasMoving || currentFacing !== previousFacing) {
            currentWalkFrame = 0;
            lastWalkFrameAt = now;
        } else if (now - lastWalkFrameAt >= spriteFrameDuration) {
            const elapsedFrames = Math.floor((now - lastWalkFrameAt) / spriteFrameDuration);
            currentWalkFrame = (currentWalkFrame + elapsedFrames) % activeSpriteFrameCounts[currentFacing];
            lastWalkFrameAt += elapsedFrames * spriteFrameDuration;
        }

        playerSprite.classList.add("is-walking");
        playerSprite.classList.remove("is-standing");
        playerSprite.style.backgroundPosition = `-${currentWalkFrame * spriteCellWidth}px -${spriteRows[currentFacing] * spriteCellHeight}px`;
    } else {
        playerSprite.classList.remove("is-walking");
        playerSprite.classList.add("is-standing");
        playerSprite.style.backgroundPosition = "center top";
    }
    wasMoving = Boolean(isMoving);

    // Lấy kích thước .world từ CSS để đổi cỡ bản đồ không cần sửa camera.
    const mapWidth = world.offsetWidth;
    const mapHeight = world.offsetHeight;

    // Giới hạn nhân vật theo kích thước .world hiện tại.
    x = Math.max(0, Math.min(mapWidth - 50, x));
    y = Math.max(0, Math.min(mapHeight - 50, y));

    player.style.left = x + "px";
    player.style.top = y + "px";

    if (now - lastPlayerSaveAt >= 1000) {
        window.GameSave?.update("player", { x, y });
        lastPlayerSaveAt = now;
    }

    // CAMERA GAME: camera.js tự đọc kích thước .world và giữ nhân vật ở tâm màn hình.
    FarmCamera.follow(game, world, player, x, y);
    AppleTreeSystem.refresh(x, y, player.offsetWidth * 1.5, player.offsetHeight * 1.5);
    requestAnimationFrame(update);
}

update();
