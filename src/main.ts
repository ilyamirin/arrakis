import { ArrakisGame } from "./game.js";
import { CanvasRenderer, loadAssets } from "./renderer.js";
import { BOARD_SIZE, type GameState } from "./types.js";
import { LocalWormBrain } from "./worm-brain.js";

const WORM_BRAIN_CONSENT_KEY = "arrakis.worm-brain-consent";

function boardLabel(x: number, y: number): string {
  return `${String.fromCharCode(65 + x)}${BOARD_SIZE - y}`;
}

function statusTitle(state: GameState): string {
  if (state.status === "won") {
    return "Harvest complete";
  }
  if (state.status === "lost") {
    if (state.lossReason === "worm_attack") {
      return "Harvester consumed";
    }
    return "Operation lost";
  }
  return "Harvest in progress";
}

function statusClass(state: GameState): string {
  if (state.status === "won") {
    return "status-won";
  }
  if (state.status === "lost") {
    return "status-lost";
  }
  return "status-playing";
}

type WormBrainConsent = "accepted" | "declined" | null;

function readWormBrainConsent(): WormBrainConsent {
  try {
    const value = window.localStorage.getItem(WORM_BRAIN_CONSENT_KEY);
    if (value === "accepted" || value === "declined") {
      return value;
    }
  } catch {
    return null;
  }

  return null;
}

function writeWormBrainConsent(value: Exclude<WormBrainConsent, null>): void {
  try {
    window.localStorage.setItem(WORM_BRAIN_CONSENT_KEY, value);
  } catch {
    // Ignore storage failures and keep the game functional.
  }
}

async function main(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
  const restartButton = document.querySelector<HTMLButtonElement>("#restart-button");
  const statusTitleElement = document.querySelector<HTMLElement>("#status-title");
  const statusMessageElement = document.querySelector<HTMLElement>("#status-message");
  const spiceValueElement = document.querySelector<HTMLElement>("#spice-value");
  const movesValueElement = document.querySelector<HTMLElement>("#moves-value");
  const positionValueElement = document.querySelector<HTMLElement>("#position-value");
  const wormBrainBanner = document.querySelector<HTMLElement>("#worm-brain-banner");
  const wormBrainAccept = document.querySelector<HTMLButtonElement>("#worm-brain-accept");
  const wormBrainDecline = document.querySelector<HTMLButtonElement>("#worm-brain-decline");

  if (
    !canvas ||
    !restartButton ||
    !statusTitleElement ||
    !statusMessageElement ||
    !spiceValueElement ||
    !movesValueElement ||
    !positionValueElement ||
    !wormBrainBanner ||
    !wormBrainAccept ||
    !wormBrainDecline
  ) {
    throw new Error("The UI shell is incomplete.");
  }

  const renderer = new CanvasRenderer(canvas, await loadAssets());
  const game = new ArrakisGame();
  const wormBrain = new LocalWormBrain(window.localStorage);
  let currentState = game.getState();

  const setAdaptiveWorm = (enabled: boolean): void => {
    game.setWormSpawnSelector(
      enabled ? (context) => wormBrain.chooseSpawnTarget(context) : null,
    );
  };

  const update = (state: GameState): void => {
    currentState = state;
    renderer.render(state);

    statusTitleElement.textContent = statusTitle(state);
    statusTitleElement.className = statusClass(state);
    statusMessageElement.textContent = state.message;

    spiceValueElement.textContent = `${state.collectedSpice} / ${state.totalSpice}`;
    movesValueElement.textContent = String(state.moves);
    positionValueElement.textContent = boardLabel(state.harvester.x, state.harvester.y);
  };

  const consent = readWormBrainConsent();
  if (consent === "accepted") {
    setAdaptiveWorm(true);
  } else if (!consent) {
    wormBrainBanner.hidden = false;
  }

  wormBrainAccept.addEventListener("click", () => {
    writeWormBrainConsent("accepted");
    setAdaptiveWorm(true);
    wormBrainBanner.hidden = true;
  });

  wormBrainDecline.addEventListener("click", () => {
    writeWormBrainConsent("declined");
    setAdaptiveWorm(false);
    wormBrainBanner.hidden = true;
  });

  restartButton.addEventListener("click", () => update(game.reset()));

  canvas.addEventListener("click", (event) => {
    const target = renderer.cellFromClientPoint(event.clientX, event.clientY);
    if (!target) {
      return;
    }

    if (readWormBrainConsent() === "accepted") {
      wormBrain.learnFromChoice(currentState, target);
    }

    update(game.moveTo(target));
  });

  window.addEventListener("resize", () => renderer.rerender());

  update(game.getState());
}

void main();
