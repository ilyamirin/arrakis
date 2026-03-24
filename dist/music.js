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
    constructor(trackUrls, volume = 0.42) {
        this.volume = volume;
        this.tracks = trackUrls.map((url, index) => this.createTrack(url, index));
        this.refillQueue();
    }
    unlock() {
        this.isUnlocked = true;
        this.tryPlayNext();
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
