import { BOARD_SIZE } from "./types.js";
const PROFILE_KEY = "amber-dunes-harvest.sinkjaw-bandit-profile";
const MODEL_VERSION = 2;
const FEATURE_COUNT = 10;
const LEARNING_RATE = 0.14;
const EPSILON = 0.18;
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
function distance(left, right) {
    return Math.hypot(left.x - right.x, left.y - right.y);
}
function sigmoid(value) {
    if (value >= 0) {
        const exponent = Math.exp(-value);
        return 1 / (1 + exponent);
    }
    const exponent = Math.exp(value);
    return exponent / (1 + exponent);
}
function boardIndex(position) {
    return position.y * BOARD_SIZE + position.x;
}
function zoneIndex(position) {
    return Math.floor(position.y / 3) * 3 + Math.floor(position.x / 3);
}
function randomWeight() {
    return (Math.random() * 2 - 1) * 0.08;
}
export class LocalWormBrain {
    storage;
    profile;
    constructor(storage) {
        this.storage = storage;
        this.profile = this.readProfile();
    }
    chooseSpawnTarget(context) {
        if (context.spawnCandidates.length === 0) {
            return null;
        }
        const scoredCandidates = context.spawnCandidates.map((candidate) => {
            const features = this.featuresForCandidate(context, candidate);
            const score = this.score(features);
            return { candidate, features, score };
        });
        const chosen = Math.random() < EPSILON
            ? scoredCandidates[Math.floor(Math.random() * scoredCandidates.length)]
            : scoredCandidates.reduce((best, current) => (current.score > best.score ? current : best));
        const reward = this.rewardForCandidate(context, chosen.candidate);
        this.updateWeights(chosen.features, chosen.score, reward);
        this.profile.decisions += 1;
        this.persist();
        return { ...chosen.candidate };
    }
    learnFromChoice(state, chosen) {
        const chosenMove = state.validMoves.find((move) => move.target.x === chosen.x && move.target.y === chosen.y);
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
    readProfile() {
        try {
            const raw = this.storage.getItem(PROFILE_KEY);
            if (!raw) {
                return this.createProfile();
            }
            const parsed = JSON.parse(raw);
            if (parsed.version !== MODEL_VERSION ||
                parsed.weights.length !== FEATURE_COUNT ||
                parsed.chosenCells.length !== BOARD_SIZE * BOARD_SIZE ||
                parsed.seenCells.length !== BOARD_SIZE * BOARD_SIZE ||
                parsed.chosenZones.length !== 9 ||
                parsed.seenZones.length !== 9) {
                return this.createProfile();
            }
            return parsed;
        }
        catch {
            return this.createProfile();
        }
    }
    createProfile() {
        const profile = {
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
        }
        catch {
            // Ignore storage failures and use the in-memory profile.
        }
        return profile;
    }
    persist() {
        try {
            this.storage.setItem(PROFILE_KEY, JSON.stringify(this.profile));
        }
        catch {
            // Ignore storage failures and use the in-memory profile.
        }
    }
    featuresForCandidate(context, candidate) {
        const boardSpan = BOARD_SIZE - 1;
        const maxDistance = Math.hypot(boardSpan, boardSpan);
        const center = (BOARD_SIZE - 1) / 2;
        const nearestSpiceDistance = this.findNearestSpiceDistance(context.board, candidate) / maxDistance;
        const reachable = context.nextMoves.some((move) => move.target.x === candidate.x && move.target.y === candidate.y);
        const hasSpice = context.board[candidate.y][candidate.x].hasSpice;
        const cellVisits = this.preferenceForCell(candidate);
        const zoneVisits = this.preferenceForZone(candidate);
        const distanceToHarvester = distance(candidate, context.harvester) / maxDistance;
        const distanceToCenter = distance(candidate, { x: center, y: center }) / maxDistance;
        const distanceToPreviousWorm = context.previousWorm
            ? distance(candidate, context.previousWorm) / maxDistance
            : 1;
        return [
            1,
            hasSpice ? 1 : 0,
            reachable ? 1 : 0,
            reachable && hasSpice ? 1 : 0,
            1 - distanceToHarvester,
            1 - nearestSpiceDistance,
            cellVisits,
            zoneVisits,
            1 - distanceToCenter,
            1 - distanceToPreviousWorm,
        ];
    }
    rewardForCandidate(context, candidate) {
        const cellVisits = this.preferenceForCell(candidate);
        const zoneVisits = this.preferenceForZone(candidate);
        const reachable = context.nextMoves.some((move) => move.target.x === candidate.x && move.target.y === candidate.y);
        const hasSpice = context.board[candidate.y][candidate.x].hasSpice;
        let reward = 0.04;
        if (reachable) {
            reward += 0.34;
        }
        if (reachable && hasSpice) {
            reward += 0.34;
        }
        else if (hasSpice) {
            reward += 0.08;
        }
        reward += cellVisits * 0.24;
        reward += zoneVisits * 0.16;
        return clamp(reward, 0, 1);
    }
    updateWeights(features, predictedReward, actualReward) {
        const error = actualReward - predictedReward;
        for (let index = 0; index < FEATURE_COUNT; index += 1) {
            this.profile.weights[index] += LEARNING_RATE * error * features[index];
            this.profile.weights[index] = clamp(this.profile.weights[index], -3, 3);
        }
    }
    score(features) {
        let sum = 0;
        for (let index = 0; index < FEATURE_COUNT; index += 1) {
            sum += features[index] * this.profile.weights[index];
        }
        return sigmoid(sum);
    }
    findNearestSpiceDistance(board, origin) {
        let best = Infinity;
        for (let y = 0; y < BOARD_SIZE; y += 1) {
            for (let x = 0; x < BOARD_SIZE; x += 1) {
                if (!board[y][x].hasSpice) {
                    continue;
                }
                best = Math.min(best, distance(origin, { x, y }));
            }
        }
        return Number.isFinite(best) ? best : 0;
    }
    preferenceForCell(position) {
        const index = boardIndex(position);
        return this.profile.chosenCells[index] / Math.max(1, this.profile.seenCells[index]);
    }
    preferenceForZone(position) {
        const index = zoneIndex(position);
        return this.profile.chosenZones[index] / Math.max(1, this.profile.seenZones[index]);
    }
}
