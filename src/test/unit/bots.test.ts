import { describe, expect, it } from "vitest";
import { chooseBotDiscardIndex, chooseBotNominee, chooseBotVote } from "@/lib/game/bots";
import { makeSeededRandom } from "@/lib/game/random";
import type { Room } from "@/lib/game/types";

function nominationRoom(): Room {
  return {
    code: "BOT123",
    roomSize: 5,
    themeId: "classic",
    players: [
      { id: "b1", name: "Bot1", isBot: true, seat: 1, connected: true, alive: true, role: "LIBERAL" },
      { id: "p2", name: "P2", isBot: false, seat: 2, connected: true, alive: true, role: "LIBERAL" },
      { id: "p3", name: "P3", isBot: false, seat: 3, connected: true, alive: true, role: "FASCIST" },
      { id: "p4", name: "P4", isBot: false, seat: 4, connected: true, alive: true, role: "HITLER" },
      { id: "p5", name: "P5", isBot: false, seat: 5, connected: true, alive: true, role: "LIBERAL" }
    ],
    hostId: "p2",
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
}

describe("bots", () => {
  it("chooses a valid nominee that is not president", () => {
    const room = nominationRoom();
    const nominee = chooseBotNominee(room, makeSeededRandom(11));

    expect(nominee).not.toBe("b1");
    expect(room.players.some((player) => player.id === nominee)).toBe(true);
  });

  it("vote distribution is roughly uniform", () => {
    const rng = makeSeededRandom(19);
    let ja = 0;
    let nein = 0;

    for (let i = 0; i < 5000; i += 1) {
      const vote = chooseBotVote(rng);
      if (vote === "JA") {
        ja += 1;
      } else {
        nein += 1;
      }
    }

    const ratio = ja / (ja + nein);
    expect(ratio).toBeGreaterThan(0.45);
    expect(ratio).toBeLessThan(0.55);
  });

  it("discard index is always in bounds", () => {
    const rng = makeSeededRandom(7);
    for (let i = 0; i < 100; i += 1) {
      const index = chooseBotDiscardIndex(["LIBERAL", "FASCIST", "FASCIST"], rng);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(3);
    }
  });
});
