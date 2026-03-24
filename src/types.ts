export const BOARD_SIZE = 8;
export const TOTAL_AMBER = 20;
export const CENTER_INDEX = Math.floor(BOARD_SIZE / 2);

export type GameStatus = "playing" | "won" | "lost";
export type LossReason = "sinkjaw_attack" | "trapped" | null;

export interface Position {
  x: number;
  y: number;
}

export interface MoveOption {
  target: Position;
  delta: Position;
  label: string;
  notation: string;
}

export interface CellState {
  hasAmber: boolean;
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
