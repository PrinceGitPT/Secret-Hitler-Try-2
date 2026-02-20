import type { PowerTrackByRoomSize } from "@/lib/game/types";

export const powerTrackByRoomSize: PowerTrackByRoomSize = {
  5: [
    { fascistCount: 1, power: "NONE" },
    { fascistCount: 2, power: "NONE" },
    { fascistCount: 3, power: "POLICY_PEEK" },
    { fascistCount: 4, power: "EXECUTION" },
    { fascistCount: 5, power: "EXECUTION" }
  ],
  6: [
    { fascistCount: 1, power: "NONE" },
    { fascistCount: 2, power: "NONE" },
    { fascistCount: 3, power: "POLICY_PEEK" },
    { fascistCount: 4, power: "EXECUTION" },
    { fascistCount: 5, power: "EXECUTION" }
  ],
  7: [
    { fascistCount: 1, power: "NONE" },
    { fascistCount: 2, power: "INVESTIGATE_LOYALTY" },
    { fascistCount: 3, power: "SPECIAL_ELECTION" },
    { fascistCount: 4, power: "EXECUTION" },
    { fascistCount: 5, power: "EXECUTION" }
  ],
  8: [
    { fascistCount: 1, power: "NONE" },
    { fascistCount: 2, power: "INVESTIGATE_LOYALTY" },
    { fascistCount: 3, power: "SPECIAL_ELECTION" },
    { fascistCount: 4, power: "EXECUTION" },
    { fascistCount: 5, power: "EXECUTION" }
  ],
  9: [
    { fascistCount: 1, power: "INVESTIGATE_LOYALTY" },
    { fascistCount: 2, power: "INVESTIGATE_LOYALTY" },
    { fascistCount: 3, power: "SPECIAL_ELECTION" },
    { fascistCount: 4, power: "EXECUTION" },
    { fascistCount: 5, power: "EXECUTION" }
  ],
  10: [
    { fascistCount: 1, power: "INVESTIGATE_LOYALTY" },
    { fascistCount: 2, power: "INVESTIGATE_LOYALTY" },
    { fascistCount: 3, power: "SPECIAL_ELECTION" },
    { fascistCount: 4, power: "EXECUTION" },
    { fascistCount: 5, power: "EXECUTION" }
  ]
};

export function getPowerSlot(roomSize: keyof PowerTrackByRoomSize, fascistCount: number) {
  return powerTrackByRoomSize[roomSize].find((slot) => slot.fascistCount === fascistCount);
}
