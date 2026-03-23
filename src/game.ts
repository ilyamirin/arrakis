import {
  BOARD_SIZE,
  CENTER_INDEX,
  TOTAL_SPICE,
  type CellState,
  type GameState,
  type LossReason,
  type MoveOption,
  type Position,
} from "./types.js";

export interface WormSpawnContext {
  board: CellState[][];
  harvester: Position;
  previousWorm: Position | null;
  nextMoves: MoveOption[];
  spawnCandidates: Position[];
}

export type WormSpawnSelector = (context: WormSpawnContext) => Position | null;

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
  private harvester: Position = { x: CENTER_INDEX, y: CENTER_INDEX };
  private worm: Position | null = null;
  private moves = 0;
  private collectedSpice = 0;
  private status: GameState["status"] = "playing";
  private lossReason: LossReason = null;
  private message = "";
  private wormSpawnSelector: WormSpawnSelector | null = null;

  constructor() {
    this.reset();
  }

  public reset(): GameState {
    this.board = this.createBoard();
    this.harvester = { x: CENTER_INDEX, y: CENTER_INDEX };
    this.worm = null;
    this.moves = 0;
    this.collectedSpice = 0;
    this.status = "playing";
    this.lossReason = null;
    this.message = "Выберите подсвеченную клетку, чтобы начать маршрут через The Amber Waste.";
    return this.getState();
  }

  public getState(): GameState {
    return {
      board: this.board.map((row) => row.map((cell) => ({ ...cell }))),
      harvester: { ...this.harvester },
      worm: this.worm ? { ...this.worm } : null,
      validMoves: this.computeValidMoves(this.worm),
      totalSpice: TOTAL_SPICE,
      collectedSpice: this.collectedSpice,
      moves: this.moves,
      status: this.status,
      message: this.message,
      lossReason: this.lossReason,
    };
  }

  public setWormSpawnSelector(selector: WormSpawnSelector | null): void {
    this.wormSpawnSelector = selector;
  }

  public moveTo(target: Position): GameState {
    if (this.status !== "playing") {
      return this.getState();
    }

    const validMove = this.computeValidMoves(this.worm).find((move) =>
      this.positionsEqual(move.target, target),
    );

    if (!validMove) {
      this.message = "Этот прыжок недоступен. Используйте подсвеченные клетки.";
      return this.getState();
    }

    this.harvester = { ...validMove.target };
    this.moves += 1;

    if (this.board[target.y][target.x].hasSpice) {
      this.board[target.y][target.x].hasSpice = false;
      this.collectedSpice += 1;
      this.message = "Amber собран. Sinkjaw уже чувствует вибрацию.";
    } else {
      this.message = "Пустой участок Waste. Продолжайте маршрут.";
    }

    if (this.collectedSpice >= TOTAL_SPICE) {
      this.status = "won";
      this.lossReason = null;
      this.worm = null;
      this.message = `Маршрут завершён за ${this.moves} ходов. Весь amber собран.`;
      return this.getState();
    }

    this.spawnWorm();

    if (this.status === "playing" && this.computeValidMoves(this.worm).length === 0) {
      this.status = "lost";
      this.lossReason = "trapped";
      this.message = "Ходы закончились: Collector загнан в тупик.";
    }

    return this.getState();
  }

  private createBoard(): CellState[][] {
    const board = Array.from({ length: BOARD_SIZE }, () =>
      Array.from({ length: BOARD_SIZE }, () => ({ hasSpice: false })),
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

    for (const cell of available.slice(0, TOTAL_SPICE)) {
      board[cell.y][cell.x].hasSpice = true;
    }

    return board;
  }

  private computeValidMoves(blockedCell: Position | null): MoveOption[] {
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
      .filter((move) => !blockedCell || !this.positionsEqual(move.target, blockedCell))
      .sort((left, right) => left.target.y - right.target.y || left.target.x - right.target.x);
  }

  private spawnWorm(): void {
    const candidates: Position[] = [];

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

    const preferredTarget = this.pickAdaptiveTarget();
    const nextWorm = preferredTarget ?? candidates[Math.floor(Math.random() * candidates.length)];
    this.worm = nextWorm;

    if (this.positionsEqual(nextWorm, this.harvester)) {
      this.status = "lost";
      this.lossReason = "worm_attack";
      this.message = "Sinkjaw вынырнул прямо под Collector. Экспедиция потеряна.";
      return;
    }

    this.message = `Sinkjaw замечен в секторе ${this.toBoardNotation(nextWorm)}.`;
  }

  private pickAdaptiveTarget(): Position | null {
    if (!this.wormSpawnSelector) {
      return null;
    }

    if (Math.random() > ADAPTIVE_SPAWN_RATE) {
      return null;
    }

    const nextMoves = this.computeValidMoves(null).filter(
      (move) => !this.worm || !this.positionsEqual(move.target, this.worm),
    );
    const spawnCandidates: Position[] = [];

    for (let y = 0; y < BOARD_SIZE; y += 1) {
      for (let x = 0; x < BOARD_SIZE; x += 1) {
        const candidate = { x, y };
        if (this.worm && this.positionsEqual(candidate, this.worm)) {
          continue;
        }
        if (this.positionsEqual(candidate, this.harvester)) {
          continue;
        }
        spawnCandidates.push(candidate);
      }
    }

    if (spawnCandidates.length === 0) {
      return null;
    }

    const preferred = this.wormSpawnSelector({
      board: this.board,
      harvester: this.harvester,
      previousWorm: this.worm ? { ...this.worm } : null,
      nextMoves,
      spawnCandidates,
    });

    if (!preferred) {
      return null;
    }

    if (this.worm && this.positionsEqual(preferred, this.worm)) {
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
