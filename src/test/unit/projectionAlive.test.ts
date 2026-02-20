import { describe, expect, it } from "vitest";
import { toPublicRoom } from "@/lib/game/projection";
import type { Room } from "@/lib/game/types";

describe("projection alive mapping", () => {
  it("maps dead player state into public room projection", () => {
    const room: Room = {
      code: "ROOMAA",
      roomSize: 5,
      themeId: "classic",
      players: [
        {
          id: "p1",
          name: "Alive",
          isBot: false,
          seat: 1,
          connected: true,
          alive: true,
          role: "LIBERAL"
        },
        {
          id: "p2",
          name: "Dead",
          isBot: false,
          seat: 2,
          connected: true,
          alive: false,
          role: "FASCIST"
        }
      ],
      hostId: "p1",
      locked: true,
      game: {
        phase: "NOMINATION",
        presidentSeat: 1,
        drawPile: [],
        discardPile: [],
        liberalEnacted: 0,
        fascistEnacted: 0,
        pendingVotes: {},
        enactmentSequence: 0
      },
      createdAt: 0,
      updatedAt: 0,
      version: 1
    };

    const projected = toPublicRoom(room);
    expect(projected.players.find((player) => player.id === "p1")?.alive).toBe(true);
    expect(projected.players.find((player) => player.id === "p2")?.alive).toBe(false);
  });

  it("falls back to alive=true for legacy players without alive flag", () => {
    const legacyRoom = {
      code: "LEGACY",
      roomSize: 5,
      themeId: "classic",
      players: [
        {
          id: "p1",
          name: "Legacy",
          isBot: false,
          seat: 1,
          connected: true,
          role: "LIBERAL"
        }
      ],
      hostId: "p1",
      locked: false,
      createdAt: 0,
      updatedAt: 0,
      version: 1
    } as unknown as Room;

    const projected = toPublicRoom(legacyRoom);
    expect(projected.players[0].alive).toBe(true);
  });
});
