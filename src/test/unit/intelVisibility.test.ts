import { describe, expect, it } from "vitest";
import { deriveViewerIdentity } from "@/lib/game/projection";
import type { Room, RoomSize } from "@/lib/game/types";

function makeRoom(roomSize: RoomSize, rolesBySeat: Record<number, "LIBERAL" | "FASCIST" | "HITLER">): Room {
  return {
    code: "ROOM01",
    roomSize,
    themeId: "classic",
    players: Array.from({ length: roomSize }, (_, index) => {
      const seat = index + 1;
      return {
        id: `p${seat}`,
        name: `P${seat}`,
        isBot: false,
        seat,
        connected: true,
        alive: true,
        role: rolesBySeat[seat]
      };
    }),
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
      enactmentSequence: 0
    },
    createdAt: 0,
    updatedAt: 0,
    version: 1
  };
}

describe("intel visibility", () => {
  it("fascists see other fascists and Hitler", () => {
    const room = makeRoom(8, {
      1: "FASCIST",
      2: "HITLER",
      3: "FASCIST",
      4: "LIBERAL",
      5: "LIBERAL",
      6: "LIBERAL",
      7: "LIBERAL",
      8: "LIBERAL"
    });

    const viewer = deriveViewerIdentity(room, "p1");
    expect(viewer?.role).toBe("FASCIST");
    expect(viewer?.knownFactionMembers).toEqual([
      { id: "p2", name: "P2", role: "HITLER" },
      { id: "p3", name: "P3", role: "FASCIST" }
    ]);
  });

  it("hitler sees fascists in 5-6 player rooms", () => {
    const room = makeRoom(5, {
      1: "HITLER",
      2: "FASCIST",
      3: "LIBERAL",
      4: "LIBERAL",
      5: "LIBERAL"
    });

    const viewer = deriveViewerIdentity(room, "p1");
    expect(viewer?.role).toBe("HITLER");
    expect(viewer?.knownFactionMembers).toEqual([{ id: "p2", name: "P2", role: "FASCIST" }]);
  });

  it("hitler does not see fascists in 7-10 player rooms", () => {
    const room = makeRoom(7, {
      1: "HITLER",
      2: "FASCIST",
      3: "FASCIST",
      4: "LIBERAL",
      5: "LIBERAL",
      6: "LIBERAL",
      7: "LIBERAL"
    });

    const viewer = deriveViewerIdentity(room, "p1");
    expect(viewer?.role).toBe("HITLER");
    expect(viewer?.knownFactionMembers).toEqual([]);
  });

  it("liberals do not see faction intel", () => {
    const room = makeRoom(7, {
      1: "LIBERAL",
      2: "HITLER",
      3: "FASCIST",
      4: "FASCIST",
      5: "LIBERAL",
      6: "LIBERAL",
      7: "LIBERAL"
    });

    const viewer = deriveViewerIdentity(room, "p1");
    expect(viewer?.role).toBe("LIBERAL");
    expect(viewer?.knownFactionMembers).toEqual([]);
  });
});
