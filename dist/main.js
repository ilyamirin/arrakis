import { AmberDunesGame } from "./game.js";
import { GameMusicController, GameSfxController } from "./music.js";
import { CanvasRenderer, loadAssets, } from "./renderer.js";
import { BOARD_SIZE, } from "./types.js";
const SKIMMER_FLIGHT_MS = 760;
const STORM_DRIFT_MS = 1000;
const PICKUP_PHASE_END = 0.22;
const DROPOFF_PHASE_START = 0.8;
function boardLabel(x, y) {
    return `${String.fromCharCode(65 + x)}${BOARD_SIZE - y}`;
}
function statusTitle(state) {
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
function statusClass(state) {
    if (state.status === "won") {
        return "status-won";
    }
    if (state.status === "lost") {
        return "status-lost";
    }
    return "status-playing";
}
function lerp(start, end, progress) {
    return start + (end - start) * progress;
}
function interpolatePosition(from, to, progress) {
    return {
        x: lerp(from.x, to.x, progress),
        y: lerp(from.y, to.y, progress),
    };
}
function clamp01(value) {
    return Math.min(1, Math.max(0, value));
}
function samePosition(left, right) {
    return left?.x === right?.x && left?.y === right?.y;
}
function easeInOutCubic(value) {
    return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
}
function easeOutCubic(value) {
    return 1 - Math.pow(1 - value, 3);
}
function easeInCubic(value) {
    return value * value * value;
}
function normalizeVector(deltaX, deltaY) {
    const length = Math.hypot(deltaX, deltaY) || 1;
    return {
        x: deltaX / length,
        y: deltaY / length,
    };
}
function buildFlightFrame(source, target, progress) {
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
        const phaseProgress = easeInOutCubic((progress - PICKUP_PHASE_END) / (DROPOFF_PHASE_START - PICKUP_PHASE_END));
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
    const phaseProgress = easeInCubic((progress - DROPOFF_PHASE_START) / (1 - DROPOFF_PHASE_START));
    return {
        activeTarget: target,
        carrier: interpolatePosition(target, departureEnd, phaseProgress),
        heading,
        carriedCollector: null,
        landedCollector: target,
    };
}
function buildStormApproachFrame(source, target, progress) {
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
function buildStormDriftFrame(source, target, progress) {
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
async function main() {
    const canvas = document.querySelector("#game-canvas");
    const restartButton = document.querySelector("#restart-button");
    const statusTitleElement = document.querySelector("#status-title");
    const statusMessageElement = document.querySelector("#status-message");
    const amberValueElement = document.querySelector("#amber-value");
    const movesValueElement = document.querySelector("#moves-value");
    const positionValueElement = document.querySelector("#position-value");
    if (!canvas ||
        !restartButton ||
        !statusTitleElement ||
        !statusMessageElement ||
        !amberValueElement ||
        !movesValueElement ||
        !positionValueElement) {
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
        sinkjawSpawn: { url: "./assets/audio/sfx/sinkjaw-spawn.mp3", volume: 0.34 },
        sinkjawAttack: { url: "./assets/audio/sfx/sinkjaw-attack.wav", volume: 0.52 },
        victory: { url: "./assets/audio/sfx/victory.mp3", volume: 0.56 },
    });
    const unlockMusic = () => {
        music.unlock();
        sfx.unlock();
    };
    window.addEventListener("pointerdown", unlockMusic, { once: true });
    window.addEventListener("keydown", unlockMusic, { once: true });
    const renderer = new CanvasRenderer(canvas, await loadAssets());
    const game = new AmberDunesGame();
    let currentState = game.getState();
    let activeFlight = null;
    let previewMove = null;
    const renderView = (now = performance.now()) => {
        const flight = activeFlight;
        const animation = flight === null
            ? null
            : flight.phase === "storm-approach"
                ? buildStormApproachFrame(flight.source, flight.target, clamp01((now - flight.startedAt) / flight.duration))
                : flight.phase === "storm-drift" && flight.plan.driftTarget
                    ? buildStormDriftFrame(flight.source, flight.plan.driftTarget, clamp01((now - flight.startedAt) / flight.duration))
                    : buildFlightFrame(flight.source, flight.target, clamp01((now - flight.startedAt) / flight.duration));
        renderer.render(currentState, animation, previewMove);
        if (animation && flight) {
            statusTitleElement.className = "status-playing";
            if (flight.phase === "storm-approach") {
                statusTitleElement.textContent = "Storm front";
                statusMessageElement.textContent =
                    `The Skimmer cuts into the squall at sector ${boardLabel(flight.target.x, flight.target.y)}.`;
            }
            else if (flight.phase === "storm-drift" && flight.plan.driftTarget) {
                statusTitleElement.textContent = "Storm shear";
                statusMessageElement.textContent =
                    `Wind shear catches the Skimmer and drags it toward sector ${boardLabel(flight.plan.driftTarget.x, flight.plan.driftTarget.y)}.`;
            }
            else {
                statusTitleElement.textContent = "Skimmer in transit";
                statusMessageElement.textContent =
                    `The Skimmer carries the Collector toward sector ${boardLabel(flight.target.x, flight.target.y)}.`;
            }
        }
        else {
            statusTitleElement.textContent = statusTitle(currentState);
            statusTitleElement.className = statusClass(currentState);
            statusMessageElement.textContent = currentState.message;
        }
        amberValueElement.textContent = `${currentState.collectedAmber} / ${currentState.totalAmber}`;
        movesValueElement.textContent = String(currentState.moves);
        if (animation && flight) {
            if (flight.phase === "storm-drift" && flight.plan.driftTarget) {
                positionValueElement.textContent =
                    `${boardLabel(flight.target.x, flight.target.y)} -> ${boardLabel(flight.plan.driftTarget.x, flight.plan.driftTarget.y)}`;
            }
            else {
                positionValueElement.textContent =
                    `${boardLabel(currentState.collector.x, currentState.collector.y)} -> ${boardLabel(flight.target.x, flight.target.y)}`;
            }
        }
        else {
            positionValueElement.textContent = boardLabel(currentState.collector.x, currentState.collector.y);
        }
    };
    const stopFlight = () => {
        const flight = activeFlight;
        if (flight && flight.animationFrameId !== null) {
            window.cancelAnimationFrame(flight.animationFrameId);
        }
        activeFlight = null;
    };
    const playStateTransitionSfx = (previousState, nextState) => {
        if (nextState.status === "won" && previousState.status !== "won") {
            sfx.play("victory");
            return;
        }
        if (nextState.status === "lost" &&
            nextState.lossReason === "sinkjaw_attack" &&
            previousState.status === "playing") {
            sfx.play("sinkjawAttack");
            return;
        }
        if (nextState.collectedAmber > previousState.collectedAmber) {
            sfx.play("amberPickup");
        }
        const sinkjawChanged = nextState.sinkjaw &&
            (!previousState.sinkjaw ||
                previousState.sinkjaw.x !== nextState.sinkjaw.x ||
                previousState.sinkjaw.y !== nextState.sinkjaw.y);
        if (sinkjawChanged) {
            sfx.play("sinkjawSpawn");
        }
    };
    const update = (state) => {
        const previousState = currentState;
        currentState = state;
        if (previewMove &&
            !currentState.validMoves.some((move) => move.target.x === previewMove?.target.x && move.target.y === previewMove?.target.y)) {
            previewMove = null;
        }
        playStateTransitionSfx(previousState, currentState);
        renderView();
    };
    const isMobileTapPreviewMode = () => window.matchMedia("(hover: none) and (pointer: coarse)").matches;
    const startFlight = (move) => {
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
        const step = (now) => {
            if (!activeFlight) {
                return;
            }
            renderView(now);
            if (now - activeFlight.startedAt < activeFlight.duration) {
                activeFlight.animationFrameId = window.requestAnimationFrame(step);
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
                    animationFrameId: window.requestAnimationFrame(step),
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
        const isValidMove = currentState.validMoves.some((move) => move.target.x === target.x && move.target.y === target.y);
        if (isMobileTapPreviewMode() && isValidMove) {
            const nextPreview = currentState.validMoves.find((move) => move.target.x === target.x && move.target.y === target.y) ?? null;
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
        const move = currentState.validMoves.find((candidate) => candidate.target.x === target.x && candidate.target.y === target.y) ?? null;
        if (!move) {
            return;
        }
        startFlight(move);
    });
    canvas.addEventListener("pointermove", (event) => {
        if (activeFlight || isMobileTapPreviewMode()) {
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
        const nextPreview = currentState.validMoves.find((move) => move.target.x === hoveredCell.x && move.target.y === hoveredCell.y) ?? null;
        if (nextPreview?.target.x === previewMove?.target.x &&
            nextPreview?.target.y === previewMove?.target.y) {
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
    update(game.getState());
}
void main();
