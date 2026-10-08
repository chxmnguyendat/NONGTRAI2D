// Snapshot paired with player-control-backup.js, captured before pathfinding changes.
// Restore this file to data-1/fence.js together with the player control backup if needed.
// Va chạm hàng rào: mọi .fence-run trong enclosure có data-fence-collision="solid" đều chặn người chơi.
(() => {
    window.FenceCollision = {
        canOccupy(world, x, y, width, height) {
            const worldRect = world.getBoundingClientRect();
            const scaleX = worldRect.width / world.offsetWidth || 1;
            const scaleY = worldRect.height / world.offsetHeight || 1;
            const fenceRuns = document.querySelectorAll(
                '[data-fence-collision="solid"] .fence-run'
            );

            return [...fenceRuns].every(run => {
                const rect = run.getBoundingClientRect();
                const left = (rect.left - worldRect.left) / scaleX;
                const top = (rect.top - worldRect.top) / scaleY;
                const right = left + rect.width / scaleX;
                const bottom = top + rect.height / scaleY;

                return x + width <= left || x >= right || y + height <= top || y >= bottom;
            });
        }
    };
})();
