import { describe, expect, it } from "vitest";
import { applyAction } from "@/lib/game/engine";
import { GameInvariantError } from "@/lib/game/errors";
import { makeSeededRandom } from "@/lib/game/random";
import type { Room } from "@/lib/game/types";

function baseRoom(overrides: Partial<Room> = {}): Room {
  const room: Room = {
    code: "ENG001",
    roomSize: 5,
    themeId: "classic",
    players: [
      { id: "p1", name: "P1", isBot: false, seat: 1, connected: true, alive: true, role: "LIBERAL" },
      { id: "p2", name: "P2", isBot: false, seat: 2, connected: true, alive: true, role: "LIBERAL" },
      { id: "p3", name: "P3", isBot: false, seat: 3, connected: true, alive: true, role: "FASCIST" },
      { id: "p4", name: "P4", isBot: false, seat: 4, connected: true, alive: true, role: "HITLER" },
      { id: "p5", name: "P5", isBot: false, seat: 5, connected: true, alive: true, role: "LIBERAL" }
    ],
    hostId: "p1",
    locked: true,
    game: {
      phase: "NOMINATION",
      presidentSeat: 1,
      drawPile: ["LIBERAL", "FASCIST", "FASCIST", "LIBERAL"],
      discardPile: [],
      liberalEnacted: 0,
      fascistEnacted: 0,
      electionTracker: 0,
      pendingVotes: {},
      lastElectedPresidentSeat: undefined,
      lastElectedChancellorSeat: undefined,
      specialElectionNextPresidentSeat: undefined,
      specialElectionReturnSeat: undefined,
      pendingExecutivePower: undefined,
      executiveIntelLogByPlayer: {},
      enactmentSequence: 0,
      winner: undefined,
      winReason: undefined
    },
    createdAt: 0,
    updatedAt: 0,
    version: 1
  };

  return {
    ...room,
    ...overrides,
    game: {
      ...room.game,
      ...(overrides.game ?? {})
    }
  };
}

