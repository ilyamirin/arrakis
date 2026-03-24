import {
  BOARD_SIZE,
  CENTER_INDEX,
  TOTAL_AMBER,
  type CellState,
  type GameState,
  type LossReason,
  type MoveOption,
  type Position,
} from "./types.js";

export interface SinkjawSpawnContext {
  board: CellState[][];
  collector: Position;
  previousSinkjaw: Position | null;
  nextMoves: MoveOption[];
  spawnCandidates: Position[];
}

export type SinkjawSpawnSelector = (context: SinkjawSpawnContext) => Position | null;

const ADAPTIVE_SPAWN_RATE = 0.72;

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
  private collector: Position = { x: CENTER_INDEX, y: CENTER_INDEX };
  private sinkjaw: Position | null = null;
  private moves = 0;
  private collectedAmber = 0;
  private status: GameState["status"] = "playing";
  private lossReason: LossReason = null;
  private message = "";
  private sinkjawSpawnSelector: SinkjawSpawnSelector | null = null;

  constructor() {
    this.reset();
  }

  public reset(): GameState {
    this.board = this.createBoard();
    this.collector = { x: CENTER_INDEX, y: CENTER_INDEX };
    this.sinkjaw = null;
    this.moves = 0;
    this.collectedAmber = 0;
    this.status = "playing";
    this.lossReason = null;
    this.message = "Выберите подсвеченную клетку, чтобы начать маршрут через The Amber Waste.";
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

  public setSinkjawSpawnSelector(selector: SinkjawSpawnSelector | null): void {
    this.sinkjawSpawnSelector = selector;
  }

  public moveTo(target: Position): GameState {
    if (this.status !== "playing") {
      return this.getState();
    }

    const validMove = this.computeValidMoves(this.sinkjaw).find((move) =>
      this.positionsEqual(move.target, target),
    );

    if (!validMove) {
      this.message = "Этот прыжок недоступен. Используйте подсвеченные клетки.";
      return this.getState();
    }

    this.collector = { ...validMove.target };
    this.moves += 1;

    if (this.board[target.y][target.x].hasAmber) {
      this.board[target.y][target.x].hasAmber = false;
      this.collectedAmber += 1;
      this.message = "Amber собран. Sinkjaw уже чувствует вибрацию.";
    } else {
      this.message = "Пустой участок Waste. Продолжайте маршрут.";
    }

    if (this.collectedAmber >= TOTAL_AMBER) {
      this.status = "won";
      this.lossReason = null;
      this.sinkjaw = null;
      this.message = `Маршрут завершён за ${this.moves} ходов. Весь amber собран.`;
      return this.getState();
    }

    this.spawnSinkjaw();

    if (this.status === "playing" && this.computeValidMoves(this.sinkjaw).length === 0) {
      this.status = "lost";
      this.lossReason = "trapped";
      this.message = "Ходы закончились: Collector загнан в тупик.";
    }

    return this.getState();
  }

  private createBoard(): CellState[][] {
    const board = Array.from({ length: BOARD_SIZE }, () =>
      Array.from({ length: BOARD_SIZE }, () => ({ hasAmber: false })),
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

    this.shuffle(available);

    for (const cell of available.slice(0, TOTAL_AMBER)) {
      board[cell.y][cell.x].hasAmber = true;
    }

    return board;
  }

  private computeValidMoves(blockedCell: Position | null): MoveOption[] {
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

  private spawnSinkjaw(): void {
    const candidates: Position[] = [];

    for (let y = 0; y < BOARD_SIZE; y += 1) {
      for (let x = 0; x < BOARD_SIZE; x += 1) {
        const next = { x, y };
        if (this.sinkjaw && this.positionsEqual(next, this.sinkjaw)) {
          continue;
        }
        candidates.push(next);
      }
    }

    if (candidates.length === 0) {
      this.sinkjaw = null;
      return;
    }

    const preferredTarget = this.pickAdaptiveTarget();
    const nextSinkjaw = preferredTarget ?? candidates[Math.floor(Math.random() * candidates.length)];
    this.sinkjaw = nextSinkjaw;

    if (this.positionsEqual(nextSinkjaw, this.collector)) {
      this.status = "lost";
      this.lossReason = "sinkjaw_attack";
      this.message = "Sinkjaw вынырнул прямо под Collector. Экспедиция потеряна.";
      return;
    }

    this.message = `Sinkjaw замечен в секторе ${this.toBoardNotation(nextSinkjaw)}.`;
  }

  private pickAdaptiveTarget(): Position | null {
    if (!this.sinkjawSpawnSelector) {
      return null;
    }

    if (Math.random() > ADAPTIVE_SPAWN_RATE) {
      return null;
    }

    const nextMoves = this.computeValidMoves(null).filter(
      (move) => !this.sinkjaw || !this.positionsEqual(move.target, this.sinkjaw),
    );
    const spawnCandidates: Position[] = [];

    for (let y = 0; y < BOARD_SIZE; y += 1) {
      for (let x = 0; x < BOARD_SIZE; x += 1) {
        const candidate = { x, y };
        if (this.sinkjaw && this.positionsEqual(candidate, this.sinkjaw)) {
          continue;
        }
        if (this.positionsEqual(candidate, this.collector)) {
          continue;
        }
        spawnCandidates.push(candidate);
      }
    }

    if (spawnCandidates.length === 0) {
      return null;
    }

    const preferred = this.sinkjawSpawnSelector({
      board: this.board,
      collector: this.collector,
      previousSinkjaw: this.sinkjaw ? { ...this.sinkjaw } : null,
      nextMoves,
      spawnCandidates,
    });

    if (!preferred) {
      return null;
    }

    if (this.sinkjaw && this.positionsEqual(preferred, this.sinkjaw)) {
      return null;
    }

    return spawnCandidates.some((candidate) => this.positionsEqual(candidate, preferred))
      ? { ...preferred }
      : null;
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

  private shuffle<T>(items: T[]): void {
    for (let index = items.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
    }
  }
}
