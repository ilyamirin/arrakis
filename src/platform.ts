import { normalizeLocale, type Locale } from "./i18n.js";

interface YandexGamesSdk {
  environment?: {
    i18n?: {
      lang?: string;
    };
  };
  features?: {
    LoadingAPI?: {
      ready: () => void;
    };
    GameplayAPI?: {
      start: () => void;
      stop: () => void;
    };
  };
  adv?: {
    showFullscreenAdv: (options?: {
      callbacks?: {
        onOpen?: () => void;
        onClose?: (wasShown: boolean) => void;
        onError?: (error: unknown) => void;
        onOffline?: () => void;
      };
    }) => void;
  };
  on?: (event: "game_api_pause" | "game_api_resume", handler: () => void) => void;
  off?: (event: "game_api_pause" | "game_api_resume", handler: () => void) => void;
}

declare global {
  interface Window {
    YaGames?: {
      init: () => Promise<YandexGamesSdk>;
    };
  }
}

function shouldLoadSdk(): boolean {
  const sdkMode = new URLSearchParams(window.location.search).get("yandex-sdk");
  if (sdkMode === "relative") {
    return true;
  }

  const hostname = window.location.hostname;
  return (
    hostname.includes("yandex") ||
    hostname === "localhost" ||
    hostname === "127.0.0.1"
  );
}

function sdkUrl(): string {
  return "/sdk.js";
}

async function ensureSdkScript(): Promise<void> {
  if (window.YaGames) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[data-ya-games-sdk="true"]');
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("SDK script failed to load.")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = sdkUrl();
    script.async = true;
    script.dataset.yaGamesSdk = "true";
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("SDK script failed to load.")), {
      once: true,
    });
    document.head.append(script);
  });
}

export class PlatformBridge {
  public readonly locale: Locale;
  private readonly ysdk: YandexGamesSdk | null;
  private gameplayActive = false;

  private constructor(ysdk: YandexGamesSdk | null, locale: Locale) {
    this.ysdk = ysdk;
    this.locale = locale;
  }

  public static async init(): Promise<PlatformBridge> {
    let ysdk: YandexGamesSdk | null = null;

    if (shouldLoadSdk()) {
      try {
        await ensureSdkScript();
        ysdk = (await window.YaGames?.init()) ?? null;
      } catch (error) {
        console.warn("Yandex Games SDK is unavailable. Falling back to browser mode.", error);
      }
    }

    const locale = normalizeLocale(ysdk?.environment?.i18n?.lang ?? navigator.language);
    return new PlatformBridge(ysdk, locale);
  }

  public markReady(): void {
    this.ysdk?.features?.LoadingAPI?.ready();
  }

  public setGameplayActive(isActive: boolean): void {
    if (this.gameplayActive === isActive) {
      return;
    }

    this.gameplayActive = isActive;
    if (isActive) {
      this.ysdk?.features?.GameplayAPI?.start();
      return;
    }

    this.ysdk?.features?.GameplayAPI?.stop();
  }

  public bindPauseResume(onPause: () => void, onResume: () => void): () => void {
    this.ysdk?.on?.("game_api_pause", onPause);
    this.ysdk?.on?.("game_api_resume", onResume);

    return () => {
      this.ysdk?.off?.("game_api_pause", onPause);
      this.ysdk?.off?.("game_api_resume", onResume);
    };
  }

  public async showInterstitial(): Promise<boolean> {
    const adv = this.ysdk?.adv;
    if (!adv?.showFullscreenAdv) {
      return false;
    }

    return await new Promise<boolean>((resolve) => {
      let settled = false;
      const finish = (wasShown: boolean): void => {
        if (settled) {
          return;
        }
        settled = true;
        resolve(wasShown);
      };

      try {
        adv.showFullscreenAdv({
          callbacks: {
            onClose: (wasShown) => finish(wasShown),
            onError: () => finish(false),
            onOffline: () => finish(false),
          },
        });
      } catch (error) {
        console.warn("Interstitial ad could not be shown.", error);
        finish(false);
      }
    });
  }
}
