import { AmberDunesGame } from "../dist/game.js";
import { BOARD_SIZE } from "../dist/types.js";

const GAMES = 4000;
const TARGET_WIN_RATE = 50;
const WIN_RATE_TOLERANCE = 2.5;
const MIN_AVG_WIN_MOVES = 25;
const MAX_AVG_WIN_MOVES = 30;
const REQUIRED_TOTAL_AMBER = 20;
const SEED_BASE = 930001;
const SEED_STEP = 7919;
const ROUTE_BEAM_WIDTH = 48;

const KNIGHT_OFFSETS = [
  [-2, -1],
  [-2, 1],
  [-1, -2],
  [-1, 2],
  [1, -2],
  [1, 2],
  [2, -1],
  [2, 1],
];

const CENTER = (BOARD_SIZE - 1) / 2;
const knightDistances = buildKnightDistances();
const routeCache = new Map();

function createRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function isInside(x, y) {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

function positionIndex(position) {
  return position.y * BOARD_SIZE + position.x;
}

function buildKnightDistances() {
  const cellCount = BOARD_SIZE * BOARD_SIZE;
  const distances = Array.from({ length: cellCount }, () => Array(cellCount).fill(9));

  for (let start = 0; start < cellCount; start += 1) {
    const startPosition = { x: start % BOARD_SIZE, y: Math.floor(start / BOARD_SIZE) };
    let frontier = [startPosition];
    const seen = new Set([start]);
    distances[start][start] = 0;

    for (let depth = 1; depth <= 6; depth += 1) {
      const nextFrontier = [];

      for (const position of frontier) {
        for (const [dx, dy] of KNIGHT_OFFSETS) {
          const x = position.x + dx;
          const y = position.y + dy;
          const key = y * BOARD_SIZE + x;

          if (!isInside(x, y) || seen.has(key)) {
            continue;
          }

          seen.add(key);
          distances[start][key] = depth;
          nextFrontier.push({ x, y });
        }
      }

      frontier = nextFrontier;
    }
  }

  return distances;
}

function countLegalMovesFrom(position, blockedCell) {
  let count = 0;

  for (const [dx, dy] of KNIGHT_OFFSETS) {
    const x = position.x + dx;
    const y = position.y + dy;

    if (isInside(x, y) && (!blockedCell || blockedCell.x !== x || blockedCell.y !== y)) {
      count += 1;
    }
  }

  return count;
}

function amberIndexes(state) {
  const cells = [];

  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      if (state.board[y][x].hasAmber) {
        cells.push(y * BOARD_SIZE + x);
      }
    }
  }

  return cells;
}

function estimateRouteCost(start, targets) {
  const sortedTargets = [...targets].sort((left, right) => left - right);
  const cacheKey = `${start}:${sortedTargets.join(",")}`;

  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey);
  }
  if (sortedTargets.length === 0) {
    return 0;
  }

  let states = [{ position: start, remaining: sortedTargets, cost: 0 }];

  for (let step = 0; step < sortedTargets.length; step += 1) {
    const nextStates = [];

    for (const state of states) {
      for (let index = 0; index < state.remaining.length; index += 1) {
        const target = state.remaining[index];
        const distance = knightDistances[state.position][target];

        if (distance >= 9) {
          continue;
        }

        nextStates.push({
          position: target,
          remaining: state.remaining
            .slice(0, index)
            .concat(state.remaining.slice(index + 1)),
          cost: state.cost + distance,
        });
      }
    }

    nextStates.sort((left, right) => left.cost - right.cost);
    states = nextStates.slice(0, ROUTE_BEAM_WIDTH);
  }

  const bestCost = states.length > 0 ? states[0].cost : 999;
  routeCache.set(cacheKey, bestCost);
  return bestCost;
}

function chooseHeuristicMove(state) {
  const amber = amberIndexes(state);
  let bestScore = Number.NEGATIVE_INFINITY;
  let bestMoves = [];

  for (const move of state.validMoves) {
    const cell = state.board[move.target.y][move.target.x];
    const moveIndex = positionIndex(move.target);
    const remainingAmber = cell.hasAmber
      ? amber.filter((amberIndex) => amberIndex !== moveIndex)
      : amber;
    const routeCost = estimateRouteCost(moveIndex, remainingAmber);

    let score = -routeCost * 20;
    if (cell.hasAmber && !cell.hasStorm) score += 30;
    if (cell.hasStorm) score -= 35;
    score += countLegalMovesFrom(move.target, state.sinkjaw) * 3;
    score -= Math.abs(CENTER - move.target.x) + Math.abs(CENTER - move.target.y);

    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
  }

  return bestMoves[Math.floor(Math.random() * bestMoves.length)].target;
}

function runGame(seed) {
  Math.random = createRng(seed);
  const game = new AmberDunesGame("en");
  let state = game.getState();
  let guard = 0;

  if (state.totalAmber !== REQUIRED_TOTAL_AMBER) {
    throw new Error(`totalAmber: expected ${REQUIRED_TOTAL_AMBER}, got ${state.totalAmber}`);
  }

  while (state.status === "playing" && guard < 300) {
    guard += 1;
    const target = chooseHeuristicMove(state);
    const plan = game.planMove(target);
    state = plan ? game.moveToWithPlan(plan) : game.moveTo(target);
  }

  return state;
}

function assertWithin(label, actual, expected, tolerance) {
  const delta = Math.abs(actual - expected);
  if (delta > tolerance) {
    throw new Error(`${label}: expected ${expected} +/- ${tolerance}, got ${actual.toFixed(2)}`);
  }
}

let wins = 0;
let losses = 0;
let winMoves = 0;
let sinkjawLosses = 0;

for (let index = 0; index < GAMES; index += 1) {
  const state = runGame(SEED_BASE + index * SEED_STEP);

  if (state.status === "won") {
    wins += 1;
    winMoves += state.moves;
  } else {
    losses += 1;
    if (state.lossReason === "sinkjaw_attack") {
      sinkjawLosses += 1;
    }
  }
}

const winRate = (wins / GAMES) * 100;
const avgWinMoves = winMoves / wins;

const summary = {
  games: GAMES,
  wins,
  losses,
  winRate: Number(winRate.toFixed(2)),
  avgWinMoves: Number(avgWinMoves.toFixed(2)),
  sinkjawLossRate: Number(((sinkjawLosses / GAMES) * 100).toFixed(2)),
};

console.log(JSON.stringify(summary, null, 2));

assertWithin("winRate", winRate, TARGET_WIN_RATE, WIN_RATE_TOLERANCE);

if (avgWinMoves < MIN_AVG_WIN_MOVES || avgWinMoves > MAX_AVG_WIN_MOVES) {
  throw new Error(
    `avgWinMoves: expected ${MIN_AVG_WIN_MOVES}-${MAX_AVG_WIN_MOVES}, got ${avgWinMoves.toFixed(2)}`,
  );
}
