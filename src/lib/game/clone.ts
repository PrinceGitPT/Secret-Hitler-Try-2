import type { Room } from "@/lib/game/types";

export function cloneRoom(room: Room): Room {
  if (typeof structuredClone === "function") {
    return structuredClone(room);
  }
  return JSON.parse(JSON.stringify(room)) as Room;
}
