import { BOARD_SIZE, CENTER_INDEX, TOTAL_SPICE, } from "./types.js";
const KNIGHT_OFFSETS = [
    { x: -2, y: -1 },
    { x: -2, y: 1 },
    { x: -1, y: -2 },
    { x: -1, y: 2 },
    { x: 1, y: -2 },
    { x: 1, y: 2 },
    { x: 2, y: -1 },
    { x: 2, y: 1 },
];
export class ArrakisGame {
    board = [];
    harvester = { x: CENTER_INDEX, y: CENTER_INDEX };
    worm = null;
    moves = 0;
    collectedSpice = 0;
    status = "playing";
    message = "";
    constructor() {
        this.reset();
    }
    reset() {
        this.board = this.createBoard();
        this.harvester = { x: CENTER_INDEX, y: CENTER_INDEX };
        this.worm = null;
        this.moves = 0;
        this.collectedSpice = 0;
        this.status = "playing";
        this.message = "Выберите подсвеченную клетку, чтобы начать маршрут.";
        return this.getState();
    }
    getState() {
        return {
            board: this.board.map((row) => row.map((cell) => ({ ...cell }))),
            harvester: { ...this.harvester },
            worm: this.worm ? { ...this.worm } : null,
            validMoves: this.computeValidMoves(),
            totalSpice: TOTAL_SPICE,
            collectedSpice: this.collectedSpice,
            moves: this.moves,
            status: this.status,
            message: this.message,
        };
    }
    moveTo(target) {
        if (this.status !== "playing") {
            return this.getState();
        }
        const validMove = this.computeValidMoves().find((move) => this.positionsEqual(move.target, target));
        if (!validMove) {
            this.message = "Этот прыжок недоступен. Используйте подсвеченные клетки.";
            return this.getState();
        }
        this.harvester = { ...validMove.target };
        this.moves += 1;
        if (this.board[target.y][target.x].hasSpice) {
            this.board[target.y][target.x].hasSpice = false;
            this.collectedSpice += 1;
            this.message = "Спайс собран. Червь уже чувствует вибрацию.";
        }
        else {
            this.message = "Пустой песок. Продолжайте маршрут.";
        }
        if (this.collectedSpice >= TOTAL_SPICE) {
            this.status = "won";
            this.worm = null;
            this.message = `Маршрут завершён за ${this.moves} ходов. Весь спайс собран.`;
            return this.getState();
        }
        this.spawnWorm();
        if (this.status === "playing" && this.computeValidMoves().length === 0) {
            this.status = "lost";
            this.message = "Ходы закончились: харвестер загнан в тупик.";
        }
        return this.getState();
    }
    createBoard() {
        const board = Array.from({ length: BOARD_SIZE }, () => Array.from({ length: BOARD_SIZE }, () => ({ hasSpice: false })));
        const available = [];
        for (let y = 0; y < BOARD_SIZE; y += 1) {
            for (let x = 0; x < BOARD_SIZE; x += 1) {
                if (x === CENTER_INDEX && y === CENTER_INDEX) {
                    continue;
                }
                available.push({ x, y });
            }
        }
        this.shuffle(available);
        for (const cell of available.slice(0, TOTAL_SPICE)) {
            board[cell.y][cell.x].hasSpice = true;
        }
        return board;
    }
    computeValidMoves() {
        return KNIGHT_OFFSETS.map((delta) => ({
            target: {
                x: this.harvester.x + delta.x,
                y: this.harvester.y + delta.y,
            },
            delta,
            label: this.toBoardNotation({
                x: this.harvester.x + delta.x,
                y: this.harvester.y + delta.y,
            }),
            notation: this.toDeltaNotation(delta),
        }))
            .filter((move) => this.isInside(move.target))
            .filter((move) => !this.worm || !this.positionsEqual(move.target, this.worm))
            .sort((left, right) => left.target.y - right.target.y || left.target.x - right.target.x);
    }
    spawnWorm() {
        const candidates = [];
        for (let y = 0; y < BOARD_SIZE; y += 1) {
            for (let x = 0; x < BOARD_SIZE; x += 1) {
                const next = { x, y };
                if (this.worm && this.positionsEqual(next, this.worm)) {
                    continue;
                }
                candidates.push(next);
            }
        }
        if (candidates.length === 0) {
            this.worm = null;
            return;
        }
        const nextWorm = candidates[Math.floor(Math.random() * candidates.length)];
        this.worm = nextWorm;
        if (this.positionsEqual(nextWorm, this.harvester)) {
            this.status = "lost";
            this.message = "Червь вынырнул прямо под харвестером. Экспедиция потеряна.";
            return;
        }
        this.message = `Червь замечен в секторе ${this.toBoardNotation(nextWorm)}.`;
    }
    toBoardNotation(position) {
        const file = String.fromCharCode(65 + position.x);
        const rank = BOARD_SIZE - position.y;
        return `${file}${rank}`;
    }
    toDeltaNotation(delta) {
        const horizontal = delta.x > 0 ? `+${delta.x}` : `${delta.x}`;
        const vertical = delta.y > 0 ? `+${delta.y}` : `${delta.y}`;
        return `${horizontal} / ${vertical}`;
    }
    isInside(position) {
        return (position.x >= 0 &&
            position.x < BOARD_SIZE &&
            position.y >= 0 &&
            position.y < BOARD_SIZE);
    }
    positionsEqual(left, right) {
        return left.x === right.x && left.y === right.y;
    }
    shuffle(items) {
        for (let index = items.length - 1; index > 0; index -= 1) {
            const swapIndex = Math.floor(Math.random() * (index + 1));
            [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
        }
    }
}
