import { Position } from './types.js';

export class Worm {
    public position: Position;

    constructor(x: number, y: number) {
        this.position = { x, y };
    }

    static spawnRandomWorm(occupiedPositions: Position[]): Worm | null {
        const allPositions: Position[] = [];
        
        // Создаем список всех возможных позиций
        for (let x = 0; x < 9; x++) {
            for (let y = 0; y < 9; y++) {
                allPositions.push({ x, y });
            }
        }

        // Фильтруем занятые позиции
        const availablePositions = allPositions.filter(pos => 
            !occupiedPositions.some(occupied => 
                occupied.x === pos.x && occupied.y === pos.y
            )
        );

        if (availablePositions.length === 0) {
            return null;
        }

        const randomIndex = Math.floor(Math.random() * availablePositions.length);
        const randomPosition = availablePositions[randomIndex];
        
        return new Worm(randomPosition.x, randomPosition.y);
    }
}
