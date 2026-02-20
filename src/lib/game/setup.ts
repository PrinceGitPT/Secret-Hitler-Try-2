import { GameInvariantError } from "@/lib/game/errors";
import type { BotColor, Player, Policy, Role, Room, RoomSize } from "@/lib/game/types";
import { chooseUniform, shuffle, systemRandom, type RandomSource } from "@/lib/game/random";
import { sanitizeName, sortedPlayers } from "@/lib/game/rules";

const ROOM_CODE_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const roleDistribution: Record<RoomSize, Role[]> = {
  5: ["LIBERAL", "LIBERAL", "LIBERAL", "FASCIST", "HITLER"],
  6: ["LIBERAL", "LIBERAL", "LIBERAL", "LIBERAL", "FASCIST", "HITLER"],
  7: ["LIBERAL", "LIBERAL", "LIBERAL", "LIBERAL", "FASCIST", "FASCIST", "HITLER"],
  8: ["LIBERAL", "LIBERAL", "LIBERAL", "LIBERAL", "LIBERAL", "FASCIST", "FASCIST", "HITLER"],
  9: ["LIBERAL", "LIBERAL", "LIBERAL", "LIBERAL", "LIBERAL", "FASCIST", "FASCIST", "FASCIST", "HITLER"],
  10: ["LIBERAL", "LIBERAL", "LIBERAL", "LIBERAL", "LIBERAL", "LIBERAL", "FASCIST", "FASCIST", "FASCIST", "HITLER"]
};

const BOT_NAME_POOL = [
  "Otto",
  "Greta",
  "Emil",
  "Ruth",
  "Ida",
  "Nils",
  "Hugo",
  "Klara",
  "Bruno",
  "Elsa",
  "Theo",
  "Marta"
];

const BOT_COLOR_ORDER: BotColor[] = [
  "YELLOW",
  "BLUE",
  "GREEN",
  "ORANGE",
  "PURPLE",
  "TEAL",
  "RED",
  "PINK",
  "BROWN",
  "GRAY"
];

const BOT_COLOR_LABEL: Record<BotColor, string> = {
  YELLOW: "Yellow",
  BLUE: "Blue",
  GREEN: "Green",
  ORANGE: "Orange",
  PURPLE: "Purple",
  TEAL: "Teal",
  RED: "Red",
  PINK: "Pink",
  BROWN: "Brown",
  GRAY: "Gray"
};

