import { CanvasRenderer } from "../dist/renderer.js";

function createBoard() {
  return Array.from({ length: 8 }, () =>
    Array.from({ length: 8 }, () => ({ hasAmber: false, hasStorm: false })),
  );
}

function markCells(board, cells, key) {
  for (const [x, y] of cells) {
    board[y][x][key] = true;
  }
}

function moveOption(target, telegraphSector, options = {}) {
  return {
    target,
    delta: options.delta ?? { x: 0, y: 0 },
    label: options.label ?? "",
    notation: options.notation ?? "",
    telegraphSector,
    telegraphCandidates: options.telegraphCandidates ?? [],
    pilotLine: options.pilotLine ?? "",
    isStormLanding: options.isStormLanding ?? false,
  };
}

function animationFrame(activeTarget, carrier, heading, carriedCollector = null, landedCollector = null) {
  return { activeTarget, carrier, heading, carriedCollector, landedCollector };
}

async function loadImage(url) {
  const image = new Image();
  image.decoding = "async";
  image.src = new URL(url, import.meta.url).href;
  await image.decode();
  return image;
}

async function loadAssets() {
  const [collector, sinkjaw, amber, sinkjawFeast, skimmer] = await Promise.all([
    loadImage("../assets/collector.svg"),
    loadImage("../assets/sinkjaw.svg"),
    loadImage("../assets/amber.svg"),
    loadImage("../assets/sinkjaw-feast.svg"),
    loadImage("../assets/skimmer.svg"),
  ]);

  return { collector, sinkjaw, amber, sinkjawFeast, skimmer };
}

function boardLabel(x, y) {
  return `${String.fromCharCode(65 + x)}${8 - y}`;
}

