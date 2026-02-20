import { describe, expect, it } from "vitest";
import { isFailedElectionVisualActive, isVoteRevealActive, startVoteReveal, VOTE_REVEAL_MS } from "@/lib/game/voteReveal";
import type { GameState } from "@/lib/game/types";

function sampleGameState(): GameState {
  return {
    phase: "VOTING",
    presidentSeat: 1,
    chancellorSeat: 2,
    drawPile: ["LIBERAL", "FASCIST"],
    discardPile: [],
    liberalEnacted: 1,
    fascistEnacted: 2,
    electionTracker: 0,
    pendingVotes: {
      p1: "JA"
    },
    voteReveal: undefined,
    lastElectedPresidentSeat: undefined,
    lastElectedChancellorSeat: undefined,
    specialElectionNextPresidentSeat: undefined,
    specialElectionReturnSeat: undefined,
    pendingExecutivePower: undefined,
    executiveIntelLogByPlayer: {},
    enactmentSequence: 2,
    winner: undefined,
    winReason: undefined
  };
}

describe("vote reveal lifecycle", () => {
  it("starts vote reveal with copied votes and timing window", () => {
    const game = sampleGameState();
    const reveal = startVoteReveal(
      game,
      {
        p1: "JA",
        p2: "NEIN"
      },
      "FAIL",
      1_000
    );

    expect(game.phase).toBe("VOTE_REVEAL");
    expect(game.voteReveal).toBeDefined();
    expect(reveal.startedAt).toBe(1_000);
    expect(reveal.endsAt).toBe(1_000 + VOTE_REVEAL_MS);
    expect(reveal.votesByPlayerId).toEqual({ p1: "JA", p2: "NEIN" });
  });

  it("reports active vote reveal only before end timestamp", () => {
    const game = sampleGameState();
    startVoteReveal(game, { p1: "JA", p2: "JA" }, "PASS", 2_000);

    expect(isVoteRevealActive(game, 2_001)).toBe(true);
    expect(isVoteRevealActive(game, 6_999)).toBe(true);
    expect(isVoteRevealActive(game, 7_000)).toBe(false);
  });

  it("shows failed-election visual only within the first 4 seconds", () => {
    const game = sampleGameState();
    const reveal = startVoteReveal(game, { p1: "NEIN", p2: "NEIN" }, "FAIL", 10_000);

    expect(isFailedElectionVisualActive(reveal, 10_500)).toBe(true);
    expect(isFailedElectionVisualActive(reveal, 13_999)).toBe(true);
    expect(isFailedElectionVisualActive(reveal, 14_000)).toBe(false);
  });
});
