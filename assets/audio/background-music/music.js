// Nhạc nền gốc của nông trại, phát lặp khi vào game.
(() => {
    const audio = document.querySelector("#background-music");
    const toggle = document.querySelector("#music-toggle");
    const volumeSlider = document.querySelector("#music-volume");
    const volumeValue = document.querySelector("#music-volume-value");
    const preferenceKey = "nongtrai2d-background-music-enabled-v1";
    const volumePreferenceKey = "nongtrai2d-background-music-volume-v1";
    let enabled = true;
    let isPlaying = false;
    let audioContext = null;
    let backgroundSource = null;
    let backgroundGain = null;
    let fallbackBuffer = null;
    let volume = 0.4;
    try {
        enabled = localStorage.getItem(preferenceKey) !== "false";
    } catch (error) {
        console.warn("Không thể đọc tùy chọn nhạc nền trên thiết bị này.", error);
    }
    try {
        const savedVolume = Number(localStorage.getItem(volumePreferenceKey));
        if (localStorage.getItem(volumePreferenceKey) !== null && Number.isFinite(savedVolume)) {
            volume = Math.min(1, Math.max(0, savedVolume / 100));
        }
    } catch (error) {
        console.warn("Không thể đọc âm lượng nhạc nền đã lưu.", error);
    }

    const usesLocalFileFallback = window.location.protocol === "file:";
    audio.volume = volume;
    volumeSlider.value = String(Math.round(volume * 100));
    volumeValue.value = `${volumeSlider.value}%`;

    if (usesLocalFileFallback) {
        audio.removeAttribute("src");
        audio.querySelectorAll("source").forEach(source => source.remove());
        audio.load();
    }

    function isGameReady() {
        return window.GameSave?.hasCurrentWorld() && window.PlayerProfile?.isProfileReady();
    }

    function updateButton() {
        const canStop = enabled && (usesLocalFileFallback
            ? audioContext?.state === "running" && Boolean(backgroundSource)
            : isPlaying && !audio.paused);
        toggle.textContent = canStop ? "Tắt nhạc nền" : "Bật nhạc nền";
        toggle.setAttribute("aria-pressed", String(canStop));
    }

    function savePreference() {
        try {
            localStorage.setItem(preferenceKey, String(enabled));
        } catch (error) {
            console.warn("Không thể lưu tùy chọn nhạc nền trên thiết bị này.", error);
        }
    }

    function setVolume(value, shouldSave = true) {
        volume = Math.min(1, Math.max(0, value / 100));
        audio.volume = volume;
        if (backgroundGain) backgroundGain.gain.setTargetAtTime(volume, audioContext.currentTime, 0.02);
        volumeSlider.value = String(Math.round(volume * 100));
        volumeValue.value = `${volumeSlider.value}%`;
        if (shouldSave) {
            try {
                localStorage.setItem(volumePreferenceKey, volumeSlider.value);
            } catch (error) {
                console.warn("Không thể lưu âm lượng nhạc nền.", error);
            }
        }
    }

    function start(force = false) {
        if (!enabled || (!force && !isGameReady())) return;
        if (usesLocalFileFallback) {
            startLocalFileFallback();
            return;
        }
        audio.play().then(updateButton).catch(error => {
            if (error.name !== "NotAllowedError" && error.name !== "AbortError") {
                console.error("Không thể phát nhạc nền.", error);
            }
            updateButton();
        });
    }

    function createFallbackBuffer() {
        const sampleRate = 22050;
        const bpm = 84;
        const beat = 60 / bpm;
        const bar = beat * 4;
        const chords = [
            [48, 55, 60, 64], [43, 50, 55, 59],
            [45, 52, 57, 60], [41, 48, 53, 57],
            [48, 55, 60, 64], [43, 50, 55, 59],
            [41, 48, 53, 57], [43, 50, 55, 59]
        ];
        const melodies = [
            [72, -1, 76, 79, -1, 76, 72, -1],
            [74, -1, 79, 83, 79, -1, 76, -1],
            [72, -1, 76, 81, -1, 79, 76, -1],
            [74, -1, 79, 81, 79, -1, 74, -1],
            [72, -1, 76, 79, 84, -1, 79, -1],
            [83, -1, 79, 76, -1, 74, 76, -1],
            [81, -1, 79, 76, -1, 72, 76, -1],
            [79, -1, 76, 74, 71, -1, 74, -1]
        ];
        const frames = Math.round(bar * chords.length * sampleRate);
        const buffer = audioContext.createBuffer(1, frames, sampleRate);
        const samples = buffer.getChannelData(0);
        const frequency = midi => 440 * Math.pow(2, (midi - 69) / 12);

        for (let index = 0; index < frames; index += 1) {
            const time = index / sampleRate;
            const barIndex = Math.min(chords.length - 1, Math.floor(time / bar));
            const inBar = time - barIndex * bar;
            let value = 0;

            for (const note of chords[barIndex]) {
                const noteFrequency = frequency(note);
                const envelope = Math.min(1, inBar / 0.45) * Math.min(1, (bar - inBar) / 0.55);
                value += envelope * (
                    Math.sin(2 * Math.PI * noteFrequency * time) * 0.023 +
                    Math.sin(2 * Math.PI * noteFrequency * 2.01 * time) * 0.004
                );
            }

            const beatPhase = inBar % beat;
            const bassEnvelope = Math.min(1, beatPhase / 0.025) * Math.exp(-beatPhase * 1.4);
            value += Math.sin(2 * Math.PI * frequency(chords[barIndex][0] - 12) * time) * bassEnvelope * 0.065;

            const step = Math.min(7, Math.floor(inBar / (beat / 2)));
            const melodyNote = melodies[barIndex][step];
            if (melodyNote >= 0) {
                const noteTime = inBar - step * (beat / 2);
                const noteEnvelope = Math.min(1, noteTime / 0.012) * Math.exp(-noteTime * 4);
                const noteFrequency = frequency(melodyNote);
                value += noteEnvelope * (
                    Math.sin(2 * Math.PI * noteFrequency * time) * 0.045 +
                    Math.sin(2 * Math.PI * noteFrequency * 2.76 * time) * 0.008
                );
            }
            samples[index] = Math.tanh(value * 1.5) * 0.82 * 3;
        }

        const fadeFrames = Math.floor(0.65 * sampleRate);
        for (let index = 0; index < fadeFrames; index += 1) {
            const blend = index / fadeFrames;
            const tailIndex = frames - fadeFrames + index;
            samples[tailIndex] = samples[tailIndex] * (1 - blend) + samples[index] * blend;
        }
        return buffer;
    }

    function startLocalFileFallback() {
        const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextConstructor) {
            console.error("Trình duyệt này không hỗ trợ phát nhạc nền bằng Web Audio.");
            return;
        }
        if (!audioContext) {
            audioContext = new AudioContextConstructor();
            audioContext.addEventListener("statechange", updateButton);
        }
        if (!fallbackBuffer) fallbackBuffer = createFallbackBuffer();

        audioContext.resume().then(() => {
            if (!enabled || backgroundSource || audioContext.state !== "running") {
                updateButton();
                return;
            }
            const source = audioContext.createBufferSource();
            backgroundGain = audioContext.createGain();
            backgroundGain.gain.value = volume;
            source.buffer = fallbackBuffer;
            source.loop = true;
            source.connect(backgroundGain);
            backgroundGain.connect(audioContext.destination);
            source.addEventListener("ended", () => {
                if (backgroundSource !== source) return;
                backgroundSource = null;
                backgroundGain = null;
                isPlaying = false;
                updateButton();
            }, { once: true });
            backgroundSource = source;
            source.start();
            isPlaying = true;
            updateButton();
        }).catch(error => {
            isPlaying = false;
            updateButton();
            if (error.name !== "NotAllowedError" && error.name !== "AbortError") {
                console.error("Không thể khởi động bộ phát nhạc nền.", error);
            }
        });
    }

    function stop() {
        enabled = false;
        savePreference();
        if (usesLocalFileFallback) {
            if (backgroundSource) {
                backgroundSource.stop();
                backgroundSource.disconnect();
                backgroundSource = null;
                backgroundGain?.disconnect();
                backgroundGain = null;
            }
            isPlaying = false;
        } else {
            audio.pause();
            isPlaying = false;
        }
        updateButton();
    }

    toggle.addEventListener("click", () => {
        if (enabled && isPlaying) {
            stop();
            return;
        }
        enabled = true;
        savePreference();
        start();
    });
    volumeSlider.addEventListener("input", () => setVolume(Number(volumeSlider.value)));

    document.addEventListener("pointerdown", event => {
        if (!isPlaying && !event.target.closest("#music-toggle")) start();
    });
    document.addEventListener("keydown", event => {
        if (!isPlaying && !event.target.closest("#music-toggle")) start();
    });
    window.addEventListener("farmgame:begin", () => start(true));
    audio.addEventListener("playing", () => {
        isPlaying = true;
        updateButton();
    });
    audio.addEventListener("pause", () => {
        isPlaying = false;
        updateButton();
    });
    audio.addEventListener("error", () => {
        isPlaying = false;
        updateButton();
        console.error("Không thể tải tệp nhạc nền.", audio.error);
    });

    updateButton();
    start();
})();
