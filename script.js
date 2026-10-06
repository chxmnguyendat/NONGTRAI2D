const player = document.querySelector(".player");
const game = document.querySelector(".game");

let x = 375;
let y = 220;

let targetX = x;
let targetY = y;

game.addEventListener("pointerdown", function(event) {

    const gameRect = game.getBoundingClientRect();

    targetX = event.clientX - gameRect.left;
    targetY = event.clientY - gameRect.top;

});

function movePlayer() {

    const speed = 2;

    const dx = targetX - x;
    const dy = targetY - y;

    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 1) {

        const newX = x + (dx / distance) * speed;
        const newY = y + (dy / distance) * speed;

        const house = document.querySelector(".house");

        const playerWidth = player.offsetWidth;
        const playerHeight = player.offsetHeight;

        const houseLeft = house.offsetLeft;
        const houseTop = house.offsetTop;
        const houseRight = houseLeft + house.offsetWidth;
        const houseBottom = houseTop + house.offsetHeight;

        const playerRight = newX + playerWidth;
        const playerBottom = newY + playerHeight;

        const collision =
            newX < houseRight &&
            playerRight > houseLeft &&
            newY < houseBottom &&
            playerBottom > houseTop;

        if (!collision) {
            x = newX;
            y = newY;
        }

        const maxX = game.clientWidth - playerWidth;
        const maxY = game.clientHeight - playerHeight;

        x = Math.max(0, Math.min(x, maxX));
        y = Math.max(0, Math.min(y, maxY));

        player.style.left = x + "px";
        player.style.top = y + "px";
    }

    requestAnimationFrame(movePlayer);
}

movePlayer();