import { AmberDunesGame } from "./game.js";
import {
  flightMessageCopy,
  flightTitleCopy,
  getStaticCopy,
  normalizeLocale,
  statusTitleCopy,
  type Locale,
} from "./i18n.js";
import { GameMusicController, GameSfxController } from "./music.js";
import { PlatformBridge } from "./platform.js";
import {
  CanvasRenderer,
  loadAssets,
  type FlightAnimationFrame,
} from "./renderer.js";
import {
  BOARD_SIZE,
  type GameState,
  type MoveOption,
  type PlannedMove,
  type Position,
  type SavedRunState,
} from "./types.js";

const SKIMMER_FLIGHT_MS = 760;
const STORM_DRIFT_MS = 1000;
const PICKUP_PHASE_END = 0.22;
const DROPOFF_PHASE_START = 0.8;
const SECRET_VICTORY_SEQUENCE = [
  "KeyA",
  "KeyM",
  "KeyB",
  "KeyE",
  "KeyR",
];
const SAVE_KEY = "amber-dunes-harvest.run-state.v1";

function boardLabel(x: number, y: number): string {
  return `${String.fromCharCode(65 + x)}${BOARD_SIZE - y}`;
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

function samePosition(left: Position | null, right: Position | null): boolean {
  return left?.x === right?.x && left?.y === right?.y;
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

function buildStormApproachFrame(
  source: Position,
  target: Position,
  progress: number,
): FlightAnimationFrame {
  const direction = normalizeVector(target.x - source.x, target.y - source.y);
  const perpendicular = { x: -direction.y, y: direction.x };
  const heading = Math.atan2(direction.y, direction.x);
  const approachStart = {
    x: source.x - direction.x * 2.7,
    y: source.y - direction.y * 2.7,
  };
  const phaseProgress = easeInOutCubic(progress);
  const basePosition = interpolatePosition(approachStart, target, phaseProgress);
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

function buildStormDriftFrame(
  source: Position,
  target: Position,
  progress: number,
): FlightAnimationFrame {
  const direction = normalizeVector(target.x - source.x, target.y - source.y);
  const heading = Math.atan2(direction.y, direction.x);
  const phaseProgress = easeInOutCubic(progress);
  const gust = Math.sin(phaseProgress * Math.PI * 3) * 0.16 * (1 - phaseProgress * 0.35);
  const sway = { x: -direction.y * gust, y: direction.x * gust };
  const carrier = {
    x: lerp(source.x, target.x, phaseProgress) + sway.x,
    y: lerp(source.y, target.y, phaseProgress) + sway.y,
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

function applyStaticCopy(locale: Locale): void {
  const copy = getStaticCopy(locale);
  document.documentElement.lang = copy.htmlLang;
  document.title = copy.title;

  const metaDescription = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  const ogDescription = document.querySelector<HTMLMetaElement>('meta[property="og:description"]');
  const twitterDescription = document.querySelector<HTMLMetaElement>('meta[name="twitter:description"]');
  if (metaDescription) metaDescription.content = copy.metaDescription;
  if (ogDescription) ogDescription.content = copy.ogDescription;
  if (twitterDescription) twitterDescription.content = copy.twitterDescription;

  const setText = (selector: string, value: string): void => {
    const element = document.querySelector<HTMLElement>(selector);
    if (element) {
      element.textContent = value;
    }
  };

  setText("#eyebrow", copy.eyebrow);
  setText("#hero-text", copy.heroText);
  setText("#project-note", copy.projectNote);
  setText("#restart-button", copy.restart);
  setText("#state-kicker", copy.stateKicker);
  setText("#status-title", copy.initialStatusTitle);
  setText("#status-message", copy.initialStatusMessage);
  setText("#amber-label", copy.amberLabel);
  setText("#moves-label", copy.movesLabel);
  setText("#position-label", copy.positionLabel);
  setText("#legend-collector-title", copy.legendCollectorTitle);
  setText("#legend-collector-text", copy.legendCollectorText);
  setText("#legend-sinkjaw-title", copy.legendSinkjawTitle);
  setText("#legend-sinkjaw-text", copy.legendSinkjawText);
  setText("#legend-amber-title", copy.legendAmberTitle);
  setText("#legend-amber-text", copy.legendAmberText);
  setText("#legend-skimmer-title", copy.legendSkimmerTitle);
  setText("#legend-skimmer-text", copy.legendSkimmerText);
  setText("#legend-storm-title", copy.legendStormTitle);
  setText("#legend-storm-text", copy.legendStormText);
  setText("#rules-kicker", copy.rulesKicker);
  setText("#rules-title", copy.rulesTitle);
  setText("#author-kicker", copy.authorKicker);
  setText("#author-copy", copy.authorCopy);
  setText("#author-meta", copy.authorMeta);
  setText("#footer-text", copy.footerText);
  setText("#footer-license", copy.footerLicense);

  for (const item of Array.from(document.querySelectorAll<HTMLElement>("[data-rule-index]"))) {
    const index = Number(item.dataset.ruleIndex);
    const rule = copy.rulesItems[index];
    if (rule) {
      item.textContent = rule;
    }
  }

  const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
  if (canvas) {
    canvas.setAttribute("aria-label", copy.canvasLabel);
  }
}

function loadSavedRunState(): SavedRunState | null {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as SavedRunState;
  } catch (error) {
    console.warn("Saved run state could not be restored.", error);
    return null;
  }
}

function persistRunState(game: AmberDunesGame): void {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(game.exportState()));
  } catch (error) {
    console.warn("Run state could not be saved.", error);
  }
}

async function main(): Promise<void> {
  const platform = await PlatformBridge.init();
  const locale = normalizeLocale(platform.locale);
  applyStaticCopy(locale);

  const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
  const restartButton = document.querySelector<HTMLButtonElement>("#restart-button");
  const statusTitleElement = document.querySelector<HTMLElement>("#status-title");
  const statusMessageElement = document.querySelector<HTMLElement>("#status-message");
  const amberValueElement = document.querySelector<HTMLElement>("#amber-value");
  const movesValueElement = document.querySelector<HTMLElement>("#moves-value");
  const positionValueElement = document.querySelector<HTMLElement>("#position-value");

  if (
    !canvas ||
    !restartButton ||
    !statusTitleElement ||
    !statusMessageElement ||
    !amberValueElement ||
    !movesValueElement ||
    !positionValueElement
  ) {
    throw new Error("The UI shell is incomplete.");
  }

  const music = new GameMusicController([
    "./assets/audio/amber-field-directive.mp3",
    "./assets/audio/sand-between-signals.mp3",
  ]);
  const sfx = new GameSfxController({
    moveSelect: { url: "./assets/audio/sfx/move-select.mp3", volume: 0.48 },
    skimmerTakeoff: { url: "./assets/audio/sfx/skimmer-takeoff.mp3", volume: 0.44 },
    amberPickup: { url: "./assets/audio/sfx/amber-pickup.mp3", volume: 0.54 },
    stormEnter: { url: "./assets/audio/sfx/storm-enter.wav", volume: 0.38 },
    sinkjawSpawn: { url: "./assets/audio/sfx/sinkjaw-spawn.mp3", volume: 0.07 },
    sinkjawAttack: { url: "./assets/audio/sfx/sinkjaw-attack.wav", volume: 0.52 },
    victory: { url: "./assets/audio/sfx/victory.mp3", volume: 0.56 },
  });
  const unlockMusic = (): void => {
    music.unlock();
    sfx.unlock();
  };
  window.addEventListener("pointerdown", unlockMusic, { once: true });
  window.addEventListener("keydown", unlockMusic, { once: true });

  const renderer = new CanvasRenderer(canvas, await loadAssets());
  renderer.setLocale(locale);
  const game = new AmberDunesGame(locale);
  const savedRunState = loadSavedRunState();
  let currentState = savedRunState ? game.restore(savedRunState) : game.getState();
  let secretProgress = 0;
  let isPaused = false;
  let pausedAt = 0;
  let activeFlight:
    | {
        phase: "flight" | "storm-approach" | "storm-drift";
        source: Position;
        target: Position;
        plan: PlannedMove;
        startedAt: number;
        duration: number;
        animationFrameId: number | null;
      }
    | null = null;
  let previewMove: MoveOption | null = null;

  const syncGameplayState = (): void => {
    platform.setGameplayActive(currentState.status === "playing" && !isPaused);
  };

  const renderView = (now = performance.now()): void => {
    const flight = activeFlight;
    const animation =
      flight === null
        ? null
        : flight.phase === "storm-approach"
          ? buildStormApproachFrame(
              flight.source,
              flight.target,
              clamp01((now - flight.startedAt) / flight.duration),
            )
          : flight.phase === "storm-drift" && flight.plan.driftTarget
            ? buildStormDriftFrame(
                flight.source,
                flight.plan.driftTarget,
                clamp01((now - flight.startedAt) / flight.duration),
              )
            : buildFlightFrame(
                flight.source,
                flight.target,
                clamp01((now - flight.startedAt) / flight.duration),
              );

    renderer.render(currentState, animation, previewMove);

    if (animation && flight) {
      statusTitleElement.className = "status-playing";

      if (flight.phase === "storm-approach") {
        statusTitleElement.textContent = flightTitleCopy(locale, "storm-approach");
        statusMessageElement.textContent = flightMessageCopy(
          locale,
          "storm-approach",
          boardLabel(flight.target.x, flight.target.y),
        );
      } else if (flight.phase === "storm-drift" && flight.plan.driftTarget) {
        statusTitleElement.textContent = flightTitleCopy(locale, "storm-drift");
        statusMessageElement.textContent = flightMessageCopy(
          locale,
          "storm-drift",
          boardLabel(flight.plan.driftTarget.x, flight.plan.driftTarget.y),
        );
      } else {
        statusTitleElement.textContent = flightTitleCopy(locale, "flight");
        statusMessageElement.textContent = flightMessageCopy(
          locale,
          "flight",
          boardLabel(flight.target.x, flight.target.y),
        );
      }
    } else {
      statusTitleElement.textContent = statusTitleCopy(
        locale,
        currentState.status,
        currentState.lossReason,
      );
      statusTitleElement.className = statusClass(currentState);
      statusMessageElement.textContent = currentState.message;
    }

    amberValueElement.textContent = `${currentState.collectedAmber} / ${currentState.totalAmber}`;
    movesValueElement.textContent = String(currentState.moves);
    if (animation && flight) {
      if (flight.phase === "storm-drift" && flight.plan.driftTarget) {
        positionValueElement.textContent =
          `${boardLabel(flight.target.x, flight.target.y)} -> ${boardLabel(flight.plan.driftTarget.x, flight.plan.driftTarget.y)}`;
      } else {
        positionValueElement.textContent =
          `${boardLabel(currentState.collector.x, currentState.collector.y)} -> ${boardLabel(flight.target.x, flight.target.y)}`;
      }
    } else {
      positionValueElement.textContent = boardLabel(currentState.collector.x, currentState.collector.y);
    }
  };

  const stopFlight = (): void => {
    const flight = activeFlight;
    if (flight && flight.animationFrameId !== null) {
      window.cancelAnimationFrame(flight.animationFrameId);
    }
    activeFlight = null;
  };

  const runFlightFrame = (now: number): void => {
    if (!activeFlight || isPaused) {
      return;
    }

    renderView(now);

    if (now - activeFlight.startedAt < activeFlight.duration) {
      activeFlight.animationFrameId = window.requestAnimationFrame(runFlightFrame);
      return;
    }

    if (activeFlight.phase === "storm-approach" && activeFlight.plan.driftTarget) {
      sfx.play("stormEnter");
      activeFlight = {
        ...activeFlight,
        phase: "storm-drift",
        source: { ...activeFlight.target },
        startedAt: now,
        duration: STORM_DRIFT_MS,
        animationFrameId: window.requestAnimationFrame(runFlightFrame),
      };
      renderView(now);
      return;
    }

    const planToCommit = {
      target: { ...activeFlight.plan.target },
      driftTarget: activeFlight.plan.driftTarget ? { ...activeFlight.plan.driftTarget } : null,
    };
    stopFlight();
    update(game.moveToWithPlan(planToCommit));
  };

  const playStateTransitionSfx = (previousState: GameState, nextState: GameState): void => {
    if (nextState.status === "won" && previousState.status !== "won") {
      sfx.play("victory");
      return;
    }

    if (
      nextState.status === "lost" &&
      nextState.lossReason === "sinkjaw_attack" &&
      previousState.status === "playing"
    ) {
      sfx.play("sinkjawAttack");
      return;
    }

    if (nextState.collectedAmber > previousState.collectedAmber) {
      sfx.play("amberPickup");
    }

    const sinkjawChanged =
      nextState.sinkjaw &&
      (!previousState.sinkjaw ||
        previousState.sinkjaw.x !== nextState.sinkjaw.x ||
        previousState.sinkjaw.y !== nextState.sinkjaw.y);

    if (sinkjawChanged) {
      sfx.play("sinkjawSpawn");
    }
  };

  const update = (state: GameState): void => {
    const previousState = currentState;
    currentState = state;
    if (
      previewMove &&
      !currentState.validMoves.some(
        (move) => move.target.x === previewMove?.target.x && move.target.y === previewMove?.target.y,
      )
    ) {
      previewMove = null;
    }
    playStateTransitionSfx(previousState, currentState);
    persistRunState(game);
    syncGameplayState();
    renderView();
  };

  const isMobileTapPreviewMode = (): boolean =>
    window.matchMedia("(hover: none) and (pointer: coarse)").matches;

  const pauseGame = (): void => {
    if (isPaused) {
      return;
    }

    isPaused = true;
    pausedAt = performance.now();
    music.pause();
    sfx.pause();
    const flight = activeFlight;
    if (flight && flight.animationFrameId !== null) {
      window.cancelAnimationFrame(flight.animationFrameId);
      flight.animationFrameId = null;
    }
    syncGameplayState();
  };

  const resumeGame = (): void => {
    if (!isPaused) {
      return;
    }

    const pausedDuration = performance.now() - pausedAt;
    isPaused = false;
    music.resume();
    sfx.resume();
    if (activeFlight) {
      activeFlight.startedAt += pausedDuration;
      activeFlight.animationFrameId = window.requestAnimationFrame(runFlightFrame);
    }
    syncGameplayState();
    renderView();
  };

  const startFlight = (move: MoveOption): void => {
    if (isPaused) {
      return;
    }

    const plan = game.planMove(move.target);
    if (!plan) {
      return;
    }

    sfx.play("moveSelect");
    sfx.play("skimmerTakeoff");

    const source = { ...currentState.collector };
    activeFlight = {
      phase: move.isStormLanding ? "storm-approach" : "flight",
      source,
      target: { ...move.target },
      plan,
      startedAt: performance.now(),
      duration: SKIMMER_FLIGHT_MS,
      animationFrameId: null,
    };
    previewMove = null;

    renderView(activeFlight.startedAt);
    activeFlight.animationFrameId = window.requestAnimationFrame(runFlightFrame);
  };

  restartButton.addEventListener("click", () => {
    if (isPaused) {
      return;
    }

    stopFlight();
    update(game.reset());
  });

  canvas.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });

  canvas.addEventListener("click", (event) => {
    if (activeFlight || isPaused) {
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

    if (isMobileTapPreviewMode() && isValidMove) {
      const nextPreview =
        currentState.validMoves.find(
          (move) => move.target.x === target.x && move.target.y === target.y,
        ) ?? null;

      if (nextPreview && samePosition(nextPreview.target, previewMove?.target ?? null)) {
        startFlight(nextPreview);
        return;
      }

      previewMove = nextPreview;
      renderView();
      return;
    }

    if (isMobileTapPreviewMode() && previewMove) {
      previewMove = null;
      renderView();
    }

    if (!isValidMove) {
      update(game.moveTo(target));
      return;
    }

    const move =
      currentState.validMoves.find(
        (candidate) => candidate.target.x === target.x && candidate.target.y === target.y,
      ) ?? null;

    if (!move) {
      return;
    }

    startFlight(move);
  });

  canvas.addEventListener("pointermove", (event) => {
    if (activeFlight || isMobileTapPreviewMode() || isPaused) {
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
    if (!previewMove || activeFlight || isMobileTapPreviewMode()) {
      return;
    }
    previewMove = null;
    renderView();
  });

  window.addEventListener("resize", () => renderView());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      pauseGame();
      return;
    }

    resumeGame();
  });

  const unbindPauseResume = platform.bindPauseResume(pauseGame, resumeGame);

  window.addEventListener("keydown", (event) => {
    if (event.repeat || activeFlight || currentState.status !== "playing" || isPaused) {
      return;
    }

    const expectedCode = SECRET_VICTORY_SEQUENCE[secretProgress];
    if (event.code === expectedCode) {
      secretProgress += 1;
      if (secretProgress === SECRET_VICTORY_SEQUENCE.length) {
        secretProgress = 0;
        update(game.forceVictory());
      }
      return;
    }

    secretProgress = event.code === SECRET_VICTORY_SEQUENCE[0] ? 1 : 0;
  });

  update(game.getState());
  platform.markReady();

  window.addEventListener("beforeunload", () => {
    unbindPauseResume();
    platform.setGameplayActive(false);
  });
}

void main();
