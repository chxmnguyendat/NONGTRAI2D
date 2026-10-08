// Chuyển cảnh bằng lớp phủ tối để các màn hình đổi mượt hơn.
(() => {
    const overlay = document.querySelector("#scene-fade");
    const FADE_DURATION = (() => {
        const value = getComputedStyle(overlay).getPropertyValue("--scene-fade-duration").trim();
        const duration = Number.parseFloat(value);
        return value.endsWith("ms") ? duration : duration * 1000;
    })();
    let transitioning = false;

    function fade(changeScreen) {
        if (transitioning) return;
        transitioning = true;
        overlay.classList.add("is-active");
        window.setTimeout(() => {
            changeScreen();
            requestAnimationFrame(() => {
                overlay.classList.remove("is-active");
                window.setTimeout(() => { transitioning = false; }, FADE_DURATION);
            });
        }, FADE_DURATION);
    }

    function navigate(url) {
        if (transitioning) return;
        transitioning = true;
        overlay.classList.add("is-active");
        window.setTimeout(() => window.location.assign(url), FADE_DURATION);
    }

    window.SceneTransitions = Object.freeze({ fade, navigate });

    requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.remove("is-active")));
})();
