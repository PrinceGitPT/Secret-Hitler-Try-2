import { describe, expect, it } from "vitest";
import {
  allVotesSubmitted,
  countVotes,
  getEligibleInvestigateTargets,
  getEligibleNominees,
  getEligibleSpecialElectionCandidates,
  nextSeat
} from "@/lib/game/rules";
import type { Room, RoomSize } from "@/lib/game/types";

function sampleRoom(roomSize: RoomSize = 5): Room {
  const players = Array.from({ length: roomSize }, (_, index) => {
    const seat = index + 1;
    return {
      id: `p${seat}`,
      name: `P${seat}`,
      isBot: false,
      seat,
      connected: true,
      alive: true,
      role: seat === roomSize ? "HITLER" : seat === roomSize - 1 ? "FASCIST" : "LIBERAL"
    } as const;
  });

  return {
    code: "ABC123",
    roomSize,
    themeId: "classic",
    players,
    hostId: "p1",
    locked: true,
    game: {
      phase: "NOMINATION",
      presidentSeat: 1,
      drawPile: [],
      discardPile: [],
      liberalEnacted: 0,
      fascistEnacted: 0,
      electionTracker: 0,
      pendingVotes: {},
      lastElectedPresidentSeat: 2,
      lastElectedChancellorSeat: 3,
      enactmentSequence: 0
    },
    createdAt: 0,
    updatedAt: 0,
    version: 1
  };
}

describe("rules", () => {
  it("applies 6-10 player term limits to previous president and previous chancellor", () => {
    const room = sampleRoom(6);
    const nomineeIds = getEligibleNominees(room).map((player) => player.id);

    expect(nomineeIds).toEqual(["p4", "p5", "p6"]);
  });

  it("applies 5-player exception (previous president can be nominated)", () => {
    const room = sampleRoom(5);
    const nomineeIds = getEligibleNominees(room).map((player) => player.id);

    expect(nomineeIds).toEqual(["p2", "p4", "p5"]);
  });

  it("excludes dead players from nominee pool and seat rotation", () => {
    const room = sampleRoom(7);
    room.players.find((player) => player.id === "p4")!.alive = false;
    room.players.find((player) => player.id === "p5")!.alive = false;

    const nomineeIds = getEligibleNominees(room).map((player) => player.id);
    expect(nomineeIds).toEqual(["p6", "p7"]);

    expect(nextSeat(room, 3)).toBe(6);
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

  it("requires votes from alive players only", () => {
    const room = sampleRoom(5);
    room.game!.phase = "VOTING";
    room.players.find((player) => player.id === "p5")!.alive = false;
    room.game!.pendingVotes = {
      p1: "JA",
      p2: "NEIN",
      p3: "JA",
      p4: "JA"
    };

    expect(allVotesSubmitted(room)).toBe(true);
  });

  it("limits investigate and special election targets to alive non-self players", () => {
    const room = sampleRoom(7);
    room.players.find((player) => player.id === "p4")!.alive = false;

    const investigateIds = getEligibleInvestigateTargets(room, "p1").map((player) => player.id);
    const specialElectionIds = getEligibleSpecialElectionCandidates(room, "p1").map((player) => player.id);

    expect(investigateIds).not.toContain("p1");
    expect(investigateIds).not.toContain("p4");
    expect(specialElectionIds).not.toContain("p1");
    expect(specialElectionIds).not.toContain("p4");
  });
});
