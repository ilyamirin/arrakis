export const BOARD_SIZE = 9;
export const TOTAL_SPICE = 25;
export const CENTER_INDEX = Math.floor(BOARD_SIZE / 2);

export type GameStatus = "playing" | "won" | "lost";

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
  hasSpice: boolean;
}

export interface GameState {
  board: CellState[][];
  harvester: Position;
  worm: Position | null;
  validMoves: MoveOption[];
  totalSpice: number;
  collectedSpice: number;
  moves: number;
  status: GameStatus;
  message: string;
}
