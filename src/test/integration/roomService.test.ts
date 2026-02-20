import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { makeSeededRandom } from "@/lib/game/random";
import { VOTE_REVEAL_MS } from "@/lib/game/voteReveal";
import {
  createRoomService,
  getRoomStateService,
  joinRoomService,
  startRoomService,
  submitActionService
} from "@/lib/server/roomService";
import { getRoomChatService } from "@/lib/server/chatService";
import { GameInvariantError } from "@/lib/game/errors";
import { resetMemoryKvForTests, writeRoom } from "@/lib/store/kv";
import type { Room } from "@/lib/game/types";

function serviceRoom(overrides: Partial<Room> = {}): Room {
  const room: Room = {
    code: "SRV001",
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
      voteReveal: undefined,
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

describe("room service integration", () => {
  beforeEach(() => {
    resetMemoryKvForTests();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("runs a full flow with multi-human and bot fill", async () => {
    const rng = makeSeededRandom(99);

    const created = await createRoomService(
      {
        hostName: "Host",
        roomSize: 5,
        themeId: "classic"
      },
      rng
    );

    const roomCode = created.room.room.code;
    const hostId = created.actorId;

    const joined = await joinRoomService(roomCode, "Second Human");
    const secondId = joined.actorId;

    await startRoomService({ roomCode, actorId: hostId, rng });

    const started = await getRoomStateService({ roomCode, actorId: hostId });
    expect(started.room.locked).toBe(true);
    expect(started.room.players).toHaveLength(5);
    expect(started.room.players.filter((player) => player.isBot)).toHaveLength(3);
    expect(started.room.game?.phase).toBe("NOMINATION");
    expect(started.room.game?.electionTracker).toBe(0);

    const chatAfterStart = await getRoomChatService({ roomCode, actorId: hostId });
    expect(chatAfterStart.messages.length).toBeGreaterThan(0);
    expect(chatAfterStart.messages.some((message) => message.senderIsBot)).toBe(true);

    await submitActionService({
      roomCode,
      action: {
        type: "NOMINATE_CHANCELLOR",
        actorId: hostId,
        nomineeId: secondId
      },
      rng
    });

    await submitActionService({
      roomCode,
      action: {
        type: "CAST_VOTE",
        actorId: hostId,
        vote: "JA"
      },
      rng
    });

    const afterSecondVote = await submitActionService({
      roomCode,
      action: {
        type: "CAST_VOTE",
        actorId: secondId,
        vote: "JA"
      },
      rng
    });

    expect(afterSecondVote.room.game?.phase).toBe("VOTE_REVEAL");

    vi.advanceTimersByTime(VOTE_REVEAL_MS);
    const legislative = await getRoomStateService({ roomCode, actorId: hostId });
    expect(legislative.room.game?.phase).toBe("LEGISLATIVE_PRESIDENT");

    await submitActionService({
      roomCode,
      action: {
        type: "LEGISLATIVE_DISCARD",
        actorId: hostId,
        cardIndex: 0
      },
      rng
    });

    await submitActionService({
      roomCode,
      action: {
        type: "CHANCELLOR_DISCARD",
        actorId: secondId,
        cardIndex: 0
      },
      rng
    });

    const afterEnact = await getRoomStateService({ roomCode, actorId: hostId });
    const enacted =
      (afterEnact.room.game?.liberalEnacted ?? 0) + (afterEnact.room.game?.fascistEnacted ?? 0);

    expect(["NOMINATION", "EXECUTIVE_ACTION", "GAME_OVER"]).toContain(afterEnact.room.game?.phase);
    expect(enacted).toBe(1);
  });

  it("ends game from policy win via submitAction service", async () => {
    const room = serviceRoom({
      code: "WINPOL",
      game: {
        phase: "LEGISLATIVE_CHANCELLOR",
        presidentSeat: 1,
        chancellorSeat: 2,
        legislativeHand: ["LIBERAL", "FASCIST"],
        liberalEnacted: 4
      }
    });

    await writeRoom(room);

    const result = await submitActionService({
      roomCode: "WINPOL",
      action: {
        type: "CHANCELLOR_DISCARD",
        actorId: "p2",
        cardIndex: 1
      }
    });

    expect(result.room.game?.phase).toBe("GAME_OVER");
    expect(result.room.game?.winner).toBe("LIBERAL");
    expect(result.room.game?.winReason).toBe("LIBERAL_POLICY");
  });

  it("blocks actions during vote reveal and then unlocks after 5 seconds", async () => {
    const room = serviceRoom({
      code: "LOCK01",
      game: {
        phase: "VOTING",
        presidentSeat: 1,
        chancellorSeat: 2,
        pendingVotes: {
          p1: "JA",
          p2: "NEIN",
          p3: "JA",
          p4: "JA"
        }
      }
    });

    await writeRoom(room);

    const reveal = await submitActionService({
      roomCode: "LOCK01",
      action: {
        type: "CAST_VOTE",
        actorId: "p5",
        vote: "NEIN"
      }
    });

    expect(reveal.room.game?.phase).toBe("VOTE_REVEAL");
    expect(reveal.room.game?.voteReveal?.votesByPlayerId).toEqual({
      p1: "JA",
      p2: "NEIN",
      p3: "JA",
      p4: "JA",
      p5: "NEIN"
    });

    try {
      await submitActionService({
        roomCode: "LOCK01",
        action: {
          type: "NOMINATE_CHANCELLOR",
          actorId: "p1",
          nomineeId: "p2"
        }
      });
      throw new Error("Expected submitActionService to throw.");
    } catch (error) {
      expect(error).toBeInstanceOf(GameInvariantError);
      expect((error as GameInvariantError).code).toBe("VOTE_REVEAL_LOCKED");
    }

    vi.advanceTimersByTime(VOTE_REVEAL_MS);
    const stateAfterExpiry = await getRoomStateService({ roomCode: "LOCK01", actorId: "p1" });
    expect(stateAfterExpiry.room.game?.phase).not.toBe("VOTE_REVEAL");
  });

  it("ends game when Hitler is elected chancellor after 3 fascist policies", async () => {
    const room = serviceRoom({
      code: "HITLEC",
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

    await writeRoom(room);

    const afterVote = await submitActionService({
      roomCode: "HITLEC",
      action: {
        type: "CAST_VOTE",
        actorId: "p5",
        vote: "JA"
      }
    });

    expect(afterVote.room.game?.phase).toBe("VOTE_REVEAL");

    vi.advanceTimersByTime(VOTE_REVEAL_MS);
    const result = await getRoomStateService({ roomCode: "HITLEC", actorId: "p1" });

    expect(result.room.game?.phase).toBe("GAME_OVER");
    expect(result.room.game?.winner).toBe("FASCIST");
    expect(result.room.game?.winReason).toBe("HITLER_ELECTED_CHANCELLOR");
  });

  it("resolves execution through service and ends game when Hitler is executed", async () => {
    const room = serviceRoom({
      code: "EXEC01",
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

    await writeRoom(room);

    const result = await submitActionService({
      roomCode: "EXEC01",
      action: {
        type: "RESOLVE_EXECUTIVE_POWER",
        actorId: "p1",
        resolution: {
          kind: "EXECUTION",
          targetId: "p4"
        }
      }
    });

    expect(result.room.game?.phase).toBe("GAME_OVER");
    expect(result.room.game?.winner).toBe("LIBERAL");
    expect(result.room.game?.winReason).toBe("HITLER_EXECUTED");
  });

  it("chaos top-decks at three failed elections after reveal expires", async () => {
    const room = serviceRoom({
      code: "CHAOS1",
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

    await writeRoom(room);

    const afterVote = await submitActionService({
      roomCode: "CHAOS1",
      action: {
        type: "CAST_VOTE",
        actorId: "p5",
        vote: "NEIN"
      }
    });

    expect(afterVote.room.game?.phase).toBe("VOTE_REVEAL");

    vi.advanceTimersByTime(VOTE_REVEAL_MS);
    const result = await getRoomStateService({ roomCode: "CHAOS1", actorId: "p1" });

    expect(result.room.game?.phase).toBe("NOMINATION");
    expect(result.room.game?.electionTracker).toBe(0);
    expect(result.room.game?.fascistEnacted).toBe(4);
    expect(result.room.game?.pendingExecutivePower).toBeUndefined();
    expect(result.room.game?.lastElectedPresidentSeat).toBeUndefined();
    expect(result.room.game?.lastElectedChancellorSeat).toBeUndefined();
  });

  it("stores investigate intel privately for the acting president only", async () => {
    const room = serviceRoom({
      code: "INVPWR",
      game: {
        phase: "EXECUTIVE_ACTION",
        presidentSeat: 1,
        pendingExecutivePower: {
          power: "INVESTIGATE_LOYALTY",
          sourceFascistCount: 2,
          presidentSeat: 1
        }
      }
    });

    await writeRoom(room);

    await submitActionService({
      roomCode: "INVPWR",
      action: {
        type: "RESOLVE_EXECUTIVE_POWER",
        actorId: "p1",
        resolution: {
          kind: "INVESTIGATE_LOYALTY",
          targetId: "p4"
        }
      }
    });

    const p1View = await getRoomStateService({ roomCode: "INVPWR", actorId: "p1" });
    const p2View = await getRoomStateService({ roomCode: "INVPWR", actorId: "p2" });

    const p1Log = p1View.viewerPrivate?.executiveIntelLog ?? [];
    const p2Log = p2View.viewerPrivate?.executiveIntelLog ?? [];

    expect(p1Log.length).toBe(1);
    expect(p1Log[0]?.summary).toContain("FASCIST party");
    expect(p2Log).toHaveLength(0);
  });

  it("exposes policy peek cards only to the acting president and logs after acknowledgment", async () => {
    const room = serviceRoom({
      code: "PEEK01",
      game: {
        phase: "EXECUTIVE_ACTION",
        presidentSeat: 1,
        pendingExecutivePower: {
          power: "POLICY_PEEK",
          sourceFascistCount: 3,
          presidentSeat: 1,
          policyPeekCards: ["LIBERAL", "FASCIST", "LIBERAL"]
        }
      }
    });

    await writeRoom(room);

    const p1Before = await getRoomStateService({ roomCode: "PEEK01", actorId: "p1" });
    const p2Before = await getRoomStateService({ roomCode: "PEEK01", actorId: "p2" });
    expect(p1Before.viewerPrivate?.activePolicyPeekCards).toEqual(["LIBERAL", "FASCIST", "LIBERAL"]);
    expect(p2Before.viewerPrivate?.activePolicyPeekCards).toBeUndefined();

    await submitActionService({
      roomCode: "PEEK01",
      action: {
        type: "RESOLVE_EXECUTIVE_POWER",
        actorId: "p1",
        resolution: {
          kind: "POLICY_PEEK"
        }
      }
    });

    const p1After = await getRoomStateService({ roomCode: "PEEK01", actorId: "p1" });
    expect(p1After.viewerPrivate?.executiveIntelLog[0]?.summary).toContain("Peeked top policies");
  });

  it("applies special election next-president override and then returns to normal order", async () => {
    const room = serviceRoom({
      code: "SPECEL",
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

    await writeRoom(room);

    const afterSpecialElection = await submitActionService({
      roomCode: "SPECEL",
      action: {
        type: "RESOLVE_EXECUTIVE_POWER",
        actorId: "p1",
        resolution: {
          kind: "SPECIAL_ELECTION",
          presidentSeat: 4
        }
      }
    });

    expect(afterSpecialElection.room.game?.phase).toBe("NOMINATION");
    expect(afterSpecialElection.room.game?.presidentSeat).toBe(4);

    await submitActionService({
      roomCode: "SPECEL",
      action: {
        type: "NOMINATE_CHANCELLOR",
        actorId: "p4",
        nomineeId: "p2"
      }
    });

    for (const voterId of ["p1", "p2", "p3", "p4", "p5"]) {
      await submitActionService({
        roomCode: "SPECEL",
        action: {
          type: "CAST_VOTE",
          actorId: voterId,
          vote: "JA"
        }
      });
    }

    vi.advanceTimersByTime(VOTE_REVEAL_MS);
    const afterReveal = await getRoomStateService({ roomCode: "SPECEL", actorId: "p1" });
    expect(afterReveal.room.game?.phase).toBe("LEGISLATIVE_PRESIDENT");

    await submitActionService({
      roomCode: "SPECEL",
      action: {
        type: "LEGISLATIVE_DISCARD",
        actorId: "p4",
        cardIndex: 0
      }
    });

    const afterEnactment = await submitActionService({
      roomCode: "SPECEL",
      action: {
        type: "CHANCELLOR_DISCARD",
        actorId: "p2",
        cardIndex: 0
      }
    });

    expect(afterEnactment.room.game?.phase).toBe("NOMINATION");
    expect(afterEnactment.room.game?.presidentSeat).toBe(2);
  });
});
