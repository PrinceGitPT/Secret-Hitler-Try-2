import type { GameState, Vote, VoteRevealOutcome, VoteRevealState } from "@/lib/game/types";

export const VOTE_REVEAL_MS = 5000;
export const FAILED_ELECTION_VISUAL_MS = 4000;

export function startVoteReveal(
  game: GameState,
  votesByPlayerId: Record<string, Vote>,
  outcome: VoteRevealOutcome,
  now: number = Date.now()
): VoteRevealState {
  const voteReveal: VoteRevealState = {
    votesByPlayerId: { ...votesByPlayerId },
    outcome,
    startedAt: now,
    endsAt: now + VOTE_REVEAL_MS
  };

  game.phase = "VOTE_REVEAL";
  game.voteReveal = voteReveal;
  return voteReveal;
}

export function isVoteRevealActive(game: GameState, now: number = Date.now()): boolean {
  const voteReveal = game.voteReveal;
  if (game.phase !== "VOTE_REVEAL" || !voteReveal) {
    return false;
  }
  return voteReveal.endsAt > now;
}

export function isFailedElectionVisualActive(voteReveal: VoteRevealState | undefined, now: number = Date.now()): boolean {
  if (!voteReveal || voteReveal.outcome !== "FAIL") {
    return false;
  }

  return now < voteReveal.startedAt + FAILED_ELECTION_VISUAL_MS;
}
