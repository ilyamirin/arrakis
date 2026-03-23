import { BOARD_SIZE, type GameState, type Position } from "./types.js";

interface Assets {
  harvester: HTMLImageElement;
  worm: HTMLImageElement;
  spice: HTMLImageElement;
}

interface BoardMetrics {
  width: number;
  height: number;
  boardSize: number;
  cellSize: number;
  originX: number;
  originY: number;
  radius: number;
}

export class CanvasRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly assets: Assets;
  private lastState: GameState | null = null;

  constructor(canvas: HTMLCanvasElement, assets: Assets) {
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas 2D context is not available.");
    }

    this.canvas = canvas;
    this.ctx = context;
    this.assets = assets;
  }

  public render(state: GameState): void {
    this.lastState = state;
    this.resizeBackingStore();

    const metrics = this.getMetrics();
    const { ctx } = this;

    ctx.clearRect(0, 0, metrics.width, metrics.height);
    this.drawBackground(metrics);
    this.drawCells(state, metrics);
    this.drawGrid(metrics);
    this.drawPieces(state, metrics);
    this.drawOverlay(state, metrics);
  }

  public rerender(): void {
    if (this.lastState) {
      this.render(this.lastState);
    }
  }

  public cellFromClientPoint(clientX: number, clientY: number): Position | null {
    const rect = this.canvas.getBoundingClientRect();
    const metrics = this.getMetrics();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;

    if (
      localX < metrics.originX ||
      localY < metrics.originY ||
      localX > metrics.originX + metrics.boardSize ||
      localY > metrics.originY + metrics.boardSize
    ) {
      return null;
    }

    const x = Math.floor((localX - metrics.originX) / metrics.cellSize);
    const y = Math.floor((localY - metrics.originY) / metrics.cellSize);

    if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) {
      return null;
    }

    return { x, y };
  }

  private resizeBackingStore(): void {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    const ratio = window.devicePixelRatio || 1;

    if (
      this.canvas.width === Math.round(width * ratio) &&
      this.canvas.height === Math.round(height * ratio)
    ) {
      this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      return;
    }

    this.canvas.width = Math.round(width * ratio);
    this.canvas.height = Math.round(height * ratio);
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  private drawBackground(metrics: BoardMetrics): void {
    const gradient = this.ctx.createLinearGradient(0, 0, metrics.width, metrics.height);
    gradient.addColorStop(0, "rgba(246, 214, 146, 0.10)");
    gradient.addColorStop(0.5, "rgba(89, 63, 36, 0.18)");
    gradient.addColorStop(1, "rgba(12, 9, 6, 0.08)");
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, metrics.width, metrics.height);

    this.ctx.fillStyle = "rgba(255, 237, 204, 0.04)";
    this.ctx.beginPath();
    this.ctx.arc(metrics.width * 0.18, metrics.height * 0.12, metrics.width * 0.18, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = "rgba(217, 132, 68, 0.08)";
    this.ctx.beginPath();
    this.ctx.arc(metrics.width * 0.82, metrics.height * 0.78, metrics.width * 0.2, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawCells(state: GameState, metrics: BoardMetrics): void {
    for (let y = 0; y < BOARD_SIZE; y += 1) {
      for (let x = 0; x < BOARD_SIZE; x += 1) {
        const px = metrics.originX + x * metrics.cellSize;
        const py = metrics.originY + y * metrics.cellSize;
        const isValidMove = state.validMoves.some(
          (move) => move.target.x === x && move.target.y === y,
        );
        const isHarvester = state.harvester.x === x && state.harvester.y === y;
        const isWorm = state.worm?.x === x && state.worm?.y === y;
        const cell = state.board[y][x];

        const baseTone = (x + y) % 2 === 0 ? 0.16 : 0.11;
        this.ctx.fillStyle = `rgba(248, 227, 184, ${baseTone})`;
        this.roundRect(px, py, metrics.cellSize - 2, metrics.cellSize - 2, metrics.radius);
        this.ctx.fill();

        if (cell.hasSpice) {
          this.ctx.fillStyle = "rgba(236, 188, 89, 0.26)";
          this.roundRect(
            px + metrics.cellSize * 0.08,
            py + metrics.cellSize * 0.08,
            metrics.cellSize * 0.84,
            metrics.cellSize * 0.84,
            metrics.radius * 0.8,
          );
          this.ctx.fill();

          this.drawIcon(this.assets.spice, px, py, metrics.cellSize, 0.52);
        }

        if (isValidMove && state.status === "playing") {
          this.ctx.strokeStyle = "rgba(247, 228, 186, 0.86)";
          this.ctx.lineWidth = Math.max(2, metrics.cellSize * 0.04);
          this.roundRect(
            px + metrics.cellSize * 0.1,
            py + metrics.cellSize * 0.1,
            metrics.cellSize * 0.8,
            metrics.cellSize * 0.8,
            metrics.radius * 0.8,
          );
          this.ctx.stroke();
        }

        if (isHarvester) {
          this.ctx.fillStyle = "rgba(247, 228, 186, 0.08)";
          this.roundRect(
            px + metrics.cellSize * 0.05,
            py + metrics.cellSize * 0.05,
            metrics.cellSize * 0.9,
            metrics.cellSize * 0.9,
            metrics.radius,
          );
          this.ctx.fill();
        }

        if (isWorm) {
          this.ctx.fillStyle = "rgba(217, 108, 66, 0.18)";
          this.roundRect(
            px + metrics.cellSize * 0.05,
            py + metrics.cellSize * 0.05,
            metrics.cellSize * 0.9,
            metrics.cellSize * 0.9,
            metrics.radius,
          );
          this.ctx.fill();
        }
      }
    }
  }

  private drawGrid(metrics: BoardMetrics): void {
    this.ctx.strokeStyle = "rgba(248, 227, 184, 0.14)";
    this.ctx.lineWidth = 1;

    for (let index = 0; index <= BOARD_SIZE; index += 1) {
      const offset = index * metrics.cellSize;

      this.ctx.beginPath();
      this.ctx.moveTo(metrics.originX, metrics.originY + offset);
      this.ctx.lineTo(metrics.originX + metrics.boardSize, metrics.originY + offset);
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(metrics.originX + offset, metrics.originY);
      this.ctx.lineTo(metrics.originX + offset, metrics.originY + metrics.boardSize);
      this.ctx.stroke();
    }
  }

  private drawPieces(state: GameState, metrics: BoardMetrics): void {
    if (state.worm) {
      const px = metrics.originX + state.worm.x * metrics.cellSize;
      const py = metrics.originY + state.worm.y * metrics.cellSize;
      this.drawIcon(this.assets.worm, px, py, metrics.cellSize, 0.8);
    }

    const harvesterX = metrics.originX + state.harvester.x * metrics.cellSize;
    const harvesterY = metrics.originY + state.harvester.y * metrics.cellSize;
    this.drawIcon(this.assets.harvester, harvesterX, harvesterY, metrics.cellSize, 0.8);
  }

  private drawOverlay(state: GameState, metrics: BoardMetrics): void {
    if (state.status === "playing") {
      return;
    }

    this.ctx.fillStyle = "rgba(16, 11, 8, 0.72)";
    this.roundRect(
      metrics.originX + metrics.cellSize * 1.1,
      metrics.originY + metrics.cellSize * 3.2,
      metrics.boardSize - metrics.cellSize * 2.2,
      metrics.cellSize * 2.2,
      metrics.radius * 1.5,
    );
    this.ctx.fill();

    this.ctx.fillStyle = state.status === "won" ? "#8fb96a" : "#d96c42";
    this.ctx.font = `700 ${metrics.cellSize * 0.42}px "IBM Plex Mono", monospace`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText(
      state.status === "won" ? "HARVEST COMPLETE" : "SANDWORM STRIKE",
      metrics.width / 2,
      metrics.originY + metrics.cellSize * 4.0,
    );

    this.ctx.fillStyle = "rgba(249, 241, 223, 0.86)";
    this.ctx.font = `${metrics.cellSize * 0.22}px "IBM Plex Mono", monospace`;
    this.ctx.fillText(
      state.status === "won" ? "Запустите New Run для новой раскладки." : "Новая партия доступна по кнопке New Run.",
      metrics.width / 2,
      metrics.originY + metrics.cellSize * 4.7,
    );
  }

  private drawIcon(
    image: HTMLImageElement,
    cellX: number,
    cellY: number,
    cellSize: number,
    scale: number,
  ): void {
    const size = cellSize * scale;
    const offset = (cellSize - size) / 2;
    this.ctx.drawImage(image, cellX + offset, cellY + offset, size, size);
  }

  private getMetrics(): BoardMetrics {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    const boardSize = Math.min(width, height) * 0.86;
    const originX = (width - boardSize) / 2;
    const originY = (height - boardSize) / 2;
    const cellSize = boardSize / BOARD_SIZE;
    return {
      width,
      height,
      boardSize,
      cellSize,
      originX,
      originY,
      radius: Math.max(6, cellSize * 0.12),
    };
  }

  private roundRect(x: number, y: number, width: number, height: number, radius: number): void {
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, width, height, radius);
  }
}

export async function loadAssets(): Promise<Assets> {
  const [harvester, worm, spice] = await Promise.all([
    loadImage("./assets/harvester.svg"),
    loadImage("./assets/worm.svg"),
    loadImage("./assets/spice.svg"),
  ]);

  return { harvester, worm, spice };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load asset: ${src}`));
    image.src = src;
  });
}
