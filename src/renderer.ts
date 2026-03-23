import { Position } from './types.js';
import { Harvester } from './harvester.js';
import { Worm } from './worm.js';

export class Renderer {
    private ctx: CanvasRenderingContext2D;
    private cellSize: number = 50;

    constructor(ctx: CanvasRenderingContext2D) {
        this.ctx = ctx;
    }

    clear(): void {
        this.ctx.fillStyle = '#F4A460'; // Sandy brown background
        this.ctx.fillRect(0, 0, 450, 450);
    }

    drawGrid(): void {
        this.ctx.strokeStyle = '#8B4513';
        this.ctx.lineWidth = 1;

        for (let i = 0; i <= 9; i++) {
            // Вертикальные линии
            this.ctx.beginPath();
            this.ctx.moveTo(i * this.cellSize, 0);
            this.ctx.lineTo(i * this.cellSize, 450);
            this.ctx.stroke();

            // Горизонтальные линии
            this.ctx.beginPath();
            this.ctx.moveTo(0, i * this.cellSize);
            this.ctx.lineTo(450, i * this.cellSize);
            this.ctx.stroke();
        }
    }

    drawSpice(spicePositions: string[]): void {
        this.ctx.fillStyle = '#FFD700'; // Gold color for spice
        
        for (const posKey of spicePositions) {
            const [x, y] = posKey.split(',').map(Number);
            const centerX = x * this.cellSize + this.cellSize / 2;
            const centerY = y * this.cellSize + this.cellSize / 2;
            
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, 15, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Добавляем блеск
            this.ctx.fillStyle = '#FFFF99';
            this.ctx.beginPath();
            this.ctx.arc(centerX - 5, centerY - 5, 5, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.fillStyle = '#FFD700';
        }
    }

    drawHarvester(harvester: Harvester): void {
        const x = harvester.position.x * this.cellSize + this.cellSize / 2;
        const y = harvester.position.y * this.cellSize + this.cellSize / 2;
        
        // Основное тело харвестера
        this.ctx.fillStyle = '#4169E1'; // Royal blue
        this.ctx.fillRect(x - 20, y - 20, 40, 40);
        
        // Детали харвестера
        this.ctx.fillStyle = '#1E90FF'; // Dodger blue
        this.ctx.fillRect(x - 15, y - 15, 30, 30);
        
        // Центральная часть
        this.ctx.fillStyle = '#00BFFF'; // Deep sky blue
        this.ctx.beginPath();
        this.ctx.arc(x, y, 8, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawWorms(worms: Worm[]): void {
        this.ctx.fillStyle = '#8B0000'; // Dark red for worms
        
        for (const worm of worms) {
            const x = worm.position.x * this.cellSize + this.cellSize / 2;
            const y = worm.position.y * this.cellSize + this.cellSize / 2;
            
            // Тело червя
            this.ctx.beginPath();
            this.ctx.arc(x, y, 18, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Сегменты червя
            this.ctx.fillStyle = '#A52A2A'; // Brown
            for (let i = 0; i < 3; i++) {
                this.ctx.beginPath();
                this.ctx.arc(x + (i - 1) * 6, y + (i - 1) * 6, 12 - i * 2, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            this.ctx.fillStyle = '#8B0000';
        }
    }

    drawPossibleMoves(moves: Position[]): void {
        this.ctx.fillStyle = 'rgba(0, 255, 0, 0.3)'; // Semi-transparent green
        
        for (const move of moves) {
            const x = move.x * this.cellSize;
            const y = move.y * this.cellSize;
            
            this.ctx.fillRect(x + 2, y + 2, this.cellSize - 4, this.cellSize - 4);
        }
    }
}