function buildScenes() {
  const opening = createBoard();
  markCells(opening, [
    [1, 1], [3, 1], [5, 1], [6, 2], [2, 3], [5, 3], [6, 5], [2, 6], [4, 6], [7, 6],
    [0, 4], [1, 5], [3, 5], [5, 5], [6, 6], [1, 7], [3, 7], [5, 7], [7, 4], [7, 2],
  ], "hasAmber");
  markCells(opening, [[0, 6], [1, 6], [1, 7]], "hasStorm");

  const threat = createBoard();
  markCells(threat, [
    [0, 0], [2, 0], [4, 1], [6, 0], [1, 2], [2, 2], [4, 2], [7, 2], [0, 4], [3, 4],
    [5, 4], [6, 4], [1, 5], [3, 6], [6, 6], [0, 7], [2, 7], [4, 7], [5, 7], [7, 7],
  ], "hasAmber");
  markCells(threat, [[5, 0], [6, 0], [6, 1]], "hasStorm");

  const stormApproach = createBoard();
  markCells(stormApproach, [
    [0, 1], [2, 1], [4, 1], [7, 1], [1, 2], [5, 2], [7, 3], [0, 4], [2, 4], [4, 4],
    [6, 4], [1, 5], [5, 5], [7, 5], [0, 6], [2, 6], [4, 6], [6, 6], [1, 7], [5, 7],
  ], "hasAmber");
  markCells(stormApproach, [[2, 2], [2, 3], [3, 3]], "hasStorm");

  const stormDrift = createBoard();
  markCells(stormDrift, [
    [0, 0], [3, 0], [6, 0], [1, 1], [5, 1], [7, 1], [0, 3], [2, 3], [5, 3], [6, 3],
    [1, 4], [4, 4], [7, 4], [0, 6], [3, 6], [5, 6], [1, 7], [4, 7], [6, 7], [7, 6],
  ], "hasAmber");
  markCells(stormDrift, [[4, 2], [5, 2], [5, 3]], "hasStorm");

  const consumed = createBoard();
  markCells(consumed, [
    [1, 0], [3, 0], [5, 0], [7, 0], [0, 2], [2, 2], [6, 2], [1, 4], [3, 4], [5, 4],
    [7, 4], [0, 5], [2, 6], [4, 6], [6, 6], [1, 7], [3, 7], [5, 7], [7, 7], [6, 1],
  ], "hasAmber");
  markCells(consumed, [[0, 1], [1, 1], [1, 2]], "hasStorm");

  return {
    opening_run: {
      title: "Opening Run",
      subtitle: "The first drop into the Amber Waste with every legal landing square still open.",
      badge: "Scene 01",
      footer: "A clean opening frame: no Sinkjaw on the field yet, but the first tremor read is already steering the run east.",
      status: "Pilot: Put down at G2. Sinkjaw favors the east reach.",
      stats: [
        ["Mode", "Fullscreen Mobile"],
        ["Focus", "First Tremor Read"],
        ["Threat", "Low but rising"],
      ],
      state: {
        board: opening,
        collector: { x: 4, y: 4 },
        sinkjaw: null,
        validMoves: [
          moveOption({ x: 6, y: 5 }, "east", { pilotLine: "Pilot: Put down at G3. Sinkjaw favors the east reach." }),
          moveOption({ x: 5, y: 6 }, "east"),
          moveOption({ x: 3, y: 6 }, "encircling"),
          moveOption({ x: 2, y: 5 }, "west"),
          moveOption({ x: 2, y: 3 }, "west"),
          moveOption({ x: 3, y: 2 }, "northwest"),
          moveOption({ x: 5, y: 2 }, "north"),
          moveOption({ x: 6, y: 3 }, "northeast"),
        ],
        totalAmber: 20,
        collectedAmber: 0,
        moves: 0,
        status: "playing",
        message: "Choose one of the lit squares to begin your run across the Amber Waste.",
        lossReason: null,
      },
      previewMove: moveOption(
        { x: 6, y: 5 },
        "east",
        { pilotLine: "Pilot: Put down at G3. Sinkjaw favors the east reach." },
      ),
      amberValue: "0 / 20",
      movesValue: "0",
      positionValue: boardLabel(4, 4),
    },
    threat_east: {
      title: "Threat East",
      subtitle: "Sinkjaw has broken surface and the next move is already compressing the field.",
      badge: "Scene 02",
      footer: "The player gets a readable directional warning, but the field is still rich enough to tempt a risky route.",
      status: "Pilot: Put down at E5. Sinkjaw favors the east reach.",
      stats: [
        ["Mode", "Fullscreen Mobile"],
        ["Focus", "Readable threat"],
        ["Threat", "Escalating"],
      ],
      state: {
        board: threat,
        collector: { x: 2, y: 5 },
        sinkjaw: { x: 5, y: 5 },
        validMoves: [
          moveOption({ x: 4, y: 6 }, "east"),
          moveOption({ x: 4, y: 4 }, "east"),
          moveOption({ x: 3, y: 3 }, "northeast"),
          moveOption({ x: 1, y: 3 }, "northwest"),
          moveOption({ x: 0, y: 4 }, "west"),
          moveOption({ x: 0, y: 6 }, "west"),
          moveOption({ x: 1, y: 7 }, "southwest"),
          moveOption({ x: 3, y: 7 }, "south"),
        ],
        totalAmber: 20,
        collectedAmber: 6,
        moves: 7,
        status: "playing",
        message: "Sinkjaw sighted in sector F3.",
        lossReason: null,
      },
      previewMove: moveOption({ x: 4, y: 4 }, "east"),
      amberValue: "6 / 20",
      movesValue: "7",
      positionValue: boardLabel(2, 5),
    },
    storm_front: {
      title: "Storm Front",
      subtitle: "The skimmer cuts through a moving squall while the forecast goes blind.",
      badge: "Scene 03",
      footer: "The dramatic frame: storm cells obscure the tremor read, but the amber haul is too valuable to ignore.",
      status: "The Skimmer cuts into the squall at sector C6.",
      stats: [
        ["Mode", "Fullscreen Mobile"],
        ["Focus", "Storm approach"],
        ["Threat", "Blind landing"],
      ],
      state: {
        board: stormApproach,
        collector: { x: 4, y: 4 },
        sinkjaw: { x: 6, y: 2 },
        validMoves: [
          moveOption({ x: 2, y: 3 }, "obscured", { isStormLanding: true }),
          moveOption({ x: 3, y: 2 }, "northwest"),
          moveOption({ x: 5, y: 2 }, "north"),
          moveOption({ x: 6, y: 3 }, "east"),
          moveOption({ x: 6, y: 5 }, "east"),
          moveOption({ x: 5, y: 6 }, "south"),
          moveOption({ x: 3, y: 6 }, "southwest"),
          moveOption({ x: 2, y: 5 }, "west"),
        ],
        totalAmber: 20,
        collectedAmber: 11,
        moves: 12,
        status: "playing",
        message: "Sinkjaw sighted in sector G6.",
        lossReason: null,
      },
      previewMove: moveOption({ x: 2, y: 3 }, "obscured", { isStormLanding: true }),
      animation: animationFrame(
        { x: 2, y: 3 },
        { x: 3.15, y: 3.55 },
        -2.32,
        { x: 3.15, y: 3.67 },
        null,
      ),
      amberValue: "11 / 20",
      movesValue: "12",
      positionValue: `${boardLabel(4, 4)} -> ${boardLabel(2, 3)}`,
    },
    storm_drift: {
      title: "Blind Drift",
      subtitle: "Wind shear drags the skimmer across the board while Sinkjaw closes the distance.",
      badge: "Scene 04",
      footer: "The storm does not just block information. It physically rewrites the route and breaks the player’s spacing.",
      status: "Wind shear catches the Skimmer and drags it toward sector G5.",
      stats: [
        ["Mode", "Fullscreen Mobile"],
        ["Focus", "Forced drift"],
        ["Threat", "Severe"],
      ],
      state: {
        board: stormDrift,
        collector: { x: 4, y: 2 },
        sinkjaw: { x: 6, y: 4 },
        validMoves: [
          moveOption({ x: 6, y: 3 }, "southeast"),
          moveOption({ x: 6, y: 1 }, "east"),
          moveOption({ x: 5, y: 0 }, "northeast"),
          moveOption({ x: 3, y: 0 }, "north"),
          moveOption({ x: 2, y: 1 }, "northwest"),
          moveOption({ x: 2, y: 3 }, "west"),
          moveOption({ x: 3, y: 4 }, "southwest"),
          moveOption({ x: 5, y: 4 }, "south"),
        ],
        totalAmber: 20,
        collectedAmber: 15,
        moves: 16,
        status: "playing",
        message: "Storm shear flung the Collector clear to sector G5.",
        lossReason: null,
      },
      previewMove: null,
      animation: animationFrame(
        { x: 6, y: 3 },
        { x: 5.28, y: 3.42 },
        0.78,
        { x: 5.28, y: 3.54 },
        null,
      ),
      amberValue: "15 / 20",
      movesValue: "16",
      positionValue: `${boardLabel(4, 2)} -> ${boardLabel(6, 3)}`,
    },
    consumed: {
      title: "Collector Consumed",
      subtitle: "One bad line and Sinkjaw tears straight through the run.",
      badge: "Scene 05",
      footer: "The loss screen is part of the pitch: giant maw, full-screen interruption, instant recognition of failure.",
      status: "Sinkjaw broke surface beneath the Collector. The expedition is done.",
      stats: [
        ["Mode", "Fullscreen Mobile"],
        ["Focus", "Failure state"],
        ["Threat", "Terminal"],
      ],
      state: {
        board: consumed,
        collector: { x: 4, y: 3 },
        sinkjaw: { x: 4, y: 3 },
        validMoves: [],
        totalAmber: 20,
        collectedAmber: 17,
        moves: 19,
        status: "lost",
        message: "Sinkjaw broke surface beneath the Collector. The expedition is done.",
        lossReason: "sinkjaw_attack",
      },
      previewMove: null,
      amberValue: "17 / 20",
      movesValue: "19",
      positionValue: boardLabel(4, 3),
    },
  };
}