describe("engine", () => {
  it("enforces liberal policy win at 5", () => {
    const room = baseRoom({
      game: {
        phase: "LEGISLATIVE_CHANCELLOR",
        presidentSeat: 1,
        chancellorSeat: 2,
        legislativeHand: ["LIBERAL", "FASCIST"],
        liberalEnacted: 4
      }
    });

    const result = applyAction(room, {
      type: "CHANCELLOR_DISCARD",
      actorId: "p2",
      cardIndex: 1
    }).room;

    expect(result.game?.phase).toBe("GAME_OVER");
    expect(result.game?.winner).toBe("LIBERAL");
    expect(result.game?.winReason).toBe("LIBERAL_POLICY");
  });

  it("enforces fascist policy win at 6", () => {
    const room = baseRoom({
      game: {
        phase: "LEGISLATIVE_CHANCELLOR",
        presidentSeat: 1,
        chancellorSeat: 2,
        legislativeHand: ["FASCIST", "LIBERAL"],
        fascistEnacted: 5
      }
    });

    const result = applyAction(room, {
      type: "CHANCELLOR_DISCARD",
      actorId: "p2",
      cardIndex: 1
    }).room;

    expect(result.game?.phase).toBe("GAME_OVER");
    expect(result.game?.winner).toBe("FASCIST");
    expect(result.game?.winReason).toBe("FASCIST_POLICY");
  });

  it("enforces fascist win when Hitler is elected chancellor after 3+ fascist policies", () => {
    const room = baseRoom({
      game: {
        phase: "VOTING",
        presidentSeat: 1,
        chancellorSeat: 4,
        fascistEnacted: 3,
        pendingVotes: {
          p1: "JA",
          p2: "JA",
          p3: "JA",
          p4: "NEIN"
        }
      }
    });

    const result = applyAction(room, {
      type: "CAST_VOTE",
      actorId: "p5",
      vote: "JA"
    }).room;

    expect(result.game?.phase).toBe("GAME_OVER");
    expect(result.game?.winner).toBe("FASCIST");
    expect(result.game?.winReason).toBe("HITLER_ELECTED_CHANCELLOR");
    expect(result.game?.legislativeHand).toBeUndefined();
  });

  it("increments election tracker and chaos top-decks at three failed governments", () => {
    const room = baseRoom({
      game: {
        phase: "VOTING",
        presidentSeat: 1,
        chancellorSeat: 2,
        drawPile: ["FASCIST"],
        discardPile: ["LIBERAL"],
        fascistEnacted: 3,
        electionTracker: 2,
        pendingVotes: {
          p1: "NEIN",
          p2: "NEIN",
          p3: "NEIN",
          p4: "JA"
        },
        lastElectedPresidentSeat: 1,
        lastElectedChancellorSeat: 2
      }
    });

    const result = applyAction(
      room,
      {
        type: "CAST_VOTE",
        actorId: "p5",
        vote: "NEIN"
      },
      makeSeededRandom(77)
    ).room;

    expect(result.game?.phase).toBe("NOMINATION");
    expect(result.game?.electionTracker).toBe(0);
    expect(result.game?.fascistEnacted).toBe(4);
    expect(result.game?.pendingExecutivePower).toBeUndefined();
    expect(result.game?.lastElectedPresidentSeat).toBeUndefined();
    expect(result.game?.lastElectedChancellorSeat).toBeUndefined();
  });

  it("resolves execution power and gives liberals win when Hitler is executed", () => {
    const room = baseRoom({
      game: {
        phase: "EXECUTIVE_ACTION",
        presidentSeat: 1,
        pendingExecutivePower: {
          power: "EXECUTION",
          sourceFascistCount: 4,
          presidentSeat: 1
        }
      }
    });

    const result = applyAction(room, {
      type: "RESOLVE_EXECUTIVE_POWER",
      actorId: "p1",
      resolution: {
        kind: "EXECUTION",
        targetId: "p4"
      }
    }).room;

    expect(result.players.find((player) => player.id === "p4")?.alive).toBe(false);
    expect(result.game?.phase).toBe("GAME_OVER");
    expect(result.game?.winner).toBe("LIBERAL");
    expect(result.game?.winReason).toBe("HITLER_EXECUTED");
  });

  it("applies special election override for one cycle and then returns to normal order", () => {
    const room = baseRoom({
      game: {
        phase: "EXECUTIVE_ACTION",
        presidentSeat: 1,
        drawPile: ["LIBERAL", "LIBERAL", "LIBERAL", "LIBERAL", "LIBERAL", "LIBERAL"],
        discardPile: [],
        pendingExecutivePower: {
          power: "SPECIAL_ELECTION",
          sourceFascistCount: 3,
          presidentSeat: 1
        }
      }
    });

    const afterSpecial = applyAction(room, {
      type: "RESOLVE_EXECUTIVE_POWER",
      actorId: "p1",
      resolution: {
        kind: "SPECIAL_ELECTION",
        presidentSeat: 4
      }
    }).room;

    expect(afterSpecial.game?.phase).toBe("NOMINATION");
    expect(afterSpecial.game?.presidentSeat).toBe(4);

    const afterNomination = applyAction(afterSpecial, {
      type: "NOMINATE_CHANCELLOR",
      actorId: "p4",
      nomineeId: "p2"
    }).room;

    const afterVotes = ["p1", "p2", "p3", "p4", "p5"].reduce((currentRoom, voterId) => {
      return applyAction(currentRoom, {
        type: "CAST_VOTE",
        actorId: voterId,
        vote: "JA"
      }).room;
    }, afterNomination);

    expect(afterVotes.game?.phase).toBe("LEGISLATIVE_PRESIDENT");
    expect(afterVotes.game?.presidentSeat).toBe(4);

    const afterPresidentDiscard = applyAction(afterVotes, {
      type: "LEGISLATIVE_DISCARD",
      actorId: "p4",
      cardIndex: 0
    }).room;

    const afterEnactment = applyAction(afterPresidentDiscard, {
      type: "CHANCELLOR_DISCARD",
      actorId: "p2",
      cardIndex: 0
    }).room;

    expect(afterEnactment.game?.phase).toBe("NOMINATION");
    expect(afterEnactment.game?.presidentSeat).toBe(2);
  });

  it("rejects actions after game over", () => {
    const room = baseRoom({
      game: {
        phase: "GAME_OVER",
        winner: "LIBERAL",
        winReason: "LIBERAL_POLICY"
      }
    });

    try {
      applyAction(room, {
        type: "NOMINATE_CHANCELLOR",
        actorId: "p1",
        nomineeId: "p2"
      });
      throw new Error("Expected applyAction to throw.");
    } catch (error) {
      expect(error).toBeInstanceOf(GameInvariantError);
      expect((error as GameInvariantError).code).toBe("GAME_OVER");
    }
  });
});
