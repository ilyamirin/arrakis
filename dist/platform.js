import { normalizeLocale } from "./i18n.js";
function shouldLoadSdk() {
    const sdkMode = new URLSearchParams(window.location.search).get("yandex-sdk");
    if (sdkMode === "relative") {
        return true;
    }
    return window.location.hostname.includes("yandex");
}
function sdkUrl() {
    return "/sdk.js";
}
async function ensureSdkScript() {
    if (window.YaGames) {
        return;
    }
    await new Promise((resolve, reject) => {
        const existingScript = document.querySelector('script[data-ya-games-sdk="true"]');
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
    locale;
    ysdk;
    gameplayActive = false;
    constructor(ysdk, locale) {
        this.ysdk = ysdk;
        this.locale = locale;
    }
    static async init() {
        let ysdk = null;
        if (shouldLoadSdk()) {
            try {
                await ensureSdkScript();
                ysdk = (await window.YaGames?.init()) ?? null;
            }
            catch (error) {
                console.warn("Yandex Games SDK is unavailable. Falling back to browser mode.", error);
            }
        }
        const locale = normalizeLocale(ysdk?.environment?.i18n?.lang ?? navigator.language);
        return new PlatformBridge(ysdk, locale);
    }
    markReady() {
        this.ysdk?.features?.LoadingAPI?.ready();
    }
    setGameplayActive(isActive) {
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
    bindPauseResume(onPause, onResume) {
        this.ysdk?.on?.("game_api_pause", onPause);
        this.ysdk?.on?.("game_api_resume", onResume);
        return () => {
            this.ysdk?.off?.("game_api_pause", onPause);
            this.ysdk?.off?.("game_api_resume", onResume);
        };
    }
}
