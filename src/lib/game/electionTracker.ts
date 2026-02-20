import type { GameState } from "@/lib/game/types";

export const CHAOS_TRACKER_LIMIT = 3;

export function incrementElectionTracker(game: GameState): number {
  game.electionTracker += 1;
  return game.electionTracker;
}

export function resetElectionTracker(game: GameState): void {
  game.electionTracker = 0;
}

export function shouldTriggerChaos(game: GameState): boolean {
  return game.electionTracker >= CHAOS_TRACKER_LIMIT;
}

export function recordElectedGovernment(game: GameState): void {
  game.electionTracker = 0;
  game.lastElectedPresidentSeat = game.presidentSeat;
  game.lastElectedChancellorSeat = game.chancellorSeat;
}

export function clearLastElectedGovernment(game: GameState): void {
  game.lastElectedPresidentSeat = undefined;
  game.lastElectedChancellorSeat = undefined;
}
