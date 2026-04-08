interface AudioBufferHandle {
  url: string;
  buffer: AudioBuffer | null;
  ready: boolean;
  failed: boolean;
  loading: Promise<void> | null;
}

type AudioConfigMap = Record<string, { url: string; volume?: number }>;

interface EffectHandle extends AudioBufferHandle {
  volume: number;
}

interface ActiveEffect {
  source: AudioBufferSourceNode;
  gain: GainNode;
}

const WebAudioCtor =
  window.AudioContext ??
  (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

let sharedContext: AudioContext | null = null;

function getSharedContext(): AudioContext {
  if (!WebAudioCtor) {
    throw new Error("Web Audio API is unavailable in this browser.");
  }

  sharedContext ??= new WebAudioCtor();
  return sharedContext;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

async function loadAudioBuffer(handle: AudioBufferHandle, context: AudioContext): Promise<void> {
  if (handle.ready || handle.failed) {
    return;
  }

  handle.loading ??= (async () => {
    try {
      const response = await fetch(handle.url);
      if (!response.ok) {
        throw new Error(`Audio fetch failed: ${response.status}`);
      }

      const data = await response.arrayBuffer();
      handle.buffer = await context.decodeAudioData(data.slice(0));
      handle.ready = true;
    } catch (error) {
      handle.failed = true;
      console.warn("Audio asset could not be loaded.", handle.url, error);
    }
  })();

  await handle.loading;
}

export class GameMusicController {
  private readonly context = getSharedContext();
  private readonly tracks: AudioBufferHandle[];
  private readonly outputGain: GainNode;
  private isUnlocked = false;
  private activeTrackIndex: number | null = null;
  private activeSource: AudioBufferSourceNode | null = null;
  private activeOffset = 0;
  private activeStartedAt = 0;
  private remainingIndices: number[] = [];

  constructor(trackUrls: string[], volume = 0.31) {
    this.outputGain = this.context.createGain();
    this.outputGain.gain.value = volume;
    this.outputGain.connect(this.context.destination);
    this.tracks = trackUrls.map((url, index) => this.createTrack(url, index));
    this.refillQueue();
  }

  public unlock(): void {
    this.isUnlocked = true;
    void this.context.resume().then(() => {
      this.tryPlayNext();
    });
  }

  public pause(): void {
    if (this.activeTrackIndex === null || this.activeSource === null) {
      return;
    }

    this.activeOffset = this.currentOffset();
    this.stopActiveSource();
  }

  public resume(): void {
    if (!this.isUnlocked) {
      return;
    }

    void this.context.resume().then(() => {
      if (this.activeTrackIndex === null) {
        this.tryPlayNext();
        return;
      }

      if (this.activeSource !== null) {
        return;
      }

      this.startTrack(this.activeTrackIndex, this.activeOffset);
    });
  }

  private createTrack(url: string, index: number): AudioBufferHandle {
    const handle: AudioBufferHandle = {
      url,
      buffer: null,
      ready: false,
      failed: false,
      loading: null,
    };

    void loadAudioBuffer(handle, this.context).then(() => {
      if (!handle.failed) {
        this.tryPlayNext();
      } else if (this.activeTrackIndex === index) {
        this.activeTrackIndex = null;
        this.activeOffset = 0;
        this.tryPlayNext();
      }
    });

    return handle;
  }

  private refillQueue(): void {
    this.remainingIndices = shuffle(
      this.tracks
        .map((track, index) => ({ track, index }))
        .filter(({ track }) => !track.failed)
        .map(({ index }) => index),
    );
  }

  private pickNextReadyTrack(): number | null {
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

  private currentOffset(): number {
    if (this.activeTrackIndex === null) {
      return 0;
    }

    const track = this.tracks[this.activeTrackIndex];
    const duration = track?.buffer?.duration ?? 0;
    if (duration <= 0) {
      return 0;
    }

    return (this.activeOffset + (this.context.currentTime - this.activeStartedAt)) % duration;
  }

  private stopActiveSource(): void {
    const source = this.activeSource;
    if (!source) {
      return;
    }

    source.onended = null;
    source.stop();
    source.disconnect();
    this.activeSource = null;
  }

  private startTrack(index: number, offset = 0): void {
    const track = this.tracks[index];
    if (!track?.buffer || track.failed) {
      this.activeTrackIndex = null;
      this.activeOffset = 0;
      this.tryPlayNext();
      return;
    }

    const source = this.context.createBufferSource();
    source.buffer = track.buffer;
    source.connect(this.outputGain);
    source.onended = () => {
      if (this.activeSource !== source) {
        return;
      }

      source.disconnect();
      this.activeSource = null;
      this.activeTrackIndex = null;
      this.activeOffset = 0;
      this.tryPlayNext();
    };

    this.activeTrackIndex = index;
    this.activeOffset = offset % track.buffer.duration;
    this.activeStartedAt = this.context.currentTime;
    this.activeSource = source;
    source.start(0, this.activeOffset);
  }

  private tryPlayNext(): void {
    if (!this.isUnlocked || this.activeSource !== null) {
      return;
    }

    const nextIndex = this.pickNextReadyTrack();
    if (nextIndex === null) {
      return;
    }

    this.startTrack(nextIndex, 0);
  }
}

export class GameSfxController {
  private readonly context = getSharedContext();
  private readonly effects: Record<string, EffectHandle>;
  private readonly outputGain: GainNode;
  private isUnlocked = false;
  private isSuppressed = false;
  private readonly activeEffects = new Set<ActiveEffect>();

  constructor(effectUrls: AudioConfigMap) {
    this.outputGain = this.context.createGain();
    this.outputGain.gain.value = 1;
    this.outputGain.connect(this.context.destination);
    this.effects = Object.fromEntries(
      Object.entries(effectUrls).map(([name, config]) => [name, this.createEffect(config.url, config.volume ?? 1)]),
    );
  }

  public unlock(): void {
    this.isUnlocked = true;
    void this.context.resume();
  }

  public pause(): void {
    this.isSuppressed = true;

    for (const effect of this.activeEffects) {
      effect.source.onended = null;
      effect.source.stop();
      effect.source.disconnect();
      effect.gain.disconnect();
    }

    this.activeEffects.clear();
  }

  public resume(): void {
    this.isSuppressed = false;
    if (this.isUnlocked) {
      void this.context.resume();
    }
  }

  public play(name: string, volumeScale = 1): void {
    if (!this.isUnlocked || this.isSuppressed) {
      return;
    }

    const effect = this.effects[name];
    if (!effect?.buffer || effect.failed) {
      return;
    }

    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    gain.gain.value = Math.max(0, Math.min(1, effect.volume * volumeScale));
    source.buffer = effect.buffer;
    source.connect(gain);
    gain.connect(this.outputGain);

    const activeEffect: ActiveEffect = { source, gain };
    this.activeEffects.add(activeEffect);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
      this.activeEffects.delete(activeEffect);
    };

    source.start();
  }

  private createEffect(url: string, volume: number): EffectHandle {
    const handle: EffectHandle = {
      url,
      buffer: null,
      ready: false,
      failed: false,
      loading: null,
      volume,
    };

    void loadAudioBuffer(handle, this.context);
    return handle;
  }
}
