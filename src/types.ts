export const BOARD_SIZE = 8;
export const TOTAL_AMBER = 20;
export const CENTER_INDEX = Math.floor(BOARD_SIZE / 2);

export type GameStatus = "playing" | "won" | "lost";
export type LossReason = "sinkjaw_attack" | "trapped" | null;
export type TelegraphSector =
  | "north"
  | "northeast"
  | "east"
  | "southeast"
  | "south"
  | "southwest"
  | "west"
  | "northwest"
  | "encircling"
  | "obscured";

export interface Position {
  x: number;
  y: number;
}

export interface MoveOption {
  target: Position;
  delta: Position;
  label: string;
  notation: string;
  telegraphSector: TelegraphSector;
  telegraphCandidates: Position[];
  pilotLine: string;
  isStormLanding: boolean;
}

export interface PlannedMove {
  target: Position;
  driftTarget: Position | null;
}

export interface CellState {
  hasAmber: boolean;
  hasStorm: boolean;
}

export interface GameState {
  board: CellState[][];
  collector: Position;
  sinkjaw: Position | null;
  validMoves: MoveOption[];
  totalAmber: number;
  collectedAmber: number;
  moves: number;
  status: GameStatus;
  message: string;
  lossReason: LossReason;
}
