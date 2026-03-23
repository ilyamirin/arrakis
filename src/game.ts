import { Position, GameState } from './types.js';
import { Harvester } from './harvester.js';
import { Worm } from './worm.js';
import { Renderer } from './renderer.js';

export class Game {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private harvester: Harvester;
    private worms: Worm[];
    private spicePositions: Set<string>;
    private collectedSpice: number;
    private totalSpice: number;
    private moves: number;
    private gameOver: boolean;
    private won: boolean;
    private renderer: Renderer;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.harvester = new Harvester();
        this.worms = [];
        this.spicePositions = new Set();
        this.collectedSpice = 0;
        this.totalSpice = 25;
        this.moves = 0;
        this.gameOver = false;
        this.won = false;
        this.renderer = new Renderer(this.ctx);

        this.initializeGame();
        this.setupEventListeners();
    }

    private initializeGame(): void {
        this.generateSpice();
        this.render();
        this.updateUI();
    }

    private generateSpice(): void {
        this.spicePositions.clear();
        const harvesterPos = `${this.harvester.position.x},${this.harvester.position.y}`;
        
        while (this.spicePositions.size < this.totalSpice) {
            const x = Math.floor(Math.random() * 9);
            const y = Math.floor(Math.random() * 9);
            const posKey = `${x},${y}`;
            
            if (posKey !== harvesterPos) {
                this.spicePositions.add(posKey);
            }
        }
    }

    private setupEventListeners(): void {
        this.canvas.addEventListener('click', (event) => {
            if (this.gameOver) return;

            const rect = this.canvas.getBoundingClientRect();
            const x = Math.floor((event.clientX - rect.left) / 50);
            const y = Math.floor((event.clientY - rect.top) / 50);
            
            this.handleMove({ x, y });
        });
    }

    private handleMove(targetPosition: Position): void {
        const possibleMoves = this.harvester.getPossibleMoves();
        const isValidMove = possibleMoves.some(move => 
            move.x === targetPosition.x && move.y === targetPosition.y
        );

        if (!isValidMove) return;

        // Проверяем, есть ли червь на целевой позиции
        const wormOnTarget = this.worms.some(worm => 
            worm.position.x === targetPosition.x && worm.position.y === targetPosition.y
        );

        if (wormOnTarget) {
            this.gameOver = true;
            this.updateUI();
            this.render();
            return;
        }

        // Перемещаем харвестер
        this.harvester.moveTo(targetPosition);
        this.moves++;

        // Проверяем сбор спайса
        const posKey = `${targetPosition.x},${targetPosition.y}`;
        if (this.spicePositions.has(posKey)) {
            this.spicePositions.delete(posKey);
            this.collectedSpice++;
        }

        // Проверяем победу
        if (this.collectedSpice === this.totalSpice) {
            this.won = true;
            this.gameOver = true;
            this.updateUI();
            this.render();
            return;
        }

        // Спавним червя
        this.spawnWorm();

        this.render();
        this.updateUI();
    }

    private spawnWorm(): void {
        const occupiedPositions: Position[] = [
            this.harvester.position,
            ...this.worms.map(worm => worm.position)
        ];

        const newWorm = Worm.spawnRandomWorm(occupiedPositions);
        if (newWorm) {
            this.worms.push(newWorm);

            // Проверяем, не появился ли червь на харвестере
            if (newWorm.position.x === this.harvester.position.x && 
                newWorm.position.y === this.harvester.position.y) {
                this.gameOver = true;
            }
        }
    }

    private render(): void {
        this.renderer.clear();
        this.renderer.drawGrid();
        this.renderer.drawSpice(Array.from(this.spicePositions));
        this.renderer.drawWorms(this.worms);
        this.renderer.drawHarvester(this.harvester);
        
        if (!this.gameOver) {
            this.renderer.drawPossibleMoves(this.harvester.getPossibleMoves());
        }
    }

    private updateUI(): void {
        const spiceCountEl = document.getElementById('spice-count')!;
        const movesCountEl = document.getElementById('moves-count')!;
        const gameStatusEl = document.getElementById('game-status')!;

        spiceCountEl.textContent = this.collectedSpice.toString();
        movesCountEl.textContent = this.moves.toString();

        if (this.won) {
            gameStatusEl.textContent = 'Победа! Весь спайс собран!';
            gameStatusEl.style.color = '#228B22';
        } else if (this.gameOver) {
            gameStatusEl.textContent = 'Поражение! Червь поймал харвестер!';
            gameStatusEl.style.color = '#DC143C';
        } else {
            gameStatusEl.textContent = 'Собирайте спайс, избегайте червей!';
            gameStatusEl.style.color = '#8B4513';
        }
    }

    public restart(): void {
        this.harvester.reset();
        this.worms = [];
        this.spicePositions.clear();
        this.collectedSpice = 0;
        this.moves = 0;
        this.gameOver = false;
        this.won = false;
        
        this.initializeGame();
    }
}
