export interface Position {
    x: number;
    y: number;
}

export interface GameState {
    harvester: Position;
    worms: Position[];
    spicePositions: Set<string>;
    collectedSpice: number;
    totalSpice: number;
    moves: number;
    gameOver: boolean;
    won: boolean;
}

export enum CellType {
    Empty,
    Spice,
    Harvester,
    Worm
}
