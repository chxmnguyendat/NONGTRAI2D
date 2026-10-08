(() => {
    const world = document.querySelector(".world");
    if (!world) {
        throw new Error("Không tìm thấy khu vực bản đồ để đặt NPC nông dân.");
    }

    const dialogue = document.querySelector("#npc-dialogue");
    const dialogueText = document.querySelector("#npc-dialogue-text");
    const dialogueDismiss = document.querySelector("#npc-dialogue-dismiss");
    if (!dialogue || !dialogueText || !dialogueDismiss) {
        throw new Error("Không tìm thấy thành phần hộp thoại NPC nông dân.");
    }

    const lines = [
        "Chào cậu! Hôm nay thời tiết đẹp quá!",
        "Nhớ tưới cây đều đặn nhé, cây khỏe thì mùa màng mới tốt.",
        "Buổi sáng ra đồng hít thở không khí trong lành thích thật!",
        "Đất tơi xốp sẽ giúp cây trồng lớn nhanh hơn đó.",
        "Làm nông tuy bận rộn nhưng nhìn cây lớn vui lắm!",
        "Cậu đã nghỉ tay uống chút nước chưa?",
        "Hôm nay nông trại mình trông xanh tốt quá!",
        "Chăm chỉ mỗi ngày rồi sẽ có mùa thu hoạch bội thu!"
    ];
    let previousLineIndex = -1;
    let npcElement = null;
    let playerBounds = null;
    let targetNpc = null;

    const showRandomDialogue = () => {
        let lineIndex = Math.floor(Math.random() * lines.length);
        if (lines.length > 1 && lineIndex === previousLineIndex) {
            lineIndex = (lineIndex + 1 + Math.floor(Math.random() * (lines.length - 1))) % lines.length;
        }
        previousLineIndex = lineIndex;
        dialogueText.textContent = lines[lineIndex];
        dialogue.hidden = false;
    };

    const isPlayerNear = (npc, x, y, width, height, collisionXOffset, collisionWidth, collisionYOffset, collisionHeight) => {
        const playerLeft = x + collisionXOffset;
        const playerRight = playerLeft + collisionWidth;
        const playerTop = y + collisionYOffset;
        const playerBottom = playerTop + collisionHeight;
        const npcLeft = npc.offsetLeft + npc.offsetWidth * 0.15;
        const npcRight = npc.offsetLeft + npc.offsetWidth * 0.85;
        const npcTop = npc.offsetTop + npc.offsetHeight * 0.8;
        const npcBottom = npc.offsetTop + npc.offsetHeight;
        const gapX = Math.max(npcLeft - playerRight, playerLeft - npcRight, 0);
        const gapY = Math.max(npcTop - playerBottom, playerTop - npcBottom, 0);

        return Math.hypot(gapX, gapY) <= 2.5;
    };

    dialogue.addEventListener("click", () => {
        dialogue.hidden = true;
    });

    window.FarmerNpcSystem = {
        setTargetNpc(npc) {
            targetNpc = npc === npcElement ? npc : null;
            npcElement?.classList.toggle("is-selected", targetNpc === npcElement);
        },
        isPlayerNear(npc, x, y, width, height, collisionXOffset, collisionWidth, collisionYOffset, collisionHeight) {
            return npc === npcElement && isPlayerNear(
                npc,
                x,
                y,
                width,
                height,
                collisionXOffset,
                collisionWidth,
                collisionYOffset,
                collisionHeight
            );
        },
        showDialogue: showRandomDialogue,
        refresh(x, y, width, height) {
            playerBounds = {
                x,
                y,
                width,
                height,
                collisionXOffset: (width - width * 0.6) / 2,
                collisionWidth: width * 0.6,
                collisionYOffset: height - 12,
                collisionHeight: 12
            };
            if (!npcElement) return;

            const nearby = isPlayerNear(
                npcElement,
                playerBounds.x,
                playerBounds.y,
                playerBounds.width,
                playerBounds.height,
                playerBounds.collisionXOffset,
                playerBounds.collisionWidth,
                playerBounds.collisionYOffset,
                playerBounds.collisionHeight
            );
            npcElement.classList.toggle("is-nearby", nearby);
        }
    };

    const loadNpcPosition = () => new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open("GET", "assets/map/npc-nongdan-nha/npc-nongdan-nha.json");
        request.onload = () => {
            if (request.status !== 200 && request.status !== 0) {
                reject(new Error(`Không tải được tọa độ NPC (HTTP ${request.status}).`));
                return;
            }

            try {
                const position = JSON.parse(request.responseText);
                if (!Number.isFinite(position.xPx) || !Number.isFinite(position.yPx)) {
                    throw new Error("Tọa độ xPx và yPx trong file JSON phải là số hợp lệ.");
                }
                resolve(position);
            } catch (error) {
                reject(error);
            }
        };
        request.onerror = () => reject(new Error("Không thể đọc file tọa độ NPC nông dân."));
        request.send();
    });

    loadNpcPosition()
        .then(position => {
            const npc = document.createElement("button");
            npc.className = "npc-nongdan-nha";
            npc.type = "button";
            npc.setAttribute("aria-label", "Nói chuyện với nông dân");
            npc.addEventListener("click", () => {
                if (!playerBounds || !isPlayerNear(
                    npc,
                    playerBounds.x,
                    playerBounds.y,
                    playerBounds.width,
                    playerBounds.height,
                    playerBounds.collisionXOffset,
                    playerBounds.collisionWidth,
                    playerBounds.collisionYOffset,
                    playerBounds.collisionHeight
                )) return;
                showRandomDialogue();
            });

            const sprite = document.createElement("div");
            sprite.className = "npc-nongdan-nha-sprite";
            sprite.setAttribute("aria-hidden", "true");
            const nameplate = document.createElement("span");
            nameplate.className = "npc-nongdan-nha-nameplate";
            nameplate.textContent = "Nông dân";
            nameplate.setAttribute("aria-hidden", "true");
            npc.append(sprite, nameplate);
            world.append(npc);
            npcElement = npc;

            npc.style.left = `${position.xPx - npc.offsetWidth / 2}px`;
            npc.style.top = `${position.yPx - npc.offsetHeight}px`;
        })
        .catch(error => console.error("Không thể đặt NPC nông dân:", error));
})();
