import { Position } from './types.js';

export class Harvester {
    public position: Position;

    constructor(x: number = 4, y: number = 4) {
        this.position = { x, y };
    }

    // Получить все возможные ходы харвестера (движение буквой "Г")
    getPossibleMoves(): Position[] {
        const moves: Position[] = [];
        const knightMoves = [
            { x: 2, y: 1 }, { x: 2, y: -1 },
            { x: -2, y: 1 }, { x: -2, y: -1 },
            { x: 1, y: 2 }, { x: 1, y: -2 },
            { x: -1, y: 2 }, { x: -1, y: -2 }
        ];

        for (const move of knightMoves) {
            const newX = this.position.x + move.x;
            const newY = this.position.y + move.y;
            
            if (newX >= 0 && newX < 9 && newY >= 0 && newY < 9) {
                moves.push({ x: newX, y: newY });
            }
        }

        return moves;
    }

    moveTo(position: Position): void {
        this.position = { ...position };
    }

    reset(): void {
        this.position = { x: 4, y: 4 };
    }
}
