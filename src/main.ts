import { AmberDunesGame } from "./game.js";
import {
  CanvasRenderer,
  loadAssets,
  type FlightAnimationFrame,
} from "./renderer.js";
import { BOARD_SIZE, type GameState, type Position } from "./types.js";
import { LocalSinkjawBrain } from "./sinkjaw-brain.js";

const SINKJAW_MEMORY_CONSENT_KEY = "amber-dunes-harvest.sinkjaw-consent";
const SKIMMER_FLIGHT_MS = 760;
const PICKUP_PHASE_END = 0.22;
const DROPOFF_PHASE_START = 0.8;

function boardLabel(x: number, y: number): string {
  return `${String.fromCharCode(65 + x)}${BOARD_SIZE - y}`;
}

function statusTitle(state: GameState): string {
  if (state.status === "won") {
    return "Amber secured";
  }
  if (state.status === "lost") {
    if (state.lossReason === "sinkjaw_attack") {
      return "Collector consumed";
    }
    return "Route lost";
  }
  return "Run in progress";
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

type SinkjawMemoryConsent = "accepted" | "declined" | null;

function readSinkjawMemoryConsent(): SinkjawMemoryConsent {
  try {
    const value = window.localStorage.getItem(SINKJAW_MEMORY_CONSENT_KEY);
    if (value === "accepted" || value === "declined") {
      return value;
    }
  } catch {
    return null;
  }

  return null;
}

function writeSinkjawMemoryConsent(value: Exclude<SinkjawMemoryConsent, null>): void {
  try {
    window.localStorage.setItem(SINKJAW_MEMORY_CONSENT_KEY, value);
  } catch {
    // Ignore storage failures and keep the game functional.
  }
}

function lerp(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}

function interpolatePosition(from: Position, to: Position, progress: number): Position {
  return {
    x: lerp(from.x, to.x, progress),
    y: lerp(from.y, to.y, progress),
  };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function easeInOutCubic(value: number): number {
  return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function easeOutCubic(value: number): number {
  return 1 - Math.pow(1 - value, 3);
}

function easeInCubic(value: number): number {
  return value * value * value;
}

function normalizeVector(deltaX: number, deltaY: number): Position {
  const length = Math.hypot(deltaX, deltaY) || 1;
  return {
    x: deltaX / length,
    y: deltaY / length,
  };
}

function buildFlightFrame(source: Position, target: Position, progress: number): FlightAnimationFrame {
  const direction = normalizeVector(target.x - source.x, target.y - source.y);
  const perpendicular = { x: -direction.y, y: direction.x };
  const heading = Math.atan2(direction.y, direction.x);
  const approachStart = {
    x: source.x - direction.x * 2.7,
    y: source.y - direction.y * 2.7,
  };
  const departureEnd = {
    x: target.x + direction.x * 2.35,
    y: target.y + direction.y * 2.35,
  };

  if (progress <= PICKUP_PHASE_END) {
    const phaseProgress = easeOutCubic(progress / PICKUP_PHASE_END);
    return {
      activeTarget: target,
      carrier: interpolatePosition(approachStart, source, phaseProgress),
      heading,
      carriedCollector: null,
      landedCollector: null,
    };
  }

  if (progress < DROPOFF_PHASE_START) {
    const phaseProgress = easeInOutCubic(
      (progress - PICKUP_PHASE_END) / (DROPOFF_PHASE_START - PICKUP_PHASE_END),
    );
    const basePosition = interpolatePosition(source, target, phaseProgress);
    const lift = Math.sin(phaseProgress * Math.PI) * 0.34;
    const carrier = {
      x: basePosition.x + perpendicular.x * lift,
      y: basePosition.y + perpendicular.y * lift,
    };

    return {
      activeTarget: target,
      carrier,
      heading,
      carriedCollector: {
        x: carrier.x,
        y: carrier.y + 0.12,
      },
      landedCollector: null,
    };
  }

  const phaseProgress = easeInCubic(
    (progress - DROPOFF_PHASE_START) / (1 - DROPOFF_PHASE_START),
  );
  return {
    activeTarget: target,
    carrier: interpolatePosition(target, departureEnd, phaseProgress),
    heading,
    carriedCollector: null,
    landedCollector: target,
  };
}

async function main(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
  const restartButton = document.querySelector<HTMLButtonElement>("#restart-button");
  const statusTitleElement = document.querySelector<HTMLElement>("#status-title");
  const statusMessageElement = document.querySelector<HTMLElement>("#status-message");
  const amberValueElement = document.querySelector<HTMLElement>("#amber-value");
  const movesValueElement = document.querySelector<HTMLElement>("#moves-value");
  const positionValueElement = document.querySelector<HTMLElement>("#position-value");
  const sinkjawMemoryBanner = document.querySelector<HTMLElement>("#sinkjaw-memory-banner");
  const sinkjawMemoryAccept = document.querySelector<HTMLButtonElement>("#sinkjaw-memory-accept");
  const sinkjawMemoryDecline = document.querySelector<HTMLButtonElement>("#sinkjaw-memory-decline");

  if (
    !canvas ||
    !restartButton ||
    !statusTitleElement ||
    !statusMessageElement ||
    !amberValueElement ||
    !movesValueElement ||
    !positionValueElement ||
    !sinkjawMemoryBanner ||
    !sinkjawMemoryAccept ||
    !sinkjawMemoryDecline
  ) {
    throw new Error("The UI shell is incomplete.");
  }

  const renderer = new CanvasRenderer(canvas, await loadAssets());
  const game = new AmberDunesGame();
  const sinkjawBrain = new LocalSinkjawBrain(window.localStorage);
  let currentState = game.getState();
  let activeFlight:
    | {
        source: Position;
        target: Position;
        startedAt: number;
        animationFrameId: number | null;
      }
    | null = null;

  const setAdaptiveWorm = (enabled: boolean): void => {
    game.setSinkjawSpawnSelector(
      enabled ? (context) => sinkjawBrain.chooseSpawnTarget(context) : null,
    );
  };

  const renderView = (now = performance.now()): void => {
    const flight = activeFlight;
    const animation =
      flight === null
        ? null
        : buildFlightFrame(
            flight.source,
            flight.target,
            clamp01((now - flight.startedAt) / SKIMMER_FLIGHT_MS),
          );

    renderer.render(currentState, animation);

    if (animation && flight) {
      statusTitleElement.textContent = "Skimmer in transit";
      statusTitleElement.className = "status-playing";
      statusMessageElement.textContent =
        `Skimmer переносит Collector в сектор ${boardLabel(flight.target.x, flight.target.y)}.`;
    } else {
      statusTitleElement.textContent = statusTitle(currentState);
      statusTitleElement.className = statusClass(currentState);
      statusMessageElement.textContent = currentState.message;
    }

    amberValueElement.textContent = `${currentState.collectedAmber} / ${currentState.totalAmber}`;
    movesValueElement.textContent = String(currentState.moves);
    positionValueElement.textContent = animation && flight
      ? `${boardLabel(currentState.collector.x, currentState.collector.y)} -> ${boardLabel(flight.target.x, flight.target.y)}`
      : boardLabel(currentState.collector.x, currentState.collector.y);
  };

  const stopFlight = (): void => {
    const flight = activeFlight;
    if (flight && flight.animationFrameId !== null) {
      window.cancelAnimationFrame(flight.animationFrameId);
    }
    activeFlight = null;
  };

  const update = (state: GameState): void => {
    currentState = state;
    renderView();
  };

  const startFlight = (target: Position): void => {
    const source = { ...currentState.collector };
    activeFlight = {
      source,
      target: { ...target },
      startedAt: performance.now(),
      animationFrameId: null,
    };

    const step = (now: number): void => {
      if (!activeFlight) {
        return;
      }

      renderView(now);

      if (now - activeFlight.startedAt < SKIMMER_FLIGHT_MS) {
        activeFlight.animationFrameId = window.requestAnimationFrame(step);
        return;
      }

      const destination = { ...activeFlight.target };
      stopFlight();
      update(game.moveTo(destination));
    };

    renderView(activeFlight.startedAt);
    activeFlight.animationFrameId = window.requestAnimationFrame(step);
  };

  const consent = readSinkjawMemoryConsent();
  if (consent === "accepted") {
    setAdaptiveWorm(true);
  } else if (!consent) {
    sinkjawMemoryBanner.hidden = false;
  }

  sinkjawMemoryAccept.addEventListener("click", () => {
    writeSinkjawMemoryConsent("accepted");
    setAdaptiveWorm(true);
    sinkjawMemoryBanner.hidden = true;
  });

  sinkjawMemoryDecline.addEventListener("click", () => {
    writeSinkjawMemoryConsent("declined");
    setAdaptiveWorm(false);
    sinkjawMemoryBanner.hidden = true;
  });

  restartButton.addEventListener("click", () => {
    stopFlight();
    update(game.reset());
  });

  canvas.addEventListener("click", (event) => {
    if (activeFlight) {
      return;
    }

    const target = renderer.cellFromClientPoint(event.clientX, event.clientY);
    if (!target) {
      return;
    }

    const isValidMove = currentState.validMoves.some(
      (move) => move.target.x === target.x && move.target.y === target.y,
    );

    if (!isValidMove) {
      update(game.moveTo(target));
      return;
    }

    if (readSinkjawMemoryConsent() === "accepted") {
      sinkjawBrain.learnFromChoice(currentState, target);
    }

    startFlight(target);
  });

  window.addEventListener("resize", () => renderView());

  update(game.getState());
}

void main();
