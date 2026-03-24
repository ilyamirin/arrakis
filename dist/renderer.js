import { BOARD_SIZE, } from "./types.js";
export class CanvasRenderer {
    canvas;
    ctx;
    assets;
    lastState = null;
    lastAnimation = null;
    lastPreviewMove = null;
    constructor(canvas, assets) {
        const context = canvas.getContext("2d");
        if (!context) {
            throw new Error("Canvas 2D context is not available.");
        }
        this.canvas = canvas;
        this.ctx = context;
        this.assets = assets;
    }
    render(state, animation = null, previewMove = null) {
        this.lastState = state;
        this.lastAnimation = animation;
        this.lastPreviewMove = previewMove;
        this.resizeBackingStore();
        const metrics = this.getMetrics();
        const { ctx } = this;
        ctx.clearRect(0, 0, metrics.width, metrics.height);
        this.drawBackground(metrics);
        this.drawCells(state, metrics, animation, previewMove);
        this.drawStormFront(state, metrics);
        this.drawGrid(metrics);
        this.drawPreviewTelegraph(metrics, previewMove, state.status === "playing");
        this.drawPieces(state, metrics, animation);
        this.drawOverlay(state, metrics);
    }
    rerender() {
        if (this.lastState) {
            this.render(this.lastState, this.lastAnimation, this.lastPreviewMove);
        }
    }
    cellFromClientPoint(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const metrics = this.getMetrics();
        const localX = clientX - rect.left;
        const localY = clientY - rect.top;
        if (localX < metrics.originX ||
            localY < metrics.originY ||
            localX > metrics.originX + metrics.boardSize ||
            localY > metrics.originY + metrics.boardSize) {
            return null;
        }
        const x = Math.floor((localX - metrics.originX) / metrics.cellSize);
        const y = Math.floor((localY - metrics.originY) / metrics.cellSize);
        if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) {
            return null;
        }
        return { x, y };
    }
    resizeBackingStore() {
        const rect = this.canvas.getBoundingClientRect();
        const width = Math.max(1, Math.round(rect.width));
        const height = Math.max(1, Math.round(rect.height));
        const ratio = window.devicePixelRatio || 1;
        if (this.canvas.width === Math.round(width * ratio) &&
            this.canvas.height === Math.round(height * ratio)) {
            this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
            return;
        }
        this.canvas.width = Math.round(width * ratio);
        this.canvas.height = Math.round(height * ratio);
        this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    drawBackground(metrics) {
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
    drawCells(state, metrics, animation, previewMove) {
        for (let y = 0; y < BOARD_SIZE; y += 1) {
            for (let x = 0; x < BOARD_SIZE; x += 1) {
                const px = metrics.originX + x * metrics.cellSize;
                const py = metrics.originY + y * metrics.cellSize;
                const moveOption = state.validMoves.find((move) => move.target.x === x && move.target.y === y) ?? null;
                const isValidMove = moveOption !== null;
                const isActiveTarget = animation?.activeTarget.x === x && animation.activeTarget.y === y;
                const isCollector = state.collector.x === x && state.collector.y === y;
                const isSinkjaw = state.sinkjaw?.x === x && state.sinkjaw?.y === y;
                const cell = state.board[y][x];
                const isPreviewTarget = Boolean(previewMove && previewMove.target.x === x && previewMove.target.y === y);
                const baseTone = (x + y) % 2 === 0 ? 0.16 : 0.11;
                this.ctx.fillStyle = `rgba(248, 227, 184, ${baseTone})`;
                this.roundRect(px, py, metrics.cellSize - 2, metrics.cellSize - 2, metrics.radius);
                this.ctx.fill();
                if (cell.hasStorm) {
                    this.ctx.fillStyle = "rgba(138, 126, 96, 0.08)";
                    this.roundRect(px + metrics.cellSize * 0.08, py + metrics.cellSize * 0.08, metrics.cellSize * 0.84, metrics.cellSize * 0.84, metrics.radius * 0.85);
                    this.ctx.fill();
                }
                if (cell.hasAmber) {
                    this.ctx.fillStyle = "rgba(236, 188, 89, 0.26)";
                    this.roundRect(px + metrics.cellSize * 0.08, py + metrics.cellSize * 0.08, metrics.cellSize * 0.84, metrics.cellSize * 0.84, metrics.radius * 0.8);
                    this.ctx.fill();
                    this.drawIcon(this.assets.amber, px, py, metrics.cellSize, 0.52);
                }
                if (isValidMove && state.status === "playing") {
                    this.ctx.strokeStyle = "rgba(247, 228, 186, 0.86)";
                    this.ctx.lineWidth = Math.max(2, metrics.cellSize * 0.04);
                    this.roundRect(px + metrics.cellSize * 0.1, py + metrics.cellSize * 0.1, metrics.cellSize * 0.8, metrics.cellSize * 0.8, metrics.radius * 0.8);
                    this.ctx.stroke();
                }
                if (isActiveTarget && state.status === "playing") {
                    this.ctx.fillStyle = "rgba(247, 228, 186, 0.16)";
                    this.roundRect(px + metrics.cellSize * 0.16, py + metrics.cellSize * 0.16, metrics.cellSize * 0.68, metrics.cellSize * 0.68, metrics.radius * 0.8);
                    this.ctx.fill();
                    this.ctx.strokeStyle = "rgba(255, 244, 216, 0.96)";
                    this.ctx.lineWidth = Math.max(2, metrics.cellSize * 0.05);
                    this.roundRect(px + metrics.cellSize * 0.14, py + metrics.cellSize * 0.14, metrics.cellSize * 0.72, metrics.cellSize * 0.72, metrics.radius * 0.8);
                    this.ctx.stroke();
                }
                if (isPreviewTarget && state.status === "playing") {
                    this.ctx.strokeStyle = previewMove?.isStormLanding
                        ? "rgba(151, 197, 207, 0.96)"
                        : "rgba(255, 214, 153, 0.96)";
                    this.ctx.lineWidth = Math.max(2, metrics.cellSize * 0.05);
                    this.roundRect(px + metrics.cellSize * 0.06, py + metrics.cellSize * 0.06, metrics.cellSize * 0.88, metrics.cellSize * 0.88, metrics.radius * 0.9);
                    this.ctx.stroke();
                }
                if (isCollector) {
                    this.ctx.fillStyle = "rgba(247, 228, 186, 0.08)";
                    this.roundRect(px + metrics.cellSize * 0.05, py + metrics.cellSize * 0.05, metrics.cellSize * 0.9, metrics.cellSize * 0.9, metrics.radius);
                    this.ctx.fill();
                }
                if (isSinkjaw) {
                    if (cell.hasAmber) {
                        this.ctx.fillStyle = "rgba(241, 193, 107, 0.30)";
                        this.roundRect(px + metrics.cellSize * 0.12, py + metrics.cellSize * 0.12, metrics.cellSize * 0.76, metrics.cellSize * 0.76, metrics.radius * 0.9);
                        this.ctx.fill();
                        this.ctx.strokeStyle = "rgba(247, 228, 186, 0.46)";
                        this.ctx.lineWidth = Math.max(2, metrics.cellSize * 0.03);
                        this.roundRect(px + metrics.cellSize * 0.14, py + metrics.cellSize * 0.14, metrics.cellSize * 0.72, metrics.cellSize * 0.72, metrics.radius * 0.8);
                        this.ctx.stroke();
                    }
                    this.ctx.fillStyle = "rgba(217, 108, 66, 0.18)";
                    this.roundRect(px + metrics.cellSize * 0.05, py + metrics.cellSize * 0.05, metrics.cellSize * 0.9, metrics.cellSize * 0.9, metrics.radius);
                    this.ctx.fill();
                }
            }
        }
    }
    drawPreviewTelegraph(metrics, previewMove, isPlaying) {
        if (!previewMove || !isPlaying) {
            return;
        }
        const centerX = metrics.originX + (previewMove.target.x + 0.5) * metrics.cellSize;
        const centerY = metrics.originY + (previewMove.target.y + 0.5) * metrics.cellSize;
        if (previewMove.telegraphSector === "obscured") {
            this.drawPreviewCaption(metrics, "TREMOR READ", "READ LOST");
            return;
        }
        if (previewMove.telegraphSector === "encircling") {
            this.drawEncirclingSignal(centerX, centerY, metrics.cellSize);
            this.drawPreviewCaption(metrics, "TREMOR READ", "NO SAFE SIDE");
            return;
        }
        this.drawDirectionalSignal(centerX, centerY, metrics.cellSize, this.sectorVector(previewMove.telegraphSector));
        this.drawPreviewCaption(metrics, "TREMOR READ", this.sectorCaption(previewMove.telegraphSector));
    }
    drawPreviewCaption(metrics, kicker, message) {
        const { ctx } = this;
        const paddingX = metrics.cellSize * 0.22;
        const paddingY = metrics.cellSize * 0.16;
        const boxX = metrics.originX + metrics.cellSize * 0.2;
        const boxY = metrics.originY + metrics.boardSize - metrics.cellSize * 0.98;
        const kickerSize = Math.max(10, metrics.cellSize * 0.16);
        const messageSize = Math.max(14, metrics.cellSize * 0.23);
        ctx.save();
        ctx.font = `${kickerSize}px "IBM Plex Mono", "SFMono-Regular", ui-monospace, monospace`;
        const kickerWidth = ctx.measureText(kicker).width;
        ctx.font = `700 ${messageSize}px "IBM Plex Mono", "SFMono-Regular", ui-monospace, monospace`;
        const messageWidth = ctx.measureText(message).width;
        const boxWidth = Math.max(kickerWidth, messageWidth) + paddingX * 2;
        const boxHeight = paddingY * 2 + kickerSize + messageSize + metrics.cellSize * 0.08;
        ctx.fillStyle = "rgba(23, 16, 12, 0.8)";
        this.roundRect(boxX, boxY, boxWidth, boxHeight, metrics.radius * 0.9);
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 214, 153, 0.22)";
        ctx.lineWidth = 1.5;
        this.roundRect(boxX, boxY, boxWidth, boxHeight, metrics.radius * 0.9);
        ctx.stroke();
        ctx.fillStyle = "rgba(247, 228, 186, 0.58)";
        ctx.font = `${kickerSize}px "IBM Plex Mono", "SFMono-Regular", ui-monospace, monospace`;
        ctx.textBaseline = "top";
        ctx.fillText(kicker, boxX + paddingX, boxY + paddingY);
        ctx.fillStyle = "rgba(255, 226, 181, 0.98)";
        ctx.font = `700 ${messageSize}px "IBM Plex Mono", "SFMono-Regular", ui-monospace, monospace`;
        ctx.fillText(message, boxX + paddingX, boxY + paddingY + kickerSize + metrics.cellSize * 0.05);
        ctx.restore();
    }
    drawStormFront(state, metrics) {
        const stormCells = this.collectStormCells(state);
        if (stormCells.length === 0) {
            return;
        }
        const { ctx } = this;
        ctx.save();
        for (const cell of stormCells) {
            const center = this.cellCenter(cell, metrics);
            ctx.fillStyle = "rgba(122, 110, 84, 0.12)";
            ctx.beginPath();
            ctx.ellipse(center.x, center.y, metrics.cellSize * 0.56, metrics.cellSize * 0.44, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "rgba(214, 168, 97, 0.08)";
            ctx.beginPath();
            ctx.ellipse(center.x + metrics.cellSize * 0.05, center.y - metrics.cellSize * 0.04, metrics.cellSize * 0.42, metrics.cellSize * 0.3, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        const seenPairs = new Set();
        for (const cell of stormCells) {
            for (const neighbor of stormCells) {
                if (cell.x === neighbor.x && cell.y === neighbor.y) {
                    continue;
                }
                if (Math.abs(cell.x - neighbor.x) + Math.abs(cell.y - neighbor.y) !== 1) {
                    continue;
                }
                const pairKey = [cell, neighbor]
                    .map((position) => `${position.x},${position.y}`)
                    .sort()
                    .join("|");
                if (seenPairs.has(pairKey)) {
                    continue;
                }
                seenPairs.add(pairKey);
                const start = this.cellCenter(cell, metrics);
                const end = this.cellCenter(neighbor, metrics);
                ctx.strokeStyle = "rgba(171, 146, 102, 0.18)";
                ctx.lineWidth = metrics.cellSize * 0.68;
                ctx.lineCap = "round";
                ctx.shadowColor = "rgba(187, 145, 82, 0.12)";
                ctx.shadowBlur = metrics.cellSize * 0.18;
                ctx.beginPath();
                ctx.moveTo(start.x, start.y);
                ctx.lineTo(end.x, end.y);
                ctx.stroke();
                ctx.strokeStyle = "rgba(233, 204, 150, 0.08)";
                ctx.lineWidth = metrics.cellSize * 0.38;
                ctx.beginPath();
                ctx.moveTo(start.x, start.y);
                ctx.lineTo(end.x, end.y);
                ctx.stroke();
            }
        }
        for (const cell of stormCells) {
            const cellX = metrics.originX + cell.x * metrics.cellSize;
            const cellY = metrics.originY + cell.y * metrics.cellSize;
            this.drawStormGlyph(cellX, cellY, metrics.cellSize);
        }
        ctx.restore();
    }
    drawStormGlyph(cellX, cellY, cellSize) {
        const { ctx } = this;
        const centerX = cellX + cellSize / 2;
        const centerY = cellY + cellSize / 2;
        ctx.save();
        ctx.fillStyle = "rgba(238, 212, 164, 0.08)";
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, cellSize * 0.34, cellSize * 0.24, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(226, 204, 158, 0.44)";
        ctx.lineWidth = Math.max(1.5, cellSize * 0.024);
        ctx.lineCap = "round";
        ctx.shadowColor = "rgba(221, 171, 104, 0.18)";
        ctx.shadowBlur = cellSize * 0.1;
        for (let ring = 0; ring < 2; ring += 1) {
            const radiusX = cellSize * (0.34 - ring * 0.08);
            const radiusY = cellSize * (0.26 - ring * 0.06);
            ctx.beginPath();
            ctx.ellipse(centerX + ring * cellSize * 0.03, centerY - ring * cellSize * 0.02, radiusX, radiusY, -0.35, Math.PI * 0.18, Math.PI * 1.6);
            ctx.stroke();
        }
        ctx.strokeStyle = "rgba(245, 225, 188, 0.24)";
        ctx.lineWidth = Math.max(1, cellSize * 0.016);
        ctx.shadowBlur = 0;
        for (let row = 0; row < 3; row += 1) {
            const startX = cellX + cellSize * 0.16;
            const startY = cellY + cellSize * (0.33 + row * 0.13);
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.bezierCurveTo(startX + cellSize * 0.1, startY - cellSize * 0.07, startX + cellSize * 0.22, startY + cellSize * 0.07, startX + cellSize * 0.34, startY);
            ctx.bezierCurveTo(startX + cellSize * 0.46, startY - cellSize * 0.06, startX + cellSize * 0.58, startY + cellSize * 0.06, startX + cellSize * 0.68, startY);
            ctx.stroke();
        }
        ctx.fillStyle = "rgba(246, 231, 203, 0.18)";
        for (const offset of [
            { x: -0.2, y: -0.16, size: 0.038 },
            { x: 0.18, y: -0.04, size: 0.03 },
            { x: 0.06, y: 0.18, size: 0.026 },
        ]) {
            ctx.beginPath();
            ctx.arc(centerX + cellSize * offset.x, centerY + cellSize * offset.y, cellSize * offset.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
    collectStormCells(state) {
        const cells = [];
        for (let y = 0; y < BOARD_SIZE; y += 1) {
            for (let x = 0; x < BOARD_SIZE; x += 1) {
                if (state.board[y][x].hasStorm) {
                    cells.push({ x, y });
                }
            }
        }
        return cells;
    }
    cellCenter(position, metrics) {
        return {
            x: metrics.originX + (position.x + 0.5) * metrics.cellSize,
            y: metrics.originY + (position.y + 0.5) * metrics.cellSize,
        };
    }
    drawDirectionalSignal(centerX, centerY, cellSize, vector) {
        const { ctx } = this;
        const shaftLength = cellSize * 1.3;
        const tailLength = cellSize * 0.24;
        const tipX = centerX + vector.x * shaftLength;
        const tipY = centerY + vector.y * shaftLength;
        const tailX = centerX - vector.x * tailLength;
        const tailY = centerY - vector.y * tailLength;
        const perpX = -vector.y;
        const perpY = vector.x;
        ctx.save();
        ctx.strokeStyle = "rgba(229, 138, 76, 0.9)";
        ctx.fillStyle = "rgba(255, 198, 128, 0.92)";
        ctx.lineWidth = Math.max(4, cellSize * 0.08);
        ctx.lineCap = "round";
        ctx.shadowColor = "rgba(229, 138, 76, 0.3)";
        ctx.shadowBlur = cellSize * 0.18;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(tipX - vector.x * cellSize * 0.42 + perpX * cellSize * 0.18, tipY - vector.y * cellSize * 0.42 + perpY * cellSize * 0.18);
        ctx.lineTo(tipX - vector.x * cellSize * 0.42 - perpX * cellSize * 0.18, tipY - vector.y * cellSize * 0.42 - perpY * cellSize * 0.18);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "rgba(255, 235, 202, 0.25)";
        ctx.beginPath();
        ctx.arc(centerX, centerY, cellSize * 0.26, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    drawEncirclingSignal(centerX, centerY, cellSize) {
        const { ctx } = this;
        ctx.save();
        ctx.strokeStyle = "rgba(255, 214, 153, 0.94)";
        ctx.lineWidth = Math.max(4, cellSize * 0.06);
        ctx.shadowColor = "rgba(255, 196, 120, 0.28)";
        ctx.shadowBlur = cellSize * 0.16;
        ctx.beginPath();
        ctx.arc(centerX, centerY, cellSize * 0.82, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = "rgba(255, 214, 153, 0.56)";
        ctx.lineWidth = Math.max(2, cellSize * 0.03);
        ctx.beginPath();
        ctx.arc(centerX, centerY, cellSize * 1.02, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
    sectorCaption(sector) {
        switch (sector) {
            case "north":
                return "THREAT NORTH";
            case "northeast":
                return "THREAT NE";
            case "east":
                return "THREAT EAST";
            case "southeast":
                return "THREAT SE";
            case "south":
                return "THREAT SOUTH";
            case "southwest":
                return "THREAT SW";
            case "west":
                return "THREAT WEST";
            case "northwest":
                return "THREAT NW";
            default:
                return "NO SAFE SIDE";
        }
    }
    sectorVector(sector) {
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
    drawGrid(metrics) {
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
    drawPieces(state, metrics, animation) {
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
            this.drawFloatingIcon(this.assets.collector, animation.landedCollector, metrics, 0.8, 0, 0);
        }
        if (animation?.carriedCollector && !sinkjawConsumedCollector) {
            this.drawFloatingIcon(this.assets.collector, animation.carriedCollector, metrics, 0.62, animation.heading, metrics.cellSize * 0.1);
        }
        if (animation) {
            this.drawFloatingIcon(this.assets.skimmer, animation.carrier, metrics, 1.12, animation.heading, 0);
        }
    }
    drawOverlay(state, metrics) {
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
        this.roundRect(overlayX, overlayY, overlayWidth, overlayHeight, metrics.radius * 1.5);
        this.ctx.fill();
        if (isSinkjawAttack) {
            const artSize = metrics.cellSize * 2.45;
            this.ctx.drawImage(this.assets.sinkjawFeast, metrics.width / 2 - artSize / 2, overlayY + metrics.cellSize * 0.18, artSize, artSize);
        }
        this.ctx.fillStyle = state.status === "won" ? "#8fb96a" : "#d96c42";
        this.ctx.font = `700 ${isSinkjawAttack ? metrics.cellSize * 0.5 : metrics.cellSize * 0.42}px "IBM Plex Mono", monospace`;
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText(state.status === "won"
            ? "AMBER SECURED"
            : isSinkjawAttack
                ? "COLLECTOR CONSUMED"
                : "SINKJAW STRIKE", metrics.width / 2, isSinkjawAttack ? overlayY + metrics.cellSize * 3.15 : metrics.originY + metrics.cellSize * 4.0);
        this.ctx.fillStyle = "rgba(249, 241, 223, 0.86)";
        this.ctx.font = `${metrics.cellSize * 0.22}px "IBM Plex Mono", monospace`;
        const bodyText = state.status === "won"
            ? "Press New Run and lay a fresh line across the Amber Waste."
            : isSinkjawAttack
                ? "Sinkjaw has taken the Collector. Press New Run and send another expedition."
                : "Press New Run to open the field again.";
        const bodyY = isSinkjawAttack ? overlayY + metrics.cellSize * 3.75 : metrics.originY + metrics.cellSize * 4.7;
        const maxTextWidth = overlayWidth - metrics.cellSize * 0.8;
        const lineHeight = metrics.cellSize * 0.34;
        this.drawWrappedCenteredText(bodyText, metrics.width / 2, bodyY, maxTextWidth, lineHeight);
    }
    drawIcon(image, cellX, cellY, cellSize, scale) {
        const size = cellSize * scale;
        const offset = (cellSize - size) / 2;
        this.ctx.drawImage(image, cellX + offset, cellY + offset, size, size);
    }
    drawFloatingIcon(image, position, metrics, scale, rotation, pixelOffsetY) {
        const size = metrics.cellSize * scale;
        const centerX = metrics.originX + (position.x + 0.5) * metrics.cellSize;
        const centerY = metrics.originY + (position.y + 0.5) * metrics.cellSize + pixelOffsetY;
        this.ctx.save();
        this.ctx.translate(centerX, centerY);
        this.ctx.rotate(rotation);
        this.ctx.drawImage(image, -size / 2, -size / 2, size, size);
        this.ctx.restore();
    }
    getMetrics() {
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
    roundRect(x, y, width, height, radius) {
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, width, height, radius);
    }
    drawWrappedCenteredText(text, centerX, startY, maxWidth, lineHeight) {
        const words = text.split(" ");
        const lines = [];
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
export async function loadAssets() {
    const [collector, sinkjaw, amber, sinkjawFeast, skimmer] = await Promise.all([
        loadImage("./assets/collector.svg"),
        loadImage("./assets/sinkjaw.svg"),
        loadImage("./assets/amber.svg"),
        loadImage("./assets/sinkjaw-feast.svg"),
        loadImage("./assets/skimmer.svg"),
    ]);
    return { collector, sinkjaw, amber, sinkjawFeast, skimmer };
}
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`Failed to load asset: ${src}`));
        image.src = src;
    });
}
