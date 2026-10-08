// Va chạm vật thể: hàng rào, thân cây, nhà kho, NPC và ao nước chặn người chơi.
(() => {
    function toWorldRect(element, worldRect, scaleX, scaleY, inset = {}) {
        const rect = element.getBoundingClientRect();
        const left = rect.left + rect.width * (inset.left || 0);
        const top = rect.top + rect.height * (inset.top || 0);
        const width = rect.width * (1 - (inset.left || 0) - (inset.right || 0));
        const height = rect.height * (1 - (inset.top || 0) - (inset.bottom || 0));

        return {
            left: (left - worldRect.left) / scaleX,
            top: (top - worldRect.top) / scaleY,
            right: (left + width - worldRect.left) / scaleX,
            bottom: (top + height - worldRect.top) / scaleY
        };
    }

    window.FenceCollision = {
        getObstacles(world) {
            const worldRect = world.getBoundingClientRect();
            const scaleX = worldRect.width / world.offsetWidth || 1;
            const scaleY = worldRect.height / world.offsetHeight || 1;
            const obstacles = [...document.querySelectorAll('[data-fence-collision="solid"] .fence-run')]
                .map(run => toWorldRect(run, worldRect, scaleX, scaleY));

            document.querySelectorAll(".storage").forEach(storage => {
                obstacles.push(toWorldRect(storage, worldRect, scaleX, scaleY, {
                    left: 0.08,
                    top: 0.25,
                    right: 0.08
                }));
            });

            document.querySelectorAll(".apple-tree-sprite").forEach(tree => {
                obstacles.push(toWorldRect(tree, worldRect, scaleX, scaleY, {
                    left: 0.39,
                    top: 0.78,
                    right: 0.39
                }));
            });

            document.querySelectorAll(".npc-nongdan-nha").forEach(npc => {
                obstacles.push(toWorldRect(npc, worldRect, scaleX, scaleY, {
                    left: 0.15,
                    top: 0.8,
                    right: 0.15
                }));
            });

            document.querySelectorAll(".pond-water").forEach(pond => {
                obstacles.push(toWorldRect(pond, worldRect, scaleX, scaleY));
            });

            document.querySelectorAll(".pond-sign").forEach(sign => {
                obstacles.push(toWorldRect(sign, worldRect, scaleX, scaleY, {
                    left: 0.35,
                    top: 0.48,
                    right: 0.35
                }));
            });

            return obstacles;
        },

        canOccupy(world, x, y, width, height, obstacles = this.getObstacles(world)) {
            return obstacles.every(obstacle =>
                x + width <= obstacle.left ||
                x >= obstacle.right ||
                y + height <= obstacle.top ||
                y >= obstacle.bottom
            );
        }
    };
})();
