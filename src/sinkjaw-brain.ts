import { BOARD_SIZE, type CellState, type GameState, type Position } from "./types.js";
import type { SinkjawSpawnContext } from "./game.js";

const PROFILE_KEY = "amber-dunes-harvest.sinkjaw-bandit-profile";
const MODEL_VERSION = 2;
const FEATURE_COUNT = 10;
const LEARNING_RATE = 0.14;
const EPSILON = 0.18;

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface BanditProfile {
  version: number;
  decisions: number;
  moveObservations: number;
  weights: number[];
  chosenCells: number[];
  seenCells: number[];
  chosenZones: number[];
  seenZones: number[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function distance(left: Position, right: Position): number {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function sigmoid(value: number): number {
  if (value >= 0) {
    const exponent = Math.exp(-value);
    return 1 / (1 + exponent);
  }

  const exponent = Math.exp(value);
  return exponent / (1 + exponent);
}

function boardIndex(position: Position): number {
  return position.y * BOARD_SIZE + position.x;
}

function zoneIndex(position: Position): number {
  return Math.floor(position.y / 3) * 3 + Math.floor(position.x / 3);
}

function randomWeight(): number {
  return (Math.random() * 2 - 1) * 0.08;
}

export class LocalSinkjawBrain {
  private readonly storage: StorageLike;
  private profile: BanditProfile;

  constructor(storage: StorageLike) {
    this.storage = storage;
    this.profile = this.readProfile();
  }

  public chooseSpawnTarget(context: SinkjawSpawnContext): Position | null {
    if (context.spawnCandidates.length === 0) {
      return null;
    }

    const scoredCandidates = context.spawnCandidates.map((candidate) => {
      const features = this.featuresForCandidate(context, candidate);
      const score = this.score(features);
      return { candidate, features, score };
    });

    const chosen =
      Math.random() < EPSILON
        ? scoredCandidates[Math.floor(Math.random() * scoredCandidates.length)]
        : scoredCandidates.reduce((best, current) => (current.score > best.score ? current : best));

    const reward = this.rewardForCandidate(context, chosen.candidate);
    this.updateWeights(chosen.features, chosen.score, reward);
    this.profile.decisions += 1;
    this.persist();

    return { ...chosen.candidate };
  }

  public learnFromChoice(state: GameState, chosen: Position): void {
    const chosenMove = state.validMoves.find(
      (move) => move.target.x === chosen.x && move.target.y === chosen.y,
    );

    if (!chosenMove) {
      return;
    }

    this.profile.moveObservations += 1;

    for (const move of state.validMoves) {
      this.profile.seenCells[boardIndex(move.target)] += 1;
      this.profile.seenZones[zoneIndex(move.target)] += 1;
    }

    this.profile.chosenCells[boardIndex(chosen)] += 1;
    this.profile.chosenZones[zoneIndex(chosen)] += 1;
    this.persist();
  }

  private readProfile(): BanditProfile {
    try {
      const raw = this.storage.getItem(PROFILE_KEY);
      if (!raw) {
        return this.createProfile();
      }

      const parsed = JSON.parse(raw) as BanditProfile;
      if (
        parsed.version !== MODEL_VERSION ||
        parsed.weights.length !== FEATURE_COUNT ||
        parsed.chosenCells.length !== BOARD_SIZE * BOARD_SIZE ||
        parsed.seenCells.length !== BOARD_SIZE * BOARD_SIZE ||
        parsed.chosenZones.length !== 9 ||
        parsed.seenZones.length !== 9
      ) {
        return this.createProfile();
      }

      return parsed;
    } catch {
      return this.createProfile();
    }
  }

  private createProfile(): BanditProfile {
    const profile: BanditProfile = {
      version: MODEL_VERSION,
      decisions: 0,
      moveObservations: 0,
      weights: Array.from({ length: FEATURE_COUNT }, () => randomWeight()),
      chosenCells: Array.from({ length: BOARD_SIZE * BOARD_SIZE }, () => 0),
      seenCells: Array.from({ length: BOARD_SIZE * BOARD_SIZE }, () => 0),
      chosenZones: Array.from({ length: 9 }, () => 0),
      seenZones: Array.from({ length: 9 }, () => 0),
    };

    try {
      this.storage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch {
      // Ignore storage failures and use the in-memory profile.
    }

    return profile;
  }

  private persist(): void {
    try {
      this.storage.setItem(PROFILE_KEY, JSON.stringify(this.profile));
    } catch {
      // Ignore storage failures and use the in-memory profile.
    }
  }

  private featuresForCandidate(context: SinkjawSpawnContext, candidate: Position): number[] {
    const boardSpan = BOARD_SIZE - 1;
    const maxDistance = Math.hypot(boardSpan, boardSpan);
    const center = (BOARD_SIZE - 1) / 2;
    const nearestAmberDistance = this.findNearestAmberDistance(context.board, candidate) / maxDistance;
    const reachable = context.nextMoves.some(
      (move) => move.target.x === candidate.x && move.target.y === candidate.y,
    );
    const hasAmber = context.board[candidate.y][candidate.x].hasAmber;
    const cellVisits = this.preferenceForCell(candidate);
    const zoneVisits = this.preferenceForZone(candidate);
    const distanceToCollector = distance(candidate, context.collector) / maxDistance;
    const distanceToCenter = distance(candidate, { x: center, y: center }) / maxDistance;
    const distanceToPreviousSinkjaw = context.previousSinkjaw
      ? distance(candidate, context.previousSinkjaw) / maxDistance
      : 1;

    return [
      1,
      hasAmber ? 1 : 0,
      reachable ? 1 : 0,
      reachable && hasAmber ? 1 : 0,
      1 - distanceToCollector,
      1 - nearestAmberDistance,
      cellVisits,
      zoneVisits,
      1 - distanceToCenter,
      1 - distanceToPreviousSinkjaw,
    ];
  }

  private rewardForCandidate(context: SinkjawSpawnContext, candidate: Position): number {
    const cellVisits = this.preferenceForCell(candidate);
    const zoneVisits = this.preferenceForZone(candidate);
    const reachable = context.nextMoves.some(
      (move) => move.target.x === candidate.x && move.target.y === candidate.y,
    );
    const hasAmber = context.board[candidate.y][candidate.x].hasAmber;

    let reward = 0.04;

    if (reachable) {
      reward += 0.34;
    }
    if (reachable && hasAmber) {
      reward += 0.34;
    } else if (hasAmber) {
      reward += 0.08;
    }

    reward += cellVisits * 0.24;
    reward += zoneVisits * 0.16;

    return clamp(reward, 0, 1);
  }

  private updateWeights(features: number[], predictedReward: number, actualReward: number): void {
    const error = actualReward - predictedReward;

    for (let index = 0; index < FEATURE_COUNT; index += 1) {
      this.profile.weights[index] += LEARNING_RATE * error * features[index];
      this.profile.weights[index] = clamp(this.profile.weights[index], -3, 3);
    }
  }

  private score(features: number[]): number {
    let sum = 0;
    for (let index = 0; index < FEATURE_COUNT; index += 1) {
      sum += features[index] * this.profile.weights[index];
    }
    return sigmoid(sum);
  }

  private findNearestAmberDistance(board: CellState[][], origin: Position): number {
    let best = Infinity;

    for (let y = 0; y < BOARD_SIZE; y += 1) {
      for (let x = 0; x < BOARD_SIZE; x += 1) {
        if (!board[y][x].hasAmber) {
          continue;
        }
        best = Math.min(best, distance(origin, { x, y }));
      }
    }

    return Number.isFinite(best) ? best : 0;
  }

  private preferenceForCell(position: Position): number {
    const index = boardIndex(position);
    return this.profile.chosenCells[index] / Math.max(1, this.profile.seenCells[index]);
  }

  private preferenceForZone(position: Position): number {
    const index = zoneIndex(position);
    return this.profile.chosenZones[index] / Math.max(1, this.profile.seenZones[index]);
  }
}
