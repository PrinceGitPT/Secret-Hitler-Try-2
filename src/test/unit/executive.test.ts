import { describe, expect, it } from "vitest";
import { buildAutoExecutiveResolution, resolvePendingExecutivePower } from "@/lib/game/executive";
import { GameInvariantError } from "@/lib/game/errors";
import { makeSeededRandom } from "@/lib/game/random";
import type { ExecutivePower, Room } from "@/lib/game/types";

function baseRoom(power: ExecutivePower): Room {
  return {
    code: "EXE001",
    roomSize: 5,
    themeId: "classic",
    players: [
      { id: "p1", name: "President", isBot: false, seat: 1, connected: true, alive: true, role: "LIBERAL" },
      { id: "p2", name: "Liberal", isBot: false, seat: 2, connected: true, alive: true, role: "LIBERAL" },
      { id: "p3", name: "Fascist", isBot: false, seat: 3, connected: true, alive: true, role: "FASCIST" },
      { id: "p4", name: "Hitler", isBot: false, seat: 4, connected: true, alive: true, role: "HITLER" },
      { id: "p5", name: "Player", isBot: false, seat: 5, connected: true, alive: true, role: "LIBERAL" }
    ],
    hostId: "p1",
    locked: true,
    game: {
      phase: "EXECUTIVE_ACTION",
      presidentSeat: 1,
      drawPile: ["LIBERAL", "FASCIST", "FASCIST", "LIBERAL", "LIBERAL"],
      discardPile: ["FASCIST"],
      liberalEnacted: 1,
      fascistEnacted: 3,
      electionTracker: 0,
      pendingVotes: {},
      lastElectedPresidentSeat: undefined,
      lastElectedChancellorSeat: undefined,
      specialElectionNextPresidentSeat: undefined,
      specialElectionReturnSeat: undefined,
      pendingExecutivePower: {
        power,
        sourceFascistCount: 3,
        presidentSeat: 1,
        policyPeekCards: power === "POLICY_PEEK" ? ["LIBERAL", "FASCIST", "LIBERAL"] : undefined
      },
      executiveIntelLogByPlayer: {},
      enactmentSequence: 2,
      winner: undefined,
      winReason: undefined
    },
    createdAt: 0,
    updatedAt: 0,
    version: 1
  };
}

describe("executive resolution", () => {
  it("rejects investigate target when selecting self", () => {
    const room = baseRoom("INVESTIGATE_LOYALTY");

    try {
      resolvePendingExecutivePower(room, "p1", {
        kind: "INVESTIGATE_LOYALTY",
        targetId: "p1"
      });
      throw new Error("Expected resolvePendingExecutivePower to throw.");
    } catch (error) {
      expect(error).toBeInstanceOf(GameInvariantError);
      expect((error as GameInvariantError).code).toBe("INVALID_EXECUTION_TARGET");
    }
  });

  it("logs investigated party membership for liberal, fascist, and Hitler targets", () => {
    const liberalRoom = baseRoom("INVESTIGATE_LOYALTY");
    resolvePendingExecutivePower(liberalRoom, "p1", {
      kind: "INVESTIGATE_LOYALTY",
      targetId: "p2"
    });
    expect(liberalRoom.game?.executiveIntelLogByPlayer.p1?.[0]?.summary).toContain("LIBERAL party");

    const fascistRoom = baseRoom("INVESTIGATE_LOYALTY");
    resolvePendingExecutivePower(fascistRoom, "p1", {
      kind: "INVESTIGATE_LOYALTY",
      targetId: "p3"
    });
    expect(fascistRoom.game?.executiveIntelLogByPlayer.p1?.[0]?.summary).toContain("FASCIST party");

    const hitlerRoom = baseRoom("INVESTIGATE_LOYALTY");
    resolvePendingExecutivePower(hitlerRoom, "p1", {
      kind: "INVESTIGATE_LOYALTY",
      targetId: "p4"
    });
    expect(hitlerRoom.game?.executiveIntelLogByPlayer.p1?.[0]?.summary).toContain("FASCIST party");
  });

  it("policy peek acknowledgment logs exact cards without consuming draw pile", () => {
    const room = baseRoom("POLICY_PEEK");
    const drawBefore = room.game?.drawPile.length;

    resolvePendingExecutivePower(room, "p1", {
      kind: "POLICY_PEEK"
    });

    expect(room.game?.drawPile.length).toBe(drawBefore);
    expect(room.game?.executiveIntelLogByPlayer.p1?.[0]?.summary).toContain("LIBERAL, FASCIST, LIBERAL");
  });

  it("special election stores next president and return seat", () => {
    const room = baseRoom("SPECIAL_ELECTION");

    resolvePendingExecutivePower(room, "p1", {
      kind: "SPECIAL_ELECTION",
      presidentSeat: 4
    });

    expect(room.game?.specialElectionNextPresidentSeat).toBe(4);
    expect(room.game?.specialElectionReturnSeat).toBe(2);
    expect(room.game?.executiveIntelLogByPlayer.p1?.[0]?.summary).toContain("Seat 4");
  });

  it("auto executive resolution always returns valid selections", () => {
    const rng = makeSeededRandom(21);

    const execution = buildAutoExecutiveResolution(baseRoom("EXECUTION"), {
      power: "EXECUTION",
      sourceFascistCount: 4,
      presidentSeat: 1
    }, rng);
    expect(execution.kind).toBe("EXECUTION");
    if (execution.kind === "EXECUTION") {
      expect(["p1", "p2", "p3", "p4", "p5"]).toContain(execution.targetId);
    }

    const investigate = buildAutoExecutiveResolution(baseRoom("INVESTIGATE_LOYALTY"), {
      power: "INVESTIGATE_LOYALTY",
      sourceFascistCount: 2,
      presidentSeat: 1
    }, rng);
    expect(investigate.kind).toBe("INVESTIGATE_LOYALTY");
    if (investigate.kind === "INVESTIGATE_LOYALTY") {
      expect(investigate.targetId).not.toBe("p1");
    }

    const specialElection = buildAutoExecutiveResolution(baseRoom("SPECIAL_ELECTION"), {
      power: "SPECIAL_ELECTION",
      sourceFascistCount: 3,
      presidentSeat: 1
    }, rng);
    expect(specialElection.kind).toBe("SPECIAL_ELECTION");
    if (specialElection.kind === "SPECIAL_ELECTION") {
      expect([2, 3, 4, 5]).toContain(specialElection.presidentSeat);
    }

    const policyPeek = buildAutoExecutiveResolution(baseRoom("POLICY_PEEK"), {
      power: "POLICY_PEEK",
      sourceFascistCount: 3,
      presidentSeat: 1
    }, rng);
    expect(policyPeek).toEqual({ kind: "POLICY_PEEK" });
  });
});
