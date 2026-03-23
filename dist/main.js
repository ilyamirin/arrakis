import { ArrakisGame } from "./game.js";
import { CanvasRenderer, loadAssets } from "./renderer.js";
import { BOARD_SIZE } from "./types.js";
function boardLabel(x, y) {
    return `${String.fromCharCode(65 + x)}${BOARD_SIZE - y}`;
}
function statusTitle(state) {
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
function statusClass(state) {
    if (state.status === "won") {
        return "status-won";
    }
    if (state.status === "lost") {
        return "status-lost";
    }
    return "status-playing";
}
async function main() {
    const canvas = document.querySelector("#game-canvas");
    const restartButton = document.querySelector("#restart-button");
    const statusTitleElement = document.querySelector("#status-title");
    const statusMessageElement = document.querySelector("#status-message");
    const spiceValueElement = document.querySelector("#spice-value");
    const movesValueElement = document.querySelector("#moves-value");
    const positionValueElement = document.querySelector("#position-value");
    if (!canvas ||
        !restartButton ||
        !statusTitleElement ||
        !statusMessageElement ||
        !spiceValueElement ||
        !movesValueElement ||
        !positionValueElement) {
        throw new Error("The UI shell is incomplete.");
    }
    const renderer = new CanvasRenderer(canvas, await loadAssets());
    const game = new ArrakisGame();
    const update = (state) => {
        renderer.render(state);
        statusTitleElement.textContent = statusTitle(state);
        statusTitleElement.className = statusClass(state);
        statusMessageElement.textContent = state.message;
        spiceValueElement.textContent = `${state.collectedSpice} / ${state.totalSpice}`;
        movesValueElement.textContent = String(state.moves);
        positionValueElement.textContent = boardLabel(state.harvester.x, state.harvester.y);
    };
    restartButton.addEventListener("click", () => update(game.reset()));
    canvas.addEventListener("click", (event) => {
        const target = renderer.cellFromClientPoint(event.clientX, event.clientY);
        if (!target) {
            return;
        }
        update(game.moveTo(target));
    });
    window.addEventListener("resize", () => renderer.rerender());
    update(game.getState());
}
void main();
