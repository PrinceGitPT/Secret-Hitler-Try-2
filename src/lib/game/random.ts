export interface RandomSource {
  next(): number;
}

export const systemRandom: RandomSource = {
  next() {
    return Math.random();
  }
};

export function makeSeededRandom(seed: number): RandomSource {
  let state = seed >>> 0;
  return {
    next() {
      state = (1664525 * state + 1013904223) >>> 0;
      return state / 0x100000000;
    }
  };
}

export function randomInt(maxExclusive: number, rng: RandomSource = systemRandom): number {
  if (maxExclusive <= 0) {
    throw new Error("maxExclusive must be positive");
  }
  return Math.floor(rng.next() * maxExclusive);
}

export function shuffle<T>(items: readonly T[], rng: RandomSource = systemRandom): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1, rng);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function chooseUniform<T>(items: readonly T[], rng: RandomSource = systemRandom): T {
  if (items.length === 0) {
    throw new Error("Cannot choose from an empty array");
  }
  return items[randomInt(items.length, rng)];
}
