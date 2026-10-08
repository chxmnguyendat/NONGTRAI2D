// HỆ THỐNG CÂY TÁO: chọn cây, tưới, chờ quả chín và thu hoạch.
// Mỗi cây giữ trạng thái/bộ đếm riêng; tổng táo được chia sẻ giữa các bảng.
(() => {
const appleTrees = [...document.querySelectorAll(".apple-tree")].map(element => ({
    element,
    panel: element.querySelector(".apple-tree-panel"),
    status: element.querySelector(".tree-status"),
    action: element.querySelector(".tree-action"),
    progress: element.querySelector(".tree-progress"),
    progressFill: element.querySelector(".tree-progress-fill"),
    worldProgress: createWorldProgress(element),
    timer: null,
    secondsUntilRipe: 0
}));

const game = document.querySelector(".game");
const targetSelectButton = document.querySelector("#target-select-button");
const targetSelectLabel = document.querySelector("#target-select-label");
const targetSelectCheck = document.querySelector("#target-select-check");
const targetSelectCancel = document.querySelector("#target-select-cancel");
const APPLE_TREE_SELECT_RANGE = 2.5;
const GROW_DURATION_SECONDS = 12;

let selectedTree = null;
let nearbyTree = null;
let playerBounds = { x: 0, y: 0, width: 0, height: 0 };
let apples = 0;
let isPaused = false;

function saveOrchard() {
    window.GameSave?.update("orchard", {
        apples,
        trees: appleTrees.map(tree => ({
            stage: tree.element.dataset.stage,
            secondsUntilRipe: tree.secondsUntilRipe
        }))
    });
}

// THANH TIẾN ĐỘ TRÊN CÂY: tạo riêng cho từng cây để hiển thị tiến độ khi bảng đóng.
function createWorldProgress(treeElement) {
    const progress = document.createElement("div");
    progress.className = "tree-world-progress";
    progress.setAttribute("role", "status");
    progress.setAttribute("aria-label", "Tiến độ cây ra quả");
    progress.hidden = true;
    progress.innerHTML = '<span class="tree-world-growing"><span class="tree-world-progress-track"><span class="tree-world-progress-fill"></span></span><output>0%</output></span><span class="tree-world-ready" hidden><span aria-hidden="true">🍎</span><span>Thu hoạch</span></span>';
    treeElement.append(progress);
    return {
        element: progress,
        growing: progress.querySelector(".tree-world-growing"),
        fill: progress.querySelector(".tree-world-progress-fill"),
        label: progress.querySelector("output"),
        ready: progress.querySelector(".tree-world-ready")
    };
}

function syncWorldNotice(tree) {
    const stage = tree.element.dataset.stage;
    const isSelected = selectedTree === tree;
    tree.worldProgress.element.hidden = isSelected || (stage !== "watered" && stage !== "ripe");
    tree.worldProgress.growing.hidden = stage !== "watered";
    tree.worldProgress.ready.hidden = stage !== "ripe";
}

function updateWorldProgress(tree, percent) {
    tree.worldProgress.fill.style.width = `${percent}%`;
    tree.worldProgress.label.value = `${percent}%`;
    syncWorldNotice(tree);
}

// Tính khoảng cách tới thân cây, bỏ qua phần trong suốt quanh sprite.
function isPlayerNearTree(tree) {
    const playerRight = playerBounds.x + playerBounds.width;
    const playerBottom = playerBounds.y + playerBounds.height;
    const treeLeft = tree.offsetLeft + 65;
    const treeRight = tree.offsetLeft + 105;
    const treeTop = tree.offsetTop + 130;
    const treeBottom = tree.offsetTop + 165;
    const gapX = Math.max(treeLeft - playerRight, playerBounds.x - treeRight, 0);
    const gapY = Math.max(treeTop - playerBottom, playerBounds.y - treeBottom, 0);

    return Math.hypot(gapX, gapY) <= APPLE_TREE_SELECT_RANGE;
}

function refreshSelection() {
    nearbyTree = appleTrees.find(tree => isPlayerNearTree(tree.element)) || null;
    appleTrees.forEach(tree => tree.element.classList.toggle("is-nearby", tree === nearbyTree));

    // Khi rời khỏi cây đang chọn, đóng bảng để lần quay lại phải chọn lại.
    if (selectedTree && !isPlayerNearTree(selectedTree.element)) {
        selectedTree.panel.hidden = true;
        selectedTree = null;
    }

    appleTrees.forEach(syncWorldNotice);

    const isSelected = Boolean(selectedTree);
    const canSelect = isSelected || Boolean(nearbyTree);
    targetSelectButton.disabled = !canSelect;
    targetSelectButton.setAttribute("aria-pressed", String(isSelected));
    targetSelectLabel.textContent = isSelected ? "Bỏ chọn" : "Chọn";
    targetSelectCheck.hidden = isSelected;
    targetSelectCancel.hidden = !isSelected;
}

function toggleSelection() {
    if (selectedTree) {
        selectedTree.panel.hidden = true;
        selectedTree = null;
    } else if (nearbyTree) {
        selectedTree = nearbyTree;
        selectedTree.panel.hidden = false;
    }
    refreshSelection();
}

function startGrowthTimer(tree) {
    if (tree.timer || isPaused || tree.element.dataset.stage !== "watered") return;

    tree.timer = window.setInterval(() => {
        tree.secondsUntilRipe -= 1;
        const progress = Math.round(((GROW_DURATION_SECONDS - tree.secondsUntilRipe) / GROW_DURATION_SECONDS) * 100);
        tree.progressFill.style.width = `${progress}%`;
        tree.progress.setAttribute("aria-valuenow", String(progress));
        updateWorldProgress(tree, progress);

        if (tree.secondsUntilRipe > 0) {
            tree.status.textContent = `Táo chín sau ${tree.secondsUntilRipe} giây`;
            saveOrchard();
            return;
        }

        window.clearInterval(tree.timer);
        tree.timer = null;
        tree.element.dataset.stage = "ripe";
        syncWorldNotice(tree);
        tree.status.textContent = "Táo đã chín, thu hoạch được rồi!";
        tree.action.disabled = false;
        tree.action.textContent = "🍎 Thu hoạch táo";
        saveOrchard();
    }, 1000);
}

function waterTree(tree) {
    if (tree.element.dataset.stage !== "waiting") return;

    tree.secondsUntilRipe = GROW_DURATION_SECONDS;
    tree.element.dataset.stage = "watered";
    tree.action.disabled = true;
    tree.action.textContent = "🌱 Cây đang lớn…";
    tree.progress.hidden = false;
    tree.progressFill.style.width = "0%";
    tree.progress.setAttribute("aria-valuenow", "0");
    updateWorldProgress(tree, 0);
    tree.status.textContent = `Tưới xong! Táo chín sau ${tree.secondsUntilRipe} giây`;
    saveOrchard();
    startGrowthTimer(tree);
}

function harvestTree(tree) {
    if (tree.element.dataset.stage !== "ripe") return;

    const added = window.Inventory?.addItem("apple", { name: "Táo", icon: "🍎", count: 1 }) ?? 0;
    if (added === 0) {
        tree.status.textContent = "Túi đồ đã đầy! Hãy dọn chỗ trước khi thu hoạch táo.";
        return;
    }

    apples += 1;
    tree.element.dataset.stage = "waiting";
    syncWorldNotice(tree);
    tree.status.textContent = "Đã thu hoạch! Tưới cây để cây ra quả tiếp";
    tree.action.disabled = false;
    tree.action.textContent = "💧 Tưới cây";
    tree.progress.hidden = true;
    tree.progressFill.style.width = "0%";
    tree.progress.setAttribute("aria-valuenow", "0");
    saveOrchard();
}

function restoreOrchard() {
    const saved = window.GameSave?.read().orchard;
    if (!saved || typeof saved !== "object") return;
    apples = Number.isFinite(saved.apples) ? Math.max(0, Math.floor(saved.apples)) : 0;
    if (!Array.isArray(saved.trees)) return;

    saved.trees.slice(0, appleTrees.length).forEach((state, index) => {
        const tree = appleTrees[index];
        if (!state || !["waiting", "watered", "ripe"].includes(state.stage)) return;
        tree.element.dataset.stage = state.stage;
        tree.secondsUntilRipe = Math.min(GROW_DURATION_SECONDS, Math.max(0, Math.floor(state.secondsUntilRipe || 0)));
        if (state.stage === "watered") {
            if (tree.secondsUntilRipe === 0) {
                tree.element.dataset.stage = "ripe";
            } else {
                const percent = Math.round(((GROW_DURATION_SECONDS - tree.secondsUntilRipe) / GROW_DURATION_SECONDS) * 100);
                tree.action.disabled = true;
                tree.action.textContent = "🌱 Cây đang lớn…";
                tree.progress.hidden = false;
                tree.progressFill.style.width = `${percent}%`;
                tree.progress.setAttribute("aria-valuenow", String(percent));
                tree.status.textContent = `Táo chín sau ${tree.secondsUntilRipe} giây`;
            }
        }
        if (tree.element.dataset.stage === "ripe") {
            tree.action.disabled = false;
            tree.action.textContent = "🍎 Thu hoạch táo";
            tree.status.textContent = "Táo đã chín, thu hoạch được rồi!";
        }
    });
}

// Mọi cây dùng chung thao tác, nhưng giữ thời gian và trạng thái phát triển riêng.
appleTrees.forEach(tree => tree.action.addEventListener("click", () => {
    if (tree.element.dataset.stage === "waiting") waterTree(tree);
    else if (tree.element.dataset.stage === "ripe") harvestTree(tree);
}));

restoreOrchard();
appleTrees.forEach(tree => {
    syncWorldNotice(tree);
    if (tree.element.dataset.stage === "watered") startGrowthTimer(tree);
});

targetSelectButton.addEventListener("click", () => {
    if (game.classList.contains("is-customizing") || isPaused) return;
    toggleSelection();
});

document.addEventListener("keydown", event => {
    if (event.key.toLowerCase() !== "e" || event.repeat || isPaused || !window.PlayerProfile?.isProfileReady()) return;
    event.preventDefault();
    toggleSelection();
});

// API cho script.js: cập nhật khoảng cách mỗi frame và đồng bộ tạm dừng game.
window.AppleTreeSystem = {
    getSaveData() {
        return { apples, trees: appleTrees.map(tree => ({ stage: tree.element.dataset.stage, secondsUntilRipe: tree.secondsUntilRipe })) };
    },
    refresh(x, y, width, height) {
        playerBounds = { x, y, width, height };
        refreshSelection();
    },
    setPaused(paused) {
        isPaused = paused;
        appleTrees.forEach(tree => {
            if (paused && tree.timer) {
                window.clearInterval(tree.timer);
                tree.timer = null;
            } else if (!paused && tree.element.dataset.stage === "watered") {
                startGrowthTimer(tree);
            }
        });
    }
};
})();