function applySceneText(scene) {
  document.getElementById("scene-title").textContent = scene.title;
  document.getElementById("scene-subtitle").textContent = scene.subtitle;
  document.getElementById("scene-badge").textContent = scene.badge;
  document.getElementById("scene-footer").textContent = scene.footer;
  document.getElementById("status-value").textContent = scene.status;
  document.getElementById("amber-value").textContent = scene.amberValue;
  document.getElementById("moves-value").textContent = scene.movesValue;
  document.getElementById("position-value").textContent = scene.positionValue;

  const statsRoot = document.getElementById("scene-stats");
  statsRoot.replaceChildren(
    ...scene.stats.map(([label, value]) => {
      const stat = document.createElement("div");
      stat.className = "stat";
      stat.innerHTML = `<div class="stat-label">${label}</div><div class="stat-value">${value}</div>`;
      return stat;
    }),
  );
}

async function main() {
  const params = new URLSearchParams(window.location.search);
  const sceneName = params.get("scene") ?? "opening_run";
  const isClean = params.get("layout") === "clean";
  const isPortrait = params.get("orientation") === "portrait";
  const scenes = buildScenes();
  const scene = scenes[sceneName] ?? scenes.opening_run;
  const canvas = document.getElementById("scene-canvas");
  const renderer = new CanvasRenderer(canvas, await loadAssets());

  if (isPortrait) {
    document.body.classList.add("portrait");
  }

  if (isClean) {
    document.body.classList.add("clean");
  } else {
    applySceneText(scene);
  }

  renderer.render(scene.state, scene.animation ?? null, scene.previewMove ?? null);

  document.body.dataset.ready = "true";
}

main().catch((error) => {
  document.body.dataset.ready = "error";
  document.body.innerHTML = `<pre style="padding:40px;color:#fff;background:#000">${String(error?.stack ?? error)}</pre>`;
});
