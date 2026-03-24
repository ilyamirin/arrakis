import { BOARD_SIZE, CENTER_INDEX, TOTAL_AMBER, } from "./types.js";
const SINKJAW_SPAWN_RADIUS = 4;
const SAFE_ONESHOT_TURNS = 3;
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
export class AmberDunesGame {
    board = [];
    collector = { x: CENTER_INDEX, y: CENTER_INDEX };
    sinkjaw = null;
    moves = 0;
    collectedAmber = 0;
    status = "playing";
    lossReason = null;
    message = "";
    constructor() {
        this.reset();
    }
    reset() {
        this.board = this.createBoard();
        this.collector = { x: CENTER_INDEX, y: CENTER_INDEX };
        this.sinkjaw = null;
        this.moves = 0;
        this.collectedAmber = 0;
        this.status = "playing";
        this.lossReason = null;
        this.message = "Choose one of the lit squares to begin your run across the Amber Waste.";
        return this.getState();
    }
    getState() {
        return {
            board: this.board.map((row) => row.map((cell) => ({ ...cell }))),
            collector: { ...this.collector },
            sinkjaw: this.sinkjaw ? { ...this.sinkjaw } : null,
            validMoves: this.computeValidMoves(this.sinkjaw),
            totalAmber: TOTAL_AMBER,
            collectedAmber: this.collectedAmber,
            moves: this.moves,
            status: this.status,
            message: this.message,
            lossReason: this.lossReason,
        };
    }
    moveTo(target) {
        if (this.status !== "playing") {
            return this.getState();
        }
        const validMove = this.computeValidMoves(this.sinkjaw).find((move) => this.positionsEqual(move.target, target));
        if (!validMove) {
            this.message = "That jump is out of line. Take one of the lit squares.";
            return this.getState();
        }
        this.collector = { ...validMove.target };
        this.moves += 1;
        if (this.board[target.y][target.x].hasAmber) {
            this.board[target.y][target.x].hasAmber = false;
            this.collectedAmber += 1;
            this.message = "Amber taken. Sinkjaw will have felt the tremor.";
        }
        else {
            this.message = "A barren stretch of Waste. Keep the run moving.";
        }
        if (this.collectedAmber >= TOTAL_AMBER) {
            this.status = "won";
            this.lossReason = null;
            this.sinkjaw = null;
            this.message = `Run complete in ${this.moves} moves. The amber field is stripped clean.`;
            return this.getState();
        }
        this.spawnSinkjaw();
        if (this.status === "playing" && this.computeValidMoves(this.sinkjaw).length === 0) {
            this.status = "lost";
            this.lossReason = "trapped";
            this.message = "No jumps remain. The Collector has been boxed in.";
        }
        return this.getState();
    }
    createBoard() {
        const board = Array.from({ length: BOARD_SIZE }, () => Array.from({ length: BOARD_SIZE }, () => ({ hasAmber: false })));
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
        for (const cell of available.slice(0, TOTAL_AMBER)) {
            board[cell.y][cell.x].hasAmber = true;
        }
        return board;
    }
    computeValidMoves(blockedCell) {
        return KNIGHT_OFFSETS.map((delta) => ({
            target: {
                x: this.collector.x + delta.x,
                y: this.collector.y + delta.y,
            },
            delta,
            label: this.toBoardNotation({
                x: this.collector.x + delta.x,
                y: this.collector.y + delta.y,
            }),
            notation: this.toDeltaNotation(delta),
        }))
            .filter((move) => this.isInside(move.target))
            .filter((move) => !blockedCell || !this.positionsEqual(move.target, blockedCell))
            .sort((left, right) => left.target.y - right.target.y || left.target.x - right.target.x);
    }
    spawnSinkjaw() {
        const candidates = [];
        for (let y = 0; y < BOARD_SIZE; y += 1) {
            for (let x = 0; x < BOARD_SIZE; x += 1) {
                const next = { x, y };
                if (this.sinkjaw && this.positionsEqual(next, this.sinkjaw)) {
                    continue;
                }
                if (this.distanceToCollector(next) > SINKJAW_SPAWN_RADIUS) {
                    continue;
                }
                if (this.moves <= SAFE_ONESHOT_TURNS && this.positionsEqual(next, this.collector)) {
                    continue;
                }
                candidates.push(next);
            }
        }
        if (candidates.length === 0) {
            this.sinkjaw = null;
            return;
        }
        const nextSinkjaw = candidates[Math.floor(Math.random() * candidates.length)];
        this.sinkjaw = nextSinkjaw;
        if (this.positionsEqual(nextSinkjaw, this.collector)) {
            this.status = "lost";
            this.lossReason = "sinkjaw_attack";
            this.message = "Sinkjaw broke surface beneath the Collector. The expedition is done.";
            return;
        }
        this.message = `Sinkjaw sighted in sector ${this.toBoardNotation(nextSinkjaw)}.`;
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
    distanceToCollector(position) {
        return Math.hypot(position.x - this.collector.x, position.y - this.collector.y);
    }
    shuffle(items) {
        for (let index = items.length - 1; index > 0; index -= 1) {
            const swapIndex = Math.floor(Math.random() * (index + 1));
            [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
        }
    }
}
