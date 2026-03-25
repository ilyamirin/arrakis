import {
  BOARD_SIZE,
  CENTER_INDEX,
  TOTAL_AMBER,
  type CellState,
  type GameState,
  type LossReason,
  type MoveOption,
  type PlannedMove,
  type Position,
  type TelegraphSector,
} from "./types.js";

const SINKJAW_SPAWN_RADIUS = 4;
const SAFE_ONESHOT_TURNS = 3;
const STORM_CLUSTER_SIZE = 3;

const KNIGHT_OFFSETS: Position[] = [
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
  private board: CellState[][] = [];
  private stormCells: Position[] = [];
  private collector: Position = { x: CENTER_INDEX, y: CENTER_INDEX };
  private sinkjaw: Position | null = null;
  private moves = 0;
  private collectedAmber = 0;
  private status: GameState["status"] = "playing";
  private lossReason: LossReason = null;
  private message = "";

  constructor() {
    this.reset();
  }

  public reset(): GameState {
    const { board, stormCells } = this.createBoard();
    this.board = board;
    this.stormCells = stormCells;
    this.collector = { x: CENTER_INDEX, y: CENTER_INDEX };
    this.sinkjaw = null;
    this.moves = 0;
    this.collectedAmber = 0;
    this.status = "playing";
    this.lossReason = null;
    this.message = "Choose one of the lit squares to begin your run across the Amber Waste.";
    return this.getState();
  }

  public getState(): GameState {
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

  public moveTo(target: Position): GameState {
    return this.moveToWithPlan({ target, driftTarget: null });
  }

  public forceVictory(): GameState {
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
    this.message = "A hidden signal cut across the Waste. The Collector is clear and the amber line is yours.";
    return this.getState();
  }

  public planMove(target: Position): PlannedMove | null {
    if (this.status !== "playing") {
      return null;
    }

    const validMove = this.computeValidMoves(this.sinkjaw).find((move) =>
      this.positionsEqual(move.target, target),
    );

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
    const driftTarget =
      driftTargets.length > 0
        ? driftTargets[Math.floor(Math.random() * driftTargets.length)]
        : null;

    return {
      target: { ...target },
      driftTarget: driftTarget ? { ...driftTarget } : null,
    };
  }

  public moveToWithPlan(plan: PlannedMove): GameState {
    if (this.status !== "playing") {
      return this.getState();
    }

    const validMove = this.computeValidMoves(this.sinkjaw).find((move) =>
      this.positionsEqual(move.target, plan.target),
    );

    if (!validMove) {
      this.message = "That jump is out of line. Take one of the lit squares.";
      return this.getState();
    }

    this.collector = { ...validMove.target };
    this.moves += 1;
    let message = "";

    if (this.board[plan.target.y][plan.target.x].hasStorm) {
      const driftTargets = this.computeStormDriftTargets();
      const plannedDriftTarget = plan.driftTarget;
      const plannedTarget =
        plannedDriftTarget &&
        driftTargets.some((candidate) => this.positionsEqual(candidate, plannedDriftTarget))
          ? plannedDriftTarget
          : null;

      if (plannedTarget) {
        this.collector = { ...plannedTarget };
        message = `Storm shear flung the Collector clear to sector ${this.toBoardNotation(plannedTarget)}.`;
      } else if (driftTargets.length > 0) {
        const driftTarget = driftTargets[Math.floor(Math.random() * driftTargets.length)];
        this.collector = { ...driftTarget };
        message = `Storm shear flung the Collector clear to sector ${this.toBoardNotation(driftTarget)}.`;
      } else {
        message = "The storm closed around the Collector, but there was nowhere left to throw it.";
      }
    }

    if (this.board[this.collector.y][this.collector.x].hasAmber) {
      this.board[this.collector.y][this.collector.x].hasAmber = false;
      this.collectedAmber += 1;
      message = message
        ? `${message} Amber was waiting there.`
        : "Amber taken. Sinkjaw will have felt the tremor.";
    } else if (!message) {
      message = "A barren stretch of Waste. Keep the run moving.";
    }

    this.message = message;

    if (this.collectedAmber >= TOTAL_AMBER) {
      this.status = "won";
      this.lossReason = null;
      this.sinkjaw = null;
      this.message = `Run complete in ${this.moves} moves. The amber field is stripped clean.`;
      return this.getState();
    }

    this.moveStormCluster();
    this.spawnSinkjaw();

    if (this.status === "playing" && this.computeValidMoves(this.sinkjaw).length === 0) {
      this.status = "lost";
      this.lossReason = "trapped";
      this.message = "No jumps remain. The Collector has been boxed in.";
    }

    return this.getState();
  }

  private createBoard(): { board: CellState[][]; stormCells: Position[] } {
    const board = Array.from({ length: BOARD_SIZE }, () =>
      Array.from({ length: BOARD_SIZE }, () => ({ hasAmber: false, hasStorm: false })),
    );

    const available: Position[] = [];

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

  private computeValidMoves(blockedCell: Position | null): MoveOption[] {
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

  private spawnSinkjaw(): void {
    const candidates = this.computeSinkjawCandidates(this.collector, this.moves);

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

  private toBoardNotation(position: Position): string {
    const file = String.fromCharCode(65 + position.x);
    const rank = BOARD_SIZE - position.y;
    return `${file}${rank}`;
  }

  private toDeltaNotation(delta: Position): string {
    const horizontal = delta.x > 0 ? `+${delta.x}` : `${delta.x}`;
    const vertical = delta.y > 0 ? `+${delta.y}` : `${delta.y}`;
    return `${horizontal} / ${vertical}`;
  }

  private forecastMove(target: Position): {
    sector: TelegraphSector;
    candidates: Position[];
    pilotLine: string;
    isStormLanding: boolean;
  } {
    const isStormLanding = this.board[target.y][target.x].hasStorm;

    if (isStormLanding) {
      const driftTargets = this.computeStormDriftTargets();
      const uniqueCandidates = new Map<string, Position>();

      for (const driftTarget of driftTargets) {
        for (const candidate of this.computeSinkjawCandidates(driftTarget, this.moves + 1)) {
          uniqueCandidates.set(this.positionKey(candidate), candidate);
        }
      }

      return {
        sector: "obscured",
        candidates: [...uniqueCandidates.values()],
        pilotLine: "Pilot: Storm interference. Read unreliable beyond the squall.",
        isStormLanding,
      };
    }

    const candidates = this.computeSinkjawCandidates(target, this.moves + 1);
    const sector = this.summarizeTelegraphSector(target, candidates);

    return {
      sector,
      candidates,
      pilotLine: this.buildPilotLine(target, sector),
      isStormLanding,
    };
  }

  private computeSinkjawCandidates(collector: Position, moveNumber: number): Position[] {
    const candidates: Position[] = [];

    for (let y = 0; y < BOARD_SIZE; y += 1) {
      for (let x = 0; x < BOARD_SIZE; x += 1) {
        const next = { x, y };
        if (this.sinkjaw && this.positionsEqual(next, this.sinkjaw)) {
          continue;
        }
        if (this.distanceBetween(next, collector) > SINKJAW_SPAWN_RADIUS) {
          continue;
        }
        if (moveNumber <= SAFE_ONESHOT_TURNS && this.positionsEqual(next, collector)) {
          continue;
        }
        candidates.push(next);
      }
    }

    return candidates;
  }

  private computeStormDriftTargets(): Position[] {
    const targets: Position[] = [];

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

  private summarizeTelegraphSector(
    origin: Position,
    candidates: Position[],
  ): TelegraphSector {
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

  private angleToSector(angle: number): TelegraphSector {
    const degrees = ((angle * 180) / Math.PI + 360) % 360;

    if (degrees >= 337.5 || degrees < 22.5) return "east";
    if (degrees < 67.5) return "northeast";
    if (degrees < 112.5) return "north";
    if (degrees < 157.5) return "northwest";
    if (degrees < 202.5) return "west";
    if (degrees < 247.5) return "southwest";
    if (degrees < 292.5) return "south";
    return "southeast";
  }

  private buildPilotLine(target: Position, sector: TelegraphSector): string {
    const sectorName = this.toBoardNotation(target);

    switch (sector) {
      case "north":
        return `Pilot: Put down at ${sectorName}. Sinkjaw favors the north reach.`;
      case "northeast":
        return `Pilot: Put down at ${sectorName}. Watch the northeast reach.`;
      case "east":
        return `Pilot: Put down at ${sectorName}. Sinkjaw favors the east reach.`;
      case "southeast":
        return `Pilot: Put down at ${sectorName}. The southeast is running hot.`;
      case "south":
        return `Pilot: Put down at ${sectorName}. Sinkjaw favors the south reach.`;
      case "southwest":
        return `Pilot: Put down at ${sectorName}. Watch the southwest reach.`;
      case "west":
        return `Pilot: Put down at ${sectorName}. Sinkjaw favors the west reach.`;
      case "northwest":
        return `Pilot: Put down at ${sectorName}. The northwest turns dangerous.`;
      default:
        return `Pilot: Put down at ${sectorName}. Sinkjaw can break all around you.`;
    }
  }

  private createStormCluster(): Position[] {
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

    const fallback: Position[] = [];
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

  private moveStormCluster(): void {
    if (this.stormCells.length === 0) {
      return;
    }

    const directions: Position[] = [
      { x: 0, y: -1 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
    ];

    const validDirections = directions.filter((direction) =>
      this.stormCells.every((cell) => {
        const shifted = {
          x: cell.x + direction.x,
          y: cell.y + direction.y,
        };

        return this.isInside(shifted) && !this.positionsEqual(shifted, this.collector);
      }),
    );

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

  private setStormCells(stormCells: Position[]): void {
    for (const cell of this.stormCells) {
      this.board[cell.y][cell.x].hasStorm = false;
    }

    this.stormCells = stormCells.map((cell) => ({ ...cell }));

    for (const cell of this.stormCells) {
      this.board[cell.y][cell.x].hasStorm = true;
    }
  }

  private randomNonCenterCell(): Position {
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

  private stormNeighbors(position: Position): Position[] {
    const neighbors: Position[] = [];
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

  private positionKey(position: Position): string {
    return `${position.x},${position.y}`;
  }

  private isInside(position: Position): boolean {
    return (
      position.x >= 0 &&
      position.x < BOARD_SIZE &&
      position.y >= 0 &&
      position.y < BOARD_SIZE
    );
  }

  private positionsEqual(left: Position, right: Position): boolean {
    return left.x === right.x && left.y === right.y;
  }

  private distanceBetween(left: Position, right: Position): number {
    return Math.hypot(left.x - right.x, left.y - right.y);
  }

  private shuffle<T>(items: T[]): void {
    for (let index = items.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
    }
  }
}
