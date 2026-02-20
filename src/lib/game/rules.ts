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

function isAlive(player: Player): boolean {
  return player.alive !== false;
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

  const blockedSeats = new Set<number>([room.game.presidentSeat]);

  if (room.game.lastElectedChancellorSeat !== undefined) {
    blockedSeats.add(room.game.lastElectedChancellorSeat);
  }

  if (room.roomSize >= 6 && room.game.lastElectedPresidentSeat !== undefined) {
    blockedSeats.add(room.game.lastElectedPresidentSeat);
  }

  return sortedPlayers(room).filter((player) => isAlive(player) && !blockedSeats.has(player.seat));
}

export function getEligibleExecutionTargets(room: Room): Player[] {
  return sortedPlayers(room).filter((player) => isAlive(player));
}

export function getEligibleInvestigateTargets(room: Room, presidentId: string): Player[] {
  return sortedPlayers(room).filter((player) => isAlive(player) && player.id !== presidentId);
}

export function getEligibleSpecialElectionCandidates(room: Room, presidentId: string): Player[] {
  return sortedPlayers(room).filter((player) => isAlive(player) && player.id !== presidentId);
}

export function hasActorVoted(game: GameState, actorId: string): boolean {
  return Object.prototype.hasOwnProperty.call(game.pendingVotes, actorId);
}

export function allVotesSubmitted(room: Room): boolean {
  if (!room.game) {
    return false;
  }

  const aliveVoterIds = new Set(room.players.filter((player) => isAlive(player)).map((player) => player.id));
  let submitted = 0;
  for (const voterId of Object.keys(room.game.pendingVotes)) {
    if (aliveVoterIds.has(voterId)) {
      submitted += 1;
    }
  }

  return submitted === aliveVoterIds.size;
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
  const seats = sortedPlayers(room)
    .filter((player) => isAlive(player))
    .map((player) => player.seat);

  if (seats.length === 0) {
    return currentSeat;
  }

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
