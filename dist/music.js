function shuffle(items) {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
}
export class GameMusicController {
    tracks;
    volume;
    isUnlocked = false;
    isStopped = false;
    activeTrackIndex = null;
    remainingIndices = [];
    constructor(trackUrls, volume = 0.31) {
        this.volume = volume;
        this.tracks = trackUrls.map((url, index) => this.createTrack(url, index));
        this.refillQueue();
    }
    unlock() {
        this.isUnlocked = true;
        this.tryPlayNext();
    }
    pause() {
        if (this.activeTrackIndex === null) {
            return;
        }
        this.tracks[this.activeTrackIndex]?.audio.pause();
    }
    resume() {
        if (!this.isUnlocked || this.isStopped) {
            return;
        }
        if (this.activeTrackIndex === null) {
            this.tryPlayNext();
            return;
        }
        const activeTrack = this.tracks[this.activeTrackIndex];
        if (!activeTrack) {
            this.tryPlayNext();
            return;
        }
        void activeTrack.audio.play().catch(() => {
            this.activeTrackIndex = null;
            this.tryPlayNext();
        });
    }
    createTrack(url, index) {
        const audio = new Audio(url);
        audio.preload = "auto";
        audio.loop = false;
        audio.volume = this.volume;
        const handle = {
            audio,
            ready: audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA,
            failed: false,
        };
        const markReady = () => {
            handle.ready = true;
            this.tryPlayNext();
        };
        const markFailed = () => {
            handle.failed = true;
            if (this.activeTrackIndex === index) {
                this.activeTrackIndex = null;
            }
            this.tryPlayNext();
        };
        audio.addEventListener("canplay", markReady);
        audio.addEventListener("ended", () => {
            if (this.activeTrackIndex !== index) {
                return;
            }
            this.activeTrackIndex = null;
            this.tryPlayNext();
        });
        audio.addEventListener("error", markFailed);
        audio.load();
        return handle;
    }
    refillQueue() {
        const playableIndices = this.tracks
            .map((track, index) => ({ track, index }))
            .filter(({ track }) => !track.failed)
            .map(({ index }) => index);
        this.remainingIndices = shuffle(playableIndices);
    }
    pickNextReadyTrack() {
        if (this.remainingIndices.length === 0) {
            this.refillQueue();
        }
        const readyCandidates = this.remainingIndices.filter((index) => this.tracks[index]?.ready);
        if (readyCandidates.length === 0) {
            return null;
        }
        const nextIndex = readyCandidates[Math.floor(Math.random() * readyCandidates.length)];
        this.remainingIndices = this.remainingIndices.filter((index) => index !== nextIndex);
        return nextIndex;
    }
    tryPlayNext() {
        if (this.isStopped || !this.isUnlocked || this.activeTrackIndex !== null) {
            return;
        }
        const nextIndex = this.pickNextReadyTrack();
        if (nextIndex === null) {
            return;
        }
        const nextTrack = this.tracks[nextIndex];
        nextTrack.audio.currentTime = 0;
        this.activeTrackIndex = nextIndex;
        void nextTrack.audio.play().catch(() => {
            if (this.activeTrackIndex === nextIndex) {
                this.activeTrackIndex = null;
            }
        });
    }
}
export class GameSfxController {
    effects;
    isUnlocked = false;
    isSuppressed = false;
    activeEffects = new Set();
    constructor(effectUrls) {
        this.effects = Object.fromEntries(Object.entries(effectUrls).map(([name, config]) => [name, this.createEffect(config.url, config.volume ?? 1)]));
    }
    unlock() {
        this.isUnlocked = true;
    }
    pause() {
        this.isSuppressed = true;
        for (const audio of this.activeEffects) {
            audio.pause();
            audio.currentTime = 0;
        }
        this.activeEffects.clear();
    }
    resume() {
        this.isSuppressed = false;
    }
    play(name, volumeScale = 1) {
        if (!this.isUnlocked || this.isSuppressed) {
            return;
        }
        const effect = this.effects[name];
        if (!effect || effect.failed) {
            return;
        }
        const audio = effect.audio.cloneNode(true);
        audio.volume = Math.max(0, Math.min(1, effect.volume * volumeScale));
        audio.currentTime = 0;
        this.activeEffects.add(audio);
        audio.addEventListener("ended", () => {
            this.activeEffects.delete(audio);
        }, { once: true });
        audio.addEventListener("pause", () => {
            if (audio.currentTime === 0 || audio.ended) {
                this.activeEffects.delete(audio);
            }
        }, { once: true });
        void audio.play().catch(() => { });
    }
    createEffect(url, volume) {
        const audio = new Audio(url);
        audio.preload = "auto";
        const handle = {
            audio,
            ready: audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA,
            failed: false,
            volume,
        };
        audio.addEventListener("canplay", () => {
            handle.ready = true;
        });
        audio.addEventListener("error", () => {
            handle.failed = true;
        });
        audio.load();
        return handle;
    }
}
