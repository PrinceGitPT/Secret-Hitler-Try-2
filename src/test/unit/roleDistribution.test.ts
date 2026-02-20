import { describe, expect, it } from "vitest";
import { makeSeededRandom } from "@/lib/game/random";
import { createRoom, startGame } from "@/lib/game/setup";
import type { Role, RoomSize } from "@/lib/game/types";

const expectedRoleCounts: Record<RoomSize, Record<Role, number>> = {
  5: { LIBERAL: 3, FASCIST: 1, HITLER: 1 },
  6: { LIBERAL: 4, FASCIST: 1, HITLER: 1 },
  7: { LIBERAL: 4, FASCIST: 2, HITLER: 1 },
  8: { LIBERAL: 5, FASCIST: 2, HITLER: 1 },
  9: { LIBERAL: 5, FASCIST: 3, HITLER: 1 },
  10: { LIBERAL: 6, FASCIST: 3, HITLER: 1 }
};

describe("role distribution", () => {
  it("assigns official role counts for room sizes 5-10", () => {
    const roomSizes: RoomSize[] = [5, 6, 7, 8, 9, 10];

    for (const roomSize of roomSizes) {
      const created = createRoom({
        code: `ROOM${roomSize}`,
        roomSize,
        themeId: "classic",
        hostName: "Host"
      });

      const started = startGame(created.room, makeSeededRandom(roomSize));
      const counts = started.players.reduce(
        (acc, player) => {
          acc[player.role] += 1;
          return acc;
        },
        { LIBERAL: 0, FASCIST: 0, HITLER: 0 }
      );

      expect(started.players).toHaveLength(roomSize);
      expect(counts).toEqual(expectedRoleCounts[roomSize]);
    }
  });

  it("assigns a unique color-themed identity to each auto-filled bot", () => {
    const created = createRoom({
      code: "BOTCLR",
      roomSize: 10,
      themeId: "classic",
      hostName: "Host"
    });

    const started = startGame(created.room, makeSeededRandom(22));
    const bots = started.players.filter((player) => player.isBot);
    const botColors = bots.map((bot) => bot.botColor);

    expect(bots).toHaveLength(9);
    expect(botColors.every((color) => Boolean(color))).toBe(true);
    expect(new Set(botColors).size).toBe(botColors.length);
    expect(bots[0]?.name).toMatch(/Bot/);
  });
});
