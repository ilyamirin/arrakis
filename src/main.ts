import { AmberDunesGame } from "./game.js";
import { GameMusicController } from "./music.js";
import {
  CanvasRenderer,
  loadAssets,
  type FlightAnimationFrame,
} from "./renderer.js";
import { BOARD_SIZE, type GameState, type MoveOption, type Position } from "./types.js";
const SKIMMER_FLIGHT_MS = 760;
const PICKUP_PHASE_END = 0.22;
const DROPOFF_PHASE_START = 0.8;
const DEFAULT_PILOT_MESSAGE =
  "Sweep the lit squares for the pilot's read.";

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
    return "Road gone dark";
  }
  return "Run underway";
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
  const pilotMessageElement = document.querySelector<HTMLElement>("#pilot-message");

  if (
    !canvas ||
    !restartButton ||
    !statusTitleElement ||
    !statusMessageElement ||
    !amberValueElement ||
    !movesValueElement ||
    !positionValueElement ||
    !pilotMessageElement
  ) {
    throw new Error("The UI shell is incomplete.");
  }

  const music = new GameMusicController([
    "./assets/audio/amber-field-directive.mp3",
    "./assets/audio/sand-between-signals.mp3",
  ]);
  const unlockMusic = (): void => {
    music.unlock();
  };
  window.addEventListener("pointerdown", unlockMusic, { once: true });
  window.addEventListener("keydown", unlockMusic, { once: true });

  const renderer = new CanvasRenderer(canvas, await loadAssets());
  const game = new AmberDunesGame();
  let currentState = game.getState();
  let activeFlight:
    | {
        source: Position;
        target: Position;
        startedAt: number;
        animationFrameId: number | null;
      }
    | null = null;
  let previewMove: MoveOption | null = null;

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

    renderer.render(currentState, animation, previewMove);

    if (animation && flight) {
      statusTitleElement.textContent = "Skimmer in transit";
      statusTitleElement.className = "status-playing";
      statusMessageElement.textContent =
        `The Skimmer carries the Collector toward sector ${boardLabel(flight.target.x, flight.target.y)}.`;
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
    pilotMessageElement.textContent = previewMove?.pilotLine ?? DEFAULT_PILOT_MESSAGE;
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
    if (
      previewMove &&
      !currentState.validMoves.some((move) => move.target.x === previewMove?.target.x && move.target.y === previewMove?.target.y)
    ) {
      previewMove = null;
    }
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
    previewMove = null;

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

  restartButton.addEventListener("click", () => {
    stopFlight();
    update(game.reset());
  });

  canvas.addEventListener("click", (event) => {
    if (activeFlight) {
      return;
    }

    if (currentState.status !== "playing") {
      update(game.reset());
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

    startFlight(target);
  });

  canvas.addEventListener("pointermove", (event) => {
    if (activeFlight) {
      return;
    }

    const hoveredCell = renderer.cellFromClientPoint(event.clientX, event.clientY);
    if (!hoveredCell) {
      if (previewMove) {
        previewMove = null;
        renderView();
      }
      return;
    }

    const nextPreview =
      currentState.validMoves.find(
        (move) => move.target.x === hoveredCell.x && move.target.y === hoveredCell.y,
      ) ?? null;

    if (
      nextPreview?.target.x === previewMove?.target.x &&
      nextPreview?.target.y === previewMove?.target.y
    ) {
      return;
    }

    previewMove = nextPreview;
    renderView();
  });

  canvas.addEventListener("pointerleave", () => {
    if (!previewMove || activeFlight) {
      return;
    }
    previewMove = null;
    renderView();
  });

  window.addEventListener("resize", () => renderView());

  update(game.getState());
}

void main();
