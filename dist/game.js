import { BOARD_SIZE, CENTER_INDEX, TOTAL_AMBER, } from "./types.js";
import { gameMessageCopy, pilotLineCopy, sinkjawSightedCopy, stormDriftMessageCopy, } from "./i18n.js";
const SINKJAW_SPAWN_RADIUS = 4;
const SAFE_ONESHOT_TURNS = 3;
const STORM_CLUSTER_SIZE = 3;
const SINKJAW_ATTACK_ALPHA = 0.005252185473469883;
const SINKJAW_ATTACK_GROWTH = 10;
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
    locale;
    board = [];
    stormCells = [];
    collector = { x: CENTER_INDEX, y: CENTER_INDEX };
    sinkjaw = null;
    moves = 0;
    collectedAmber = 0;
    status = "playing";
    lossReason = null;
    message = "";
    constructor(locale = "en") {
        this.locale = locale;
        this.reset();
    }
    reset() {
        const { board, stormCells } = this.createBoard();
        this.board = board;
        this.stormCells = stormCells;
        this.collector = { x: CENTER_INDEX, y: CENTER_INDEX };
        this.sinkjaw = null;
        this.moves = 0;
        this.collectedAmber = 0;
        this.status = "playing";
        this.lossReason = null;
        this.message = gameMessageCopy(this.locale, "initial");
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
    exportState() {
        return {
            version: 1,
            board: this.board.map((row) => row.map((cell) => ({ ...cell }))),
            collector: { ...this.collector },
            sinkjaw: this.sinkjaw ? { ...this.sinkjaw } : null,
            moves: this.moves,
            collectedAmber: this.collectedAmber,
            status: this.status,
            message: this.message,
            lossReason: this.lossReason,
        };
    }
    restore(savedState) {
        if (!this.isValidSavedState(savedState)) {
            return this.reset();
        }
        this.board = savedState.board.map((row) => row.map((cell) => ({ ...cell })));
        this.stormCells = this.board.flatMap((row, y) => row.flatMap((cell, x) => (cell.hasStorm ? [{ x, y }] : [])));
        this.collector = { ...savedState.collector };
        this.sinkjaw = savedState.sinkjaw ? { ...savedState.sinkjaw } : null;
        this.moves = savedState.moves;
        this.collectedAmber = savedState.collectedAmber;
        this.status = savedState.status;
        this.message = savedState.message;
        this.lossReason = savedState.lossReason;
        return this.getState();
    }
    moveTo(target) {
        return this.moveToWithPlan({ target, driftTarget: null });
    }
    forceVictory() {
        if (this.status !== "playing") {
            return this.getState();
        }
        for (const row of this.board) {
            for (const cell of row) {
                cell.hasAmber = false;
            }
        }
        this.collectedAmber = TOTAL_AMBER;
        this.status = "won";
        this.lossReason = null;
        this.sinkjaw = null;
        this.message = gameMessageCopy(this.locale, "cheat_victory");
        return this.getState();
    }
    planMove(target) {
        if (this.status !== "playing") {
            return null;
        }
        const validMove = this.computeValidMoves(this.sinkjaw).find((move) => this.positionsEqual(move.target, target));
        if (!validMove) {
            return null;
        }
        if (!this.board[target.y][target.x].hasStorm) {
            return {
                target: { ...target },
                driftTarget: null,
            };
        }
        const driftTargets = this.computeStormDriftTargets();
        const driftTarget = driftTargets.length > 0
            ? driftTargets[Math.floor(Math.random() * driftTargets.length)]
            : null;
        return {
            target: { ...target },
            driftTarget: driftTarget ? { ...driftTarget } : null,
        };
    }
    moveToWithPlan(plan) {
        if (this.status !== "playing") {
            return this.getState();
        }
        const validMove = this.computeValidMoves(this.sinkjaw).find((move) => this.positionsEqual(move.target, plan.target));
        if (!validMove) {
            this.message = gameMessageCopy(this.locale, "invalid_move");
            return this.getState();
        }
        this.collector = { ...validMove.target };
        this.moves += 1;
        let message = "";
        if (this.board[plan.target.y][plan.target.x].hasStorm) {
            const driftTargets = this.computeStormDriftTargets();
            const plannedDriftTarget = plan.driftTarget;
            const plannedTarget = plannedDriftTarget &&
                driftTargets.some((candidate) => this.positionsEqual(candidate, plannedDriftTarget))
                ? plannedDriftTarget
                : null;
            if (plannedTarget) {
                this.collector = { ...plannedTarget };
                message = stormDriftMessageCopy(this.locale, this.toBoardNotation(plannedTarget));
            }
            else if (driftTargets.length > 0) {
                const driftTarget = driftTargets[Math.floor(Math.random() * driftTargets.length)];
                this.collector = { ...driftTarget };
                message = stormDriftMessageCopy(this.locale, this.toBoardNotation(driftTarget));
            }
            else {
                message = gameMessageCopy(this.locale, "storm_trapped");
            }
        }
        if (this.board[this.collector.y][this.collector.x].hasAmber) {
            this.board[this.collector.y][this.collector.x].hasAmber = false;
            this.collectedAmber += 1;
            message = message
                ? `${message}${gameMessageCopy(this.locale, "amber_waiting")}`
                : gameMessageCopy(this.locale, "amber_taken");
        }
        else if (!message) {
            message = gameMessageCopy(this.locale, "empty_cell");
        }
        this.message = message;
        if (this.collectedAmber >= TOTAL_AMBER) {
            this.status = "won";
            this.lossReason = null;
            this.sinkjaw = null;
            this.message = gameMessageCopy(this.locale, "run_complete", { moves: this.moves });
            return this.getState();
        }
        this.moveStormCluster();
        this.spawnSinkjaw();
        if (this.status === "playing" && this.computeValidMoves(this.sinkjaw).length === 0) {
            this.status = "lost";
            this.lossReason = "trapped";
            this.message = gameMessageCopy(this.locale, "no_moves");
        }
        return this.getState();
    }
    createBoard() {
        const board = Array.from({ length: BOARD_SIZE }, () => Array.from({ length: BOARD_SIZE }, () => ({ hasAmber: false, hasStorm: false })));
        const available = [];
        for (let y = 0; y < BOARD_SIZE; y += 1) {
            for (let x = 0; x < BOARD_SIZE; x += 1) {
                if (x === CENTER_INDEX && y === CENTER_INDEX) {
                    continue;
                }
                available.push({ x, y });
            }
        }
        const stormCells = this.createStormCluster();
        const stormKeys = new Set(stormCells.map((cell) => this.positionKey(cell)));
        for (const cell of stormCells) {
            board[cell.y][cell.x].hasStorm = true;
        }
        this.shuffle(available);
        const amberCells = available.filter((cell) => !stormKeys.has(this.positionKey(cell)));
        for (const cell of amberCells.slice(0, TOTAL_AMBER)) {
            board[cell.y][cell.x].hasAmber = true;
        }
        return {
            board,
            stormCells: stormCells.map((cell) => ({ ...cell })),
        };
    }
    isValidSavedState(savedState) {
        if (savedState.version !== 1) {
            return false;
        }
        if (savedState.board.length !== BOARD_SIZE ||
            savedState.board.some((row) => row.length !== BOARD_SIZE)) {
            return false;
        }
        if (!this.isInside(savedState.collector)) {
            return false;
        }
        if (savedState.sinkjaw && !this.isInside(savedState.sinkjaw)) {
            return false;
        }
        if (savedState.moves < 0 || savedState.collectedAmber < 0 || savedState.collectedAmber > TOTAL_AMBER) {
            return false;
        }
        return true;
    }
    computeValidMoves(blockedCell) {
        return KNIGHT_OFFSETS.map((delta) => ({
            target: {
                x: this.collector.x + delta.x,
                y: this.collector.y + delta.y,
            },
            delta,
        }))
            .filter((move) => this.isInside(move.target))
            .filter((move) => !blockedCell || !this.positionsEqual(move.target, blockedCell))
            .map((move) => {
            const forecast = this.forecastMove(move.target);
            return {
                ...move,
                label: this.toBoardNotation(move.target),
                notation: this.toDeltaNotation(move.delta),
                telegraphSector: forecast.sector,
                telegraphCandidates: forecast.candidates,
                pilotLine: forecast.pilotLine,
                isStormLanding: forecast.isStormLanding,
            };
        })
            .sort((left, right) => left.target.y - right.target.y || left.target.x - right.target.x);
    }
    spawnSinkjaw() {
        const candidates = this.computeSinkjawCandidates(this.collector);
        if (this.canSinkjawStrike(this.moves) && Math.random() < this.computeSinkjawStrikeChance(this.moves)) {
            this.sinkjaw = { ...this.collector };
            this.status = "lost";
            this.lossReason = "sinkjaw_attack";
            this.message = gameMessageCopy(this.locale, "sinkjaw_attack");
            return;
        }
        if (candidates.length === 0) {
            this.sinkjaw = null;
            return;
        }
        const nextSinkjaw = candidates[Math.floor(Math.random() * candidates.length)];
        this.sinkjaw = nextSinkjaw;
        this.message = sinkjawSightedCopy(this.locale, this.toBoardNotation(nextSinkjaw));
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
    forecastMove(target) {
        const isStormLanding = this.board[target.y][target.x].hasStorm;
        if (isStormLanding) {
            const driftTargets = this.computeStormDriftTargets();
            const uniqueCandidates = new Map();
            for (const driftTarget of driftTargets) {
                for (const candidate of this.computeSinkjawCandidates(driftTarget)) {
                    uniqueCandidates.set(this.positionKey(candidate), candidate);
                }
            }
            return {
                sector: "obscured",
                candidates: [...uniqueCandidates.values()],
                pilotLine: pilotLineCopy(this.locale, "obscured", this.toBoardNotation(target)),
                isStormLanding,
            };
        }
        const candidates = this.computeSinkjawCandidates(target);
        const sector = this.summarizeTelegraphSector(target, candidates);
        return {
            sector,
            candidates,
            pilotLine: this.buildPilotLine(target, sector),
            isStormLanding,
        };
    }
    computeSinkjawCandidates(collector) {
        const candidates = [];
        for (let y = 0; y < BOARD_SIZE; y += 1) {
            for (let x = 0; x < BOARD_SIZE; x += 1) {
                const next = { x, y };
                if (this.sinkjaw && this.positionsEqual(next, this.sinkjaw)) {
                    continue;
                }
                if (this.distanceBetween(next, collector) > SINKJAW_SPAWN_RADIUS) {
                    continue;
                }
                if (this.positionsEqual(next, collector)) {
                    continue;
                }
                candidates.push(next);
            }
        }
        return candidates;
    }
    canSinkjawStrike(moveNumber) {
        return moveNumber > SAFE_ONESHOT_TURNS;
    }
    computeSinkjawStrikeChance(moveNumber) {
        if (!this.canSinkjawStrike(moveNumber)) {
            return 0;
        }
        const exponent = (moveNumber - (SAFE_ONESHOT_TURNS + 1)) / SINKJAW_ATTACK_GROWTH;
        return 1 - Math.exp(-SINKJAW_ATTACK_ALPHA * Math.exp(exponent));
    }
    computeStormDriftTargets() {
        const targets = [];
        for (let y = 0; y < BOARD_SIZE; y += 1) {
            for (let x = 0; x < BOARD_SIZE; x += 1) {
                const candidate = { x, y };
                if (this.board[y][x].hasStorm) {
                    continue;
                }
                if (this.sinkjaw && this.positionsEqual(candidate, this.sinkjaw)) {
                    continue;
                }
                targets.push(candidate);
            }
        }
        return targets;
    }
    summarizeTelegraphSector(origin, candidates) {
        if (candidates.length === 0) {
            return "encircling";
        }
        let vectorX = 0;
        let vectorY = 0;
        let nonCenterHits = 0;
        for (const candidate of candidates) {
            const dx = candidate.x - origin.x;
            const dy = candidate.y - origin.y;
            if (dx === 0 && dy === 0) {
                continue;
            }
            vectorX += dx;
            vectorY += dy;
            nonCenterHits += 1;
        }
        if (nonCenterHits === 0) {
            return "encircling";
        }
        const averageX = vectorX / nonCenterHits;
        const averageY = vectorY / nonCenterHits;
        const drift = Math.hypot(averageX, averageY);
        if (drift < 0.22) {
            return "encircling";
        }
        return this.angleToSector(Math.atan2(-averageY, averageX));
    }
    angleToSector(angle) {
        const degrees = ((angle * 180) / Math.PI + 360) % 360;
        if (degrees >= 337.5 || degrees < 22.5)
            return "east";
        if (degrees < 67.5)
            return "northeast";
        if (degrees < 112.5)
            return "north";
        if (degrees < 157.5)
            return "northwest";
        if (degrees < 202.5)
            return "west";
        if (degrees < 247.5)
            return "southwest";
        if (degrees < 292.5)
            return "south";
        return "southeast";
    }
    buildPilotLine(target, sector) {
        return pilotLineCopy(this.locale, sector, this.toBoardNotation(target));
    }
    createStormCluster() {
        const start = this.randomNonCenterCell();
        const cluster = [start];
        const seen = new Set([this.positionKey(start)]);
        while (cluster.length < STORM_CLUSTER_SIZE) {
            const frontier = cluster.flatMap((cell) => this.stormNeighbors(cell));
            const candidates = frontier.filter((cell) => !seen.has(this.positionKey(cell)));
            if (candidates.length === 0) {
                break;
            }
            const next = candidates[Math.floor(Math.random() * candidates.length)];
            seen.add(this.positionKey(next));
            cluster.push(next);
        }
        if (cluster.length === STORM_CLUSTER_SIZE) {
            return cluster;
        }
        const fallback = [];
        for (let y = 0; y < BOARD_SIZE; y += 1) {
            for (let x = 0; x < BOARD_SIZE; x += 1) {
                if (x === CENTER_INDEX && y === CENTER_INDEX) {
                    continue;
                }
                fallback.push({ x, y });
            }
        }
        this.shuffle(fallback);
        return fallback.slice(0, STORM_CLUSTER_SIZE);
    }
    moveStormCluster() {
        if (this.stormCells.length === 0) {
            return;
        }
        const directions = [
            { x: 0, y: -1 },
            { x: 1, y: 0 },
            { x: 0, y: 1 },
            { x: -1, y: 0 },
        ];
        const validDirections = directions.filter((direction) => this.stormCells.every((cell) => {
            const shifted = {
                x: cell.x + direction.x,
                y: cell.y + direction.y,
            };
            return this.isInside(shifted) && !this.positionsEqual(shifted, this.collector);
        }));
        if (validDirections.length === 0) {
            return;
        }
        const direction = validDirections[Math.floor(Math.random() * validDirections.length)];
        const nextStormCells = this.stormCells.map((cell) => ({
            x: cell.x + direction.x,
            y: cell.y + direction.y,
        }));
        this.setStormCells(nextStormCells);
    }
    setStormCells(stormCells) {
        for (const cell of this.stormCells) {
            this.board[cell.y][cell.x].hasStorm = false;
        }
        this.stormCells = stormCells.map((cell) => ({ ...cell }));
        for (const cell of this.stormCells) {
            this.board[cell.y][cell.x].hasStorm = true;
        }
    }
    randomNonCenterCell() {
        while (true) {
            const candidate = {
                x: Math.floor(Math.random() * BOARD_SIZE),
                y: Math.floor(Math.random() * BOARD_SIZE),
            };
            if (candidate.x === CENTER_INDEX && candidate.y === CENTER_INDEX) {
                continue;
            }
            return candidate;
        }
    }
    stormNeighbors(position) {
        const neighbors = [];
        const offsets = [
            { x: -1, y: 0 },
            { x: 1, y: 0 },
            { x: 0, y: -1 },
            { x: 0, y: 1 },
        ];
        for (const offset of offsets) {
            const next = { x: position.x + offset.x, y: position.y + offset.y };
            if (this.isInside(next) && !(next.x === CENTER_INDEX && next.y === CENTER_INDEX)) {
                neighbors.push(next);
            }
        }
        return neighbors;
    }
    positionKey(position) {
        return `${position.x},${position.y}`;
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
    distanceBetween(left, right) {
        return Math.hypot(left.x - right.x, left.y - right.y);
    }
    shuffle(items) {
        for (let index = items.length - 1; index > 0; index -= 1) {
            const swapIndex = Math.floor(Math.random() * (index + 1));
            [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
        }
    }
}
