import { describe, expect, it } from "vitest";
import {
  countVotes,
  getEligibleNominees,
  nextSeat
} from "@/lib/game/rules";
import type { Room } from "@/lib/game/types";

function sampleRoom(): Room {
  return {
    code: "ABC123",
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

describe("rules", () => {
  it("excludes president from eligible nominees", () => {
    const room = sampleRoom();
    const nomineeIds = getEligibleNominees(room).map((player) => player.id);

    expect(nomineeIds).toEqual(["p2", "p3", "p4", "p5"]);
  });

  it("counts JA/NEIN votes correctly", () => {
    const tally = countVotes({
      p1: "JA",
      p2: "JA",
      p3: "NEIN",
      p4: "JA",
      p5: "NEIN"
    });

    expect(tally).toEqual({ ja: 3, nein: 2 });
  });

  it("rotates to first seat when wrapping", () => {
    const room = sampleRoom();
    expect(nextSeat(room, 5)).toBe(1);
  });
});
