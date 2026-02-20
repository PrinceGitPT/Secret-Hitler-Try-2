import type { GameState, Player, Room, Vote } from "@/lib/game/types";

export function getPlayerById(room: Room, playerId: string): Player | undefined {
  return room.players.find((player) => player.id === playerId);
}

export function getPlayerBySeat(room: Room, seat: number): Player | undefined {
  return room.players.find((player) => player.seat === seat);
}

export function sortedPlayers(room: Room): Player[] {
  return [...room.players].sort((a, b) => a.seat - b.seat);
}

export function getPresident(room: Room): Player | undefined {
  if (!room.game) {
    return undefined;
  }
  return getPlayerBySeat(room, room.game.presidentSeat);
}

export function getChancellor(room: Room): Player | undefined {
  if (!room.game || room.game.chancellorSeat === undefined) {
    return undefined;
  }
  return getPlayerBySeat(room, room.game.chancellorSeat);
}

export function getEligibleNominees(room: Room): Player[] {
  if (!room.game) {
    return [];
  }
  const presidentSeat = room.game.presidentSeat;
  return sortedPlayers(room).filter((player) => player.seat !== presidentSeat);
}

export function hasActorVoted(game: GameState, actorId: string): boolean {
  return Object.prototype.hasOwnProperty.call(game.pendingVotes, actorId);
}

export function allVotesSubmitted(room: Room): boolean {
  if (!room.game) {
    return false;
  }
  return Object.keys(room.game.pendingVotes).length === room.players.length;
}

export function countVotes(votes: Record<string, Vote>): { ja: number; nein: number } {
  return Object.values(votes).reduce(
    (acc, vote) => {
      if (vote === "JA") {
        acc.ja += 1;
      } else {
        acc.nein += 1;
      }
      return acc;
    },
    { ja: 0, nein: 0 }
  );
}

export function nextSeat(room: Room, currentSeat: number): number {
  const seats = sortedPlayers(room).map((player) => player.seat);
  const currentIndex = seats.findIndex((seat) => seat === currentSeat);
  if (currentIndex === -1) {
    return seats[0] ?? 1;
  }
  const nextIndex = (currentIndex + 1) % seats.length;
  return seats[nextIndex];
}

export function sanitizeName(input: string): string {
  return input.trim().replace(/\s+/g, " ").slice(0, 24);
}