export function generatePlayerId(): string {
  return `p_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

export function generateRoomCode(rng: RandomSource = systemRandom): string {
  const chars = ROOM_CODE_CHARSET.split("");
  return Array.from({ length: 6 }, () => chooseUniform(chars, rng)).join("");
}

export function buildPolicyDeck(rng: RandomSource = systemRandom): Policy[] {
  const deck: Policy[] = [
    ...Array.from({ length: 6 }, () => "LIBERAL" as const),
    ...Array.from({ length: 11 }, () => "FASCIST" as const)
  ];
  return shuffle(deck, rng);
}

function assignRoles(players: Player[], roomSize: RoomSize, rng: RandomSource): Player[] {
  const roles = shuffle(roleDistribution[roomSize], rng);
  const sorted = [...players].sort((a, b) => a.seat - b.seat);
  return sorted.map((player, index) => ({
    ...player,
    role: roles[index]
  }));
}

export function createRoom(params: {
  code: string;
  roomSize: RoomSize;
  themeId: string;
  hostName: string;
}): { room: Room; host: Player } {
  const hostName = sanitizeName(params.hostName);
  if (!hostName) {
    throw new GameInvariantError("INVALID_HOST_NAME", "Host name is required.");
  }

  const now = Date.now();
  const host: Player = {
    id: generatePlayerId(),
    name: hostName,
    isBot: false,
    seat: 1,
    connected: true,
    alive: true,
    role: "LIBERAL"
  };

  const room: Room = {
    code: params.code,
    roomSize: params.roomSize,
    themeId: params.themeId,
    players: [host],
    hostId: host.id,
    locked: false,
    createdAt: now,
    updatedAt: now,
    version: 1
  };

  return { room, host };
}

export function joinHumanPlayer(room: Room, name: string): { room: Room; player: Player } {
  if (room.locked) {
    throw new GameInvariantError("ROOM_LOCKED", "Cannot join a game that has started.");
  }

  const normalized = sanitizeName(name);
  if (!normalized) {
    throw new GameInvariantError("INVALID_PLAYER_NAME", "Player name is required.");
  }

  if (room.players.length >= room.roomSize) {
    throw new GameInvariantError("ROOM_FULL", "Room is already full.");
  }

  const seat = room.players.length + 1;
  const player: Player = {
    id: generatePlayerId(),
    name: normalized,
    isBot: false,
    seat,
    connected: true,
    alive: true,
    role: "LIBERAL"
  };

  const nextRoom: Room = {
    ...room,
    players: [...room.players, player],
    updatedAt: Date.now(),
    version: room.version + 1
  };

  return { room: nextRoom, player };
}

function nextBotColor(usedColors: Set<BotColor>, seat: number): BotColor {
  const unused = BOT_COLOR_ORDER.find((color) => !usedColors.has(color));
  if (unused) {
    return unused;
  }

  return BOT_COLOR_ORDER[(seat - 1) % BOT_COLOR_ORDER.length];
}

function nextBotName(existingNames: Set<string>, botColor: BotColor, rng: RandomSource): string {
  const preferred = `${BOT_COLOR_LABEL[botColor]} Bot`;
  if (!existingNames.has(preferred)) {
    return preferred;
  }

  for (let attempt = 0; attempt < 24; attempt += 1) {
    const base = chooseUniform(BOT_NAME_POOL, rng);
    const variant = `${BOT_COLOR_LABEL[botColor]} ${base} Bot`;
    if (!existingNames.has(variant)) {
      return variant;
    }
  }

  let counter = 1;
  while (existingNames.has(`Bot ${counter}`)) {
    counter += 1;
  }
  return `Bot ${counter}`;
}

export function fillBots(room: Room, rng: RandomSource = systemRandom): Room {
  const nextRoom: Room = {
    ...room,
    players: sortedPlayers(room)
  };

  const existingNames = new Set(nextRoom.players.map((player) => player.name));
  const usedColors = new Set<BotColor>();
  for (const player of nextRoom.players) {
    if (player.isBot && player.botColor) {
      usedColors.add(player.botColor);
    }
  }

  while (nextRoom.players.length < nextRoom.roomSize) {
    const seat = nextRoom.players.length + 1;
    const botColor = nextBotColor(usedColors, seat);
    usedColors.add(botColor);
    const botName = nextBotName(existingNames, botColor, rng);
    existingNames.add(botName);

    nextRoom.players.push({
      id: generatePlayerId(),
      name: botName,
      isBot: true,
      botColor,
      seat,
      connected: true,
      alive: true,
      role: "LIBERAL"
    });
  }

  nextRoom.updatedAt = Date.now();
  nextRoom.version += 1;
  return nextRoom;
}

export function startGame(room: Room, rng: RandomSource = systemRandom): Room {
  if (room.locked || room.game) {
    throw new GameInvariantError("GAME_ALREADY_STARTED", "Game already started.");
  }

  if (room.players.length === 0) {
    throw new GameInvariantError("NO_PLAYERS", "Room has no players.");
  }

  const withBots = fillBots(room, rng);
  const playersWithRoles = assignRoles(withBots.players, withBots.roomSize, rng);

  return {
    ...withBots,
    players: playersWithRoles,
    locked: true,
    game: {
      phase: "NOMINATION",
      presidentSeat: 1,
      drawPile: buildPolicyDeck(rng),
      discardPile: [],
      liberalEnacted: 0,
      fascistEnacted: 0,
      electionTracker: 0,
      pendingVotes: {},
      lastElectedPresidentSeat: undefined,
      lastElectedChancellorSeat: undefined,
      specialElectionNextPresidentSeat: undefined,
      specialElectionReturnSeat: undefined,
      pendingExecutivePower: undefined,
      executiveIntelLogByPlayer: {},
      enactmentSequence: 0,
      winner: undefined,
      winReason: undefined
    },
    updatedAt: Date.now(),
    version: withBots.version + 1
  };
}

export function updateRoomConfig(room: Room, config: { roomSize?: RoomSize; themeId?: string }): Room {
  if (room.locked || room.game) {
    throw new GameInvariantError("ROOM_LOCKED", "Cannot update room config after game start.");
  }

  const roomSize = config.roomSize ?? room.roomSize;
  if (room.players.length > roomSize) {
    throw new GameInvariantError("ROOM_SIZE_TOO_SMALL", "Room size cannot be less than current players.");
  }

  return {
    ...room,
    roomSize,
    themeId: config.themeId ?? room.themeId,
    updatedAt: Date.now(),
    version: room.version + 1
  };
}
