(() => {
    const world = document.querySelector(".world");
    if (!world) {
        console.error("Không thể đặt ao nước: không tìm thấy bản đồ.");
        return;
    }

    const request = new XMLHttpRequest();
    request.open("GET", "assets/map/pond.json");
    request.onload = () => {
        try {
            if (request.status !== 200 && request.status !== 0) {
                throw new Error(`Không thể đọc tọa độ ao nước (HTTP ${request.status}).`);
            }

            const position = JSON.parse(request.responseText);
            if (!Number.isFinite(position.xPx) || !Number.isFinite(position.yPx)) {
                throw new Error("Tọa độ ao nước phải là số pixel hợp lệ.");
            }

            const pond = document.createElement("div");
            pond.className = "pond-water";
            pond.setAttribute("role", "img");
            pond.setAttribute("aria-label", "Ao nước có cá");

            if (position.sign &&
                Number.isFinite(position.sign.xPx) &&
                Number.isFinite(position.sign.yPx)) {
                const sign = document.createElement("div");
                sign.className = "pond-sign";
                sign.setAttribute("role", "img");
                sign.setAttribute("aria-label", "Biển báo Ao Nước");
                sign.dataset.fishingSign = "true";

                const post = document.createElement("span");
                post.className = "pond-sign-post";
                post.setAttribute("aria-hidden", "true");
                const board = document.createElement("span");
                board.className = "pond-sign-board";
                board.textContent = "Ao Nước";
                sign.append(post, board);
                sign.style.left = `${position.sign.xPx}px`;
                sign.style.top = `${position.sign.yPx - 78}px`;
                world.append(sign);
            }

            const bank = document.createElement("div");
            bank.className = "pond-bank";
            bank.setAttribute("aria-hidden", "true");
            const sand = document.createElement("div");
            sand.className = "pond-sand";
            sand.setAttribute("aria-hidden", "true");
            ["one", "two", "three", "four", "five", "six"].forEach(number => {
                const grain = document.createElement("span");
                grain.className = `pond-sand-grain pond-sand-grain--${number}`;
                sand.append(grain);
            });
            const surface = document.createElement("div");
            surface.className = "pond-surface";
            surface.setAttribute("aria-hidden", "true");

            ["one", "two"].forEach(number => {
                const wind = document.createElement("span");
                wind.className = `pond-wind pond-wind--${number}`;
                surface.append(wind);
            });

            ["one", "two", "three"].forEach(number => {
                const bubble = document.createElement("span");
                bubble.className = `pond-bubble pond-bubble--${number}`;
                surface.append(bubble);
            });

            ["one", "two", "three", "four"].forEach(number => {
                const fish = document.createElement("span");
                fish.className = `pond-fish pond-fish--${number}`;
                surface.append(fish);
                if (number === "one" || number === "two") {
                    const ripple = document.createElement("span");
                    ripple.className = `pond-ripple pond-ripple--${number}`;
                    surface.append(ripple);
                }
            });
            pond.append(bank, sand, surface);

            ["left", "right"].forEach(side => {
                const plant = document.createElement("span");
                plant.className = `pond-plant pond-plant--${side}`;
                plant.setAttribute("aria-hidden", "true");
                pond.append(plant);
            });

            ["one", "two", "three", "four", "five", "six", "eight"].forEach(number => {
                const grass = document.createElement("span");
                grass.className = `pond-grass pond-grass--${number}`;
                grass.setAttribute("aria-hidden", "true");
                pond.append(grass);
            });

            pond.style.left = `${position.xPx - 172}px`;
            pond.style.top = `${position.yPx - 88}px`;
            bank.style.backgroundPosition = `${-(position.xPx % 256)}px ${-(position.yPx % 256)}px`;
            world.append(pond);
        } catch (error) {
            console.error("Không thể đặt ao nước:", error);
        }
    };
    request.onerror = () => console.error("Không thể tải tọa độ ao nước.");
    request.send();
})();
