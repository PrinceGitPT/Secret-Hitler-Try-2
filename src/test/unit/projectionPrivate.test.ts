import { describe, expect, it } from "vitest";
import { deriveEligibleActions, deriveViewerPrivateState, toPublicRoom } from "@/lib/game/projection";
import type { Room } from "@/lib/game/types";

function roomFixture(): Room {
  return {
    code: "PRV001",
    roomSize: 5,
    themeId: "classic",
    players: [
      { id: "p1", name: "President", isBot: false, seat: 1, connected: true, alive: true, role: "LIBERAL" },
      { id: "p2", name: "Chancellor", isBot: false, seat: 2, connected: true, alive: true, role: "FASCIST" },
      { id: "p3", name: "Hitler", isBot: false, seat: 3, connected: true, alive: true, role: "HITLER" },
      { id: "p4", name: "Liberal", isBot: false, seat: 4, connected: true, alive: true, role: "LIBERAL" },
      { id: "p5", name: "Liberal", isBot: false, seat: 5, connected: true, alive: true, role: "LIBERAL" }
    ],
    hostId: "p1",
    locked: true,
    game: {
      phase: "LEGISLATIVE_CHANCELLOR",
      presidentSeat: 1,
      chancellorSeat: 2,
      drawPile: ["LIBERAL", "FASCIST", "LIBERAL", "FASCIST"],
      discardPile: ["FASCIST", "LIBERAL"],
      liberalEnacted: 1,
      fascistEnacted: 3,
      electionTracker: 0,
      pendingVotes: {
        p1: "JA",
        p2: "JA"
      },
      legislativeHand: ["LIBERAL", "FASCIST"],
      lastElectedPresidentSeat: 1,
      lastElectedChancellorSeat: 2,
      specialElectionNextPresidentSeat: undefined,
      specialElectionReturnSeat: undefined,
      pendingExecutivePower: {
        power: "POLICY_PEEK",
        sourceFascistCount: 3,
        presidentSeat: 1,
        policyPeekCards: ["LIBERAL", "FASCIST", "FASCIST"]
      },
      executiveIntelLogByPlayer: {
        p1: [
          {
            id: "intel_1",
            power: "INVESTIGATE_LOYALTY",
            createdAt: 1,
            summary: "Investigated p3: FASCIST party."
          }
        ],
        p2: [
          {
            id: "intel_2",
            power: "EXECUTION",
            createdAt: 2,
            summary: "Executed p5."
          }
        ]
      },
      enactmentSequence: 4,
      winner: undefined,
      winReason: undefined
    },
    createdAt: 0,
    updatedAt: 0,
    version: 1
  };
}

describe("private projection", () => {
  it("sanitizes shared game state to counts only", () => {
    const projected = toPublicRoom(roomFixture());
    const game = projected.game as unknown as Record<string, unknown>;

    expect(projected.game?.drawPileCount).toBe(4);
    expect(projected.game?.discardPileCount).toBe(2);
    expect(projected.game?.pendingVotesCount).toBe(2);
    expect("drawPile" in game).toBe(false);
    expect("discardPile" in game).toBe(false);
    expect("pendingVotes" in game).toBe(false);
    expect("legislativeHand" in game).toBe(false);
  });

  it("exposes legislative hand only to acting chancellor in legislative phase", () => {
    const room = roomFixture();

    const chancellorView = deriveViewerPrivateState(room, "p2");
    expect(chancellorView?.legislativeHand).toEqual(["LIBERAL", "FASCIST"]);

    const observerView = deriveViewerPrivateState(room, "p4");
    expect(observerView?.legislativeHand).toBeUndefined();
  });

  it("exposes policy peek cards only to acting president during policy peek", () => {
    const room = roomFixture();
    room.game!.phase = "EXECUTIVE_ACTION";

    const presidentView = deriveViewerPrivateState(room, "p1");
    expect(presidentView?.activePolicyPeekCards).toEqual(["LIBERAL", "FASCIST", "FASCIST"]);

    const observerView = deriveViewerPrivateState(room, "p4");
    expect(observerView?.activePolicyPeekCards).toBeUndefined();
  });

  it("returns only the requesting actor's intel log", () => {
    const room = roomFixture();

    const p1View = deriveViewerPrivateState(room, "p1");
    expect(p1View?.executiveIntelLog).toHaveLength(1);
    expect(p1View?.executiveIntelLog[0]?.id).toBe("intel_1");

    const p2View = deriveViewerPrivateState(room, "p2");
    expect(p2View?.executiveIntelLog).toHaveLength(1);
    expect(p2View?.executiveIntelLog[0]?.id).toBe("intel_2");
  });

  it("disables all gameplay actions during vote reveal phase", () => {
    const room = roomFixture();
    room.game!.phase = "VOTE_REVEAL";
    room.game!.voteReveal = {
      votesByPlayerId: {
        p1: "JA",
        p2: "NEIN",
        p3: "JA",
        p4: "NEIN",
        p5: "JA"
      },
      outcome: "FAIL",
      startedAt: 100,
      endsAt: 5100
    };

    const eligible = deriveEligibleActions(room, "p1");

    expect(eligible.canNominate).toBe(false);
    expect(eligible.canVote).toBe(false);
    expect(eligible.canPresidentDiscard).toBe(false);
    expect(eligible.canChancellorDiscard).toBe(false);
    expect(eligible.canResolveExecutivePower).toBe(false);
  });
});
