import { describe, expect, it } from "vitest";
import { applyAction } from "@/lib/game/engine";
import { makeSeededRandom } from "@/lib/game/random";
import { createRoom, startGame } from "@/lib/game/setup";
import type { Room } from "@/lib/game/types";

describe("engine", () => {
  it("runs nomination -> voting -> legislative -> enactment loop", () => {
    const rng = makeSeededRandom(42);
    const created = createRoom({
      code: "ROOM42",
      roomSize: 5,
      themeId: "classic",
      hostName: "Host"
    });

    let room = startGame(created.room, rng);

    const president = room.players.find((player) => player.seat === room.game?.presidentSeat)!;
    const nominee = room.players.find((player) => player.seat === 2)!;

    room = applyAction(
      room,
      {
        type: "NOMINATE_CHANCELLOR",
        actorId: president.id,
        nomineeId: nominee.id
      },
      rng
    ).room;

    for (const player of room.players) {
      room = applyAction(
        room,
        {
          type: "CAST_VOTE",
          actorId: player.id,
          vote: "JA"
        },
        rng
      ).room;
    }

    expect(room.game?.phase).toBe("LEGISLATIVE_PRESIDENT");
    expect(room.game?.legislativeHand).toHaveLength(3);

    room = applyAction(
      room,
      {
        type: "LEGISLATIVE_DISCARD",
        actorId: president.id,
        cardIndex: 0
      },
      rng
    ).room;

    room = applyAction(
      room,
      {
        type: "CHANCELLOR_DISCARD",
        actorId: nominee.id,
        cardIndex: 0
      },
      rng
    ).room;

    expect(room.game?.phase).toBe("NOMINATION");
    expect((room.game?.liberalEnacted ?? 0) + (room.game?.fascistEnacted ?? 0)).toBe(1);
    expect(room.game?.presidentSeat).toBe(2);
  });

  it("reshuffles discard pile when draw pile is low", () => {
    const rng = makeSeededRandom(3);

    const room: Room = {
      code: "RESHUF",
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
        phase: "VOTING",
        presidentSeat: 1,
        chancellorSeat: 2,
        drawPile: ["LIBERAL", "FASCIST"],
        discardPile: ["FASCIST", "LIBERAL", "FASCIST"],
        liberalEnacted: 0,
        fascistEnacted: 0,
        pendingVotes: {
          p1: "JA",
          p2: "JA",
          p3: "JA",
          p4: "NEIN"
        },
        enactmentSequence: 0
      },
      createdAt: 0,
      updatedAt: 0,
      version: 1
    };

    const result = applyAction(
      room,
      {
        type: "CAST_VOTE",
        actorId: "p5",
        vote: "JA"
      },
      rng
    ).room;

    expect(result.game?.phase).toBe("LEGISLATIVE_PRESIDENT");
    expect(result.game?.legislativeHand).toHaveLength(3);
    expect(result.game?.discardPile.length).toBe(0);
  });
});
