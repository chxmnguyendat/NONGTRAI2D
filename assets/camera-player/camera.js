// CAMERA GAME: bám theo nhân vật và tự đọc kích thước map từ phần tử .world.
(() => {
    window.FarmCamera = {
        follow(game, world, player, playerX, playerY) {
            const zoom = Number(window.FarmCameraZoom) || 1;
            const mapWidth = world.offsetWidth;
            const mapHeight = world.offsetHeight;
            const playerWidth = player.offsetWidth * 1.5;
            const playerHeight = player.offsetHeight * 1.5;
            const scaledMapWidth = mapWidth * zoom;
            const scaledMapHeight = mapHeight * zoom;
            const minX = Math.min(0, game.clientWidth - scaledMapWidth);
            const minY = Math.min(0, game.clientHeight - scaledMapHeight);
            // Luôn đặt tâm nhân vật vào tâm màn hình; chỉ lệch tâm khi camera chạm mép map.
            const cameraX = Math.max(minX, Math.min(0, game.clientWidth / 2 - (playerX + playerWidth / 2) * zoom));
            const cameraY = Math.max(minY, Math.min(0, game.clientHeight / 2 - (playerY + playerHeight / 2) * zoom));

            world.style.transformOrigin = "top left";
            world.style.transform = `translate3d(${cameraX}px, ${cameraY}px, 0) scale(${zoom})`;
        }
    };
})();
