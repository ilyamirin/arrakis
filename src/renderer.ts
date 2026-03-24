import {
  BOARD_SIZE,
  type GameState,
  type MoveOption,
  type Position,
  type TelegraphSector,
} from "./types.js";

interface Assets {
  collector: HTMLImageElement;
  sinkjaw: HTMLImageElement;
  amber: HTMLImageElement;
  sinkjawFeast: HTMLImageElement;
  skimmer: HTMLImageElement;
}

export interface FlightAnimationFrame {
  activeTarget: Position;
  carrier: Position;
  heading: number;
  carriedCollector: Position | null;
  landedCollector: Position | null;
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
  private lastAnimation: FlightAnimationFrame | null = null;
  private lastPreviewMove: MoveOption | null = null;

  constructor(canvas: HTMLCanvasElement, assets: Assets) {
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas 2D context is not available.");
    }

    this.canvas = canvas;
    this.ctx = context;
    this.assets = assets;
  }

  public render(
    state: GameState,
    animation: FlightAnimationFrame | null = null,
    previewMove: MoveOption | null = null,
  ): void {
    this.lastState = state;
    this.lastAnimation = animation;
    this.lastPreviewMove = previewMove;
    this.resizeBackingStore();

    const metrics = this.getMetrics();
    const { ctx } = this;

    ctx.clearRect(0, 0, metrics.width, metrics.height);
    this.drawBackground(metrics);
    this.drawCells(state, metrics, animation, previewMove);
    this.drawGrid(metrics);
    this.drawPieces(state, metrics, animation);
    this.drawOverlay(state, metrics);
  }

  public rerender(): void {
    if (this.lastState) {
      this.render(this.lastState, this.lastAnimation, this.lastPreviewMove);
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

  private drawCells(
    state: GameState,
    metrics: BoardMetrics,
    animation: FlightAnimationFrame | null,
    previewMove: MoveOption | null,
  ): void {
    for (let y = 0; y < BOARD_SIZE; y += 1) {
      for (let x = 0; x < BOARD_SIZE; x += 1) {
        const px = metrics.originX + x * metrics.cellSize;
        const py = metrics.originY + y * metrics.cellSize;
        const moveOption =
          state.validMoves.find((move) => move.target.x === x && move.target.y === y) ?? null;
        const isValidMove = moveOption !== null;
        const isActiveTarget =
          animation?.activeTarget.x === x && animation.activeTarget.y === y;
        const isCollector = state.collector.x === x && state.collector.y === y;
        const isSinkjaw = state.sinkjaw?.x === x && state.sinkjaw?.y === y;
        const cell = state.board[y][x];
        const isTelegraphCandidate = Boolean(
          previewMove?.telegraphCandidates.some((candidate) => candidate.x === x && candidate.y === y),
        );
        const isPreviewTarget = Boolean(
          previewMove && previewMove.target.x === x && previewMove.target.y === y,
        );

        const baseTone = (x + y) % 2 === 0 ? 0.16 : 0.11;
        this.ctx.fillStyle = `rgba(248, 227, 184, ${baseTone})`;
        this.roundRect(px, py, metrics.cellSize - 2, metrics.cellSize - 2, metrics.radius);
        this.ctx.fill();

        if (cell.hasStorm) {
          this.ctx.fillStyle = "rgba(141, 170, 177, 0.12)";
          this.roundRect(
            px + metrics.cellSize * 0.06,
            py + metrics.cellSize * 0.06,
            metrics.cellSize * 0.88,
            metrics.cellSize * 0.88,
            metrics.radius * 0.8,
          );
          this.ctx.fill();
          this.drawStormGlyph(px, py, metrics.cellSize);
        }

        if (cell.hasAmber) {
          this.ctx.fillStyle = "rgba(236, 188, 89, 0.26)";
          this.roundRect(
            px + metrics.cellSize * 0.08,
            py + metrics.cellSize * 0.08,
            metrics.cellSize * 0.84,
            metrics.cellSize * 0.84,
            metrics.radius * 0.8,
          );
          this.ctx.fill();

          this.drawIcon(this.assets.amber, px, py, metrics.cellSize, 0.52);
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
          this.drawTelegraphMarker(moveOption.telegraphSector, px, py, metrics.cellSize);
        }

        if (isActiveTarget && state.status === "playing") {
          this.ctx.fillStyle = "rgba(247, 228, 186, 0.16)";
          this.roundRect(
            px + metrics.cellSize * 0.16,
            py + metrics.cellSize * 0.16,
            metrics.cellSize * 0.68,
            metrics.cellSize * 0.68,
            metrics.radius * 0.8,
          );
          this.ctx.fill();

          this.ctx.strokeStyle = "rgba(255, 244, 216, 0.96)";
          this.ctx.lineWidth = Math.max(2, metrics.cellSize * 0.05);
          this.roundRect(
            px + metrics.cellSize * 0.14,
            py + metrics.cellSize * 0.14,
            metrics.cellSize * 0.72,
            metrics.cellSize * 0.72,
            metrics.radius * 0.8,
          );
          this.ctx.stroke();
        }

        if (isTelegraphCandidate && state.status === "playing" && previewMove && !previewMove.isStormLanding) {
          this.ctx.fillStyle = "rgba(217, 108, 66, 0.16)";
          this.roundRect(
            px + metrics.cellSize * 0.18,
            py + metrics.cellSize * 0.18,
            metrics.cellSize * 0.64,
            metrics.cellSize * 0.64,
            metrics.radius * 0.7,
          );
          this.ctx.fill();
        }

        if (isPreviewTarget && state.status === "playing") {
          this.ctx.strokeStyle = previewMove?.isStormLanding
            ? "rgba(151, 197, 207, 0.96)"
            : "rgba(255, 214, 153, 0.96)";
          this.ctx.lineWidth = Math.max(2, metrics.cellSize * 0.05);
          this.roundRect(
            px + metrics.cellSize * 0.06,
            py + metrics.cellSize * 0.06,
            metrics.cellSize * 0.88,
            metrics.cellSize * 0.88,
            metrics.radius * 0.9,
          );
          this.ctx.stroke();
        }

        if (isCollector) {
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

        if (isSinkjaw) {
          if (cell.hasAmber) {
            this.ctx.fillStyle = "rgba(241, 193, 107, 0.30)";
            this.roundRect(
              px + metrics.cellSize * 0.12,
              py + metrics.cellSize * 0.12,
              metrics.cellSize * 0.76,
              metrics.cellSize * 0.76,
              metrics.radius * 0.9,
            );
            this.ctx.fill();

            this.ctx.strokeStyle = "rgba(247, 228, 186, 0.46)";
            this.ctx.lineWidth = Math.max(2, metrics.cellSize * 0.03);
            this.roundRect(
              px + metrics.cellSize * 0.14,
              py + metrics.cellSize * 0.14,
              metrics.cellSize * 0.72,
              metrics.cellSize * 0.72,
              metrics.radius * 0.8,
            );
            this.ctx.stroke();
          }

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

  private drawStormGlyph(cellX: number, cellY: number, cellSize: number): void {
    const { ctx } = this;
    ctx.save();
    ctx.strokeStyle = "rgba(192, 226, 233, 0.54)";
    ctx.lineWidth = Math.max(1.5, cellSize * 0.028);
    ctx.lineCap = "round";

    for (let row = 0; row < 3; row += 1) {
      const startX = cellX + cellSize * 0.18;
      const startY = cellY + cellSize * (0.34 + row * 0.14);
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.bezierCurveTo(
        startX + cellSize * 0.12,
        startY - cellSize * 0.08,
        startX + cellSize * 0.26,
        startY + cellSize * 0.08,
        startX + cellSize * 0.38,
        startY,
      );
      ctx.bezierCurveTo(
        startX + cellSize * 0.5,
        startY - cellSize * 0.08,
        startX + cellSize * 0.64,
        startY + cellSize * 0.08,
        startX + cellSize * 0.74,
        startY,
      );
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawTelegraphMarker(
    sector: TelegraphSector,
    cellX: number,
    cellY: number,
    cellSize: number,
  ): void {
    const markerX = cellX + cellSize * 0.76;
    const markerY = cellY + cellSize * 0.24;
    const radius = cellSize * 0.09;

    this.ctx.save();
    this.ctx.fillStyle = "rgba(32, 20, 14, 0.72)";
    this.ctx.strokeStyle = "rgba(247, 228, 186, 0.26)";
    this.ctx.lineWidth = Math.max(1, cellSize * 0.018);
    this.ctx.beginPath();
    this.ctx.arc(markerX, markerY, radius * 1.4, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    if (sector === "encircling") {
      this.ctx.strokeStyle = "rgba(247, 228, 186, 0.88)";
      this.ctx.beginPath();
      this.ctx.arc(markerX, markerY, radius * 0.8, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();
      return;
    }

    if (sector === "obscured") {
      this.ctx.strokeStyle = "rgba(188, 228, 236, 0.92)";
      this.ctx.lineWidth = Math.max(1.5, cellSize * 0.022);
      for (let index = -1; index <= 1; index += 1) {
        const y = markerY + index * radius * 0.45;
        this.ctx.beginPath();
        this.ctx.moveTo(markerX - radius * 0.75, y);
        this.ctx.quadraticCurveTo(markerX, y - radius * 0.55, markerX + radius * 0.75, y);
        this.ctx.stroke();
      }
      this.ctx.restore();
      return;
    }

    const vector = this.sectorVector(sector);
    const shaftLength = radius * 1.2;
    const tipX = markerX + vector.x * shaftLength;
    const tipY = markerY + vector.y * shaftLength;
    const baseX = markerX - vector.x * radius * 0.25;
    const baseY = markerY - vector.y * radius * 0.25;
    const perpX = -vector.y;
    const perpY = vector.x;

    this.ctx.strokeStyle = "rgba(247, 228, 186, 0.96)";
    this.ctx.lineWidth = Math.max(1.5, cellSize * 0.022);
    this.ctx.beginPath();
    this.ctx.moveTo(baseX, baseY);
    this.ctx.lineTo(tipX, tipY);
    this.ctx.stroke();

    this.ctx.fillStyle = "rgba(247, 228, 186, 0.96)";
    this.ctx.beginPath();
    this.ctx.moveTo(tipX, tipY);
    this.ctx.lineTo(
      tipX - vector.x * radius * 0.8 + perpX * radius * 0.45,
      tipY - vector.y * radius * 0.8 + perpY * radius * 0.45,
    );
    this.ctx.lineTo(
      tipX - vector.x * radius * 0.8 - perpX * radius * 0.45,
      tipY - vector.y * radius * 0.8 - perpY * radius * 0.45,
    );
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.restore();
  }

  private sectorVector(sector: TelegraphSector): Position {
    switch (sector) {
      case "north":
        return { x: 0, y: -1 };
      case "northeast":
        return { x: 0.71, y: -0.71 };
      case "east":
        return { x: 1, y: 0 };
      case "southeast":
        return { x: 0.71, y: 0.71 };
      case "south":
        return { x: 0, y: 1 };
      case "southwest":
        return { x: -0.71, y: 0.71 };
      case "west":
        return { x: -1, y: 0 };
      case "northwest":
        return { x: -0.71, y: -0.71 };
      default:
        return { x: 0, y: 0 };
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

  private drawPieces(
    state: GameState,
    metrics: BoardMetrics,
    animation: FlightAnimationFrame | null,
  ): void {
    const sinkjawConsumedCollector = state.status === "lost" && state.lossReason === "sinkjaw_attack";
    const isAnimatingCollector = Boolean(animation?.carriedCollector || animation?.landedCollector);

    if (state.sinkjaw && !sinkjawConsumedCollector) {
      const px = metrics.originX + state.sinkjaw.x * metrics.cellSize;
      const py = metrics.originY + state.sinkjaw.y * metrics.cellSize;
      this.drawIcon(this.assets.sinkjaw, px, py, metrics.cellSize, 0.8);
    }

    if (!sinkjawConsumedCollector && !isAnimatingCollector) {
      const collectorX = metrics.originX + state.collector.x * metrics.cellSize;
      const collectorY = metrics.originY + state.collector.y * metrics.cellSize;
      this.drawIcon(this.assets.collector, collectorX, collectorY, metrics.cellSize, 0.8);
    }

    if (animation?.landedCollector && !sinkjawConsumedCollector) {
      this.drawFloatingIcon(
        this.assets.collector,
        animation.landedCollector,
        metrics,
        0.8,
        0,
        0,
      );
    }

    if (animation?.carriedCollector && !sinkjawConsumedCollector) {
      this.drawFloatingIcon(
        this.assets.collector,
        animation.carriedCollector,
        metrics,
        0.62,
        animation.heading,
        metrics.cellSize * 0.1,
      );
    }

    if (animation) {
      this.drawFloatingIcon(
        this.assets.skimmer,
        animation.carrier,
        metrics,
        1.12,
        animation.heading,
        0,
      );
    }
  }

  private drawOverlay(state: GameState, metrics: BoardMetrics): void {
    if (state.status === "playing") {
      return;
    }

    const isSinkjawAttack = state.status === "lost" && state.lossReason === "sinkjaw_attack";
    const overlayHeight = isSinkjawAttack ? metrics.cellSize * 4.9 : metrics.cellSize * 2.45;
    const overlayY = isSinkjawAttack
      ? metrics.originY + metrics.cellSize * 1.9
      : metrics.originY + metrics.cellSize * 3.05;
    const overlayX = metrics.originX + metrics.cellSize * 1.0;
    const overlayWidth = metrics.boardSize - metrics.cellSize * 2.0;

    this.ctx.fillStyle = "rgba(16, 11, 8, 0.72)";
    this.roundRect(
      overlayX,
      overlayY,
      overlayWidth,
      overlayHeight,
      metrics.radius * 1.5,
    );
    this.ctx.fill();

    if (isSinkjawAttack) {
      const artSize = metrics.cellSize * 2.45;
      this.ctx.drawImage(
        this.assets.sinkjawFeast,
        metrics.width / 2 - artSize / 2,
        overlayY + metrics.cellSize * 0.18,
        artSize,
        artSize,
      );
    }

    this.ctx.fillStyle = state.status === "won" ? "#8fb96a" : "#d96c42";
    this.ctx.font = `700 ${isSinkjawAttack ? metrics.cellSize * 0.5 : metrics.cellSize * 0.42}px "IBM Plex Mono", monospace`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText(
      state.status === "won"
        ? "AMBER SECURED"
        : isSinkjawAttack
          ? "COLLECTOR CONSUMED"
          : "SINKJAW STRIKE",
      metrics.width / 2,
      isSinkjawAttack ? overlayY + metrics.cellSize * 3.15 : metrics.originY + metrics.cellSize * 4.0,
    );

    this.ctx.fillStyle = "rgba(249, 241, 223, 0.86)";
    this.ctx.font = `${metrics.cellSize * 0.22}px "IBM Plex Mono", monospace`;

    const bodyText =
      state.status === "won"
        ? "Press New Run and lay a fresh line across the Amber Waste."
        : isSinkjawAttack
          ? "Sinkjaw has taken the Collector. Press New Run and send another expedition."
          : "Press New Run to open the field again.";
    const bodyY = isSinkjawAttack ? overlayY + metrics.cellSize * 3.75 : metrics.originY + metrics.cellSize * 4.7;
    const maxTextWidth = overlayWidth - metrics.cellSize * 0.8;
    const lineHeight = metrics.cellSize * 0.34;
    this.drawWrappedCenteredText(bodyText, metrics.width / 2, bodyY, maxTextWidth, lineHeight);
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

  private drawFloatingIcon(
    image: HTMLImageElement,
    position: Position,
    metrics: BoardMetrics,
    scale: number,
    rotation: number,
    pixelOffsetY: number,
  ): void {
    const size = metrics.cellSize * scale;
    const centerX = metrics.originX + (position.x + 0.5) * metrics.cellSize;
    const centerY = metrics.originY + (position.y + 0.5) * metrics.cellSize + pixelOffsetY;

    this.ctx.save();
    this.ctx.translate(centerX, centerY);
    this.ctx.rotate(rotation);
    this.ctx.drawImage(image, -size / 2, -size / 2, size, size);
    this.ctx.restore();
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

  private drawWrappedCenteredText(
    text: string,
    centerX: number,
    startY: number,
    maxWidth: number,
    lineHeight: number,
  ): void {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      if (this.ctx.measureText(candidate).width <= maxWidth) {
        currentLine = candidate;
        continue;
      }

      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    const blockHeight = (lines.length - 1) * lineHeight;
    let y = startY - blockHeight / 2;

    for (const line of lines) {
      this.ctx.fillText(line, centerX, y);
      y += lineHeight;
    }
  }
}

export async function loadAssets(): Promise<Assets> {
  const [collector, sinkjaw, amber, sinkjawFeast, skimmer] = await Promise.all([
    loadImage("./assets/collector.svg"),
    loadImage("./assets/sinkjaw.svg"),
    loadImage("./assets/amber.svg"),
    loadImage("./assets/sinkjaw-feast.svg"),
    loadImage("./assets/skimmer.svg"),
  ]);

  return { collector, sinkjaw, amber, sinkjawFeast, skimmer };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load asset: ${src}`));
    image.src = src;
  });
}
