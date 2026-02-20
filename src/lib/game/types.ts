export type RoomSize = 5 | 6 | 7 | 8 | 9 | 10;

export type Policy = "LIBERAL" | "FASCIST";
export type Role = "LIBERAL" | "FASCIST" | "HITLER";
export type Team = "LIBERAL" | "FASCIST";
export type Vote = "JA" | "NEIN";
export type BotColor =
  | "YELLOW"
  | "BLUE"
  | "GREEN"
  | "ORANGE"
  | "PURPLE"
  | "TEAL"
  | "RED"
  | "PINK"
  | "BROWN"
  | "GRAY";

export type Phase =
  | "LOBBY"
  | "NOMINATION"
  | "VOTING"
  | "LEGISLATIVE_PRESIDENT"
  | "LEGISLATIVE_CHANCELLOR";

export interface Player {
  id: string;
  name: string;
  isBot: boolean;
  botColor?: BotColor;
  seat: number;
  connected: boolean;
  alive: boolean;
  role: Role;
}

export interface GameEventPolicyEnacted {
  type: "POLICY_ENACTED";
  policy: Policy;
  liberalEnacted: number;
  fascistEnacted: number;
}

export interface GameEventPowerSlotReached {
  type: "POWER_SLOT_REACHED";
  roomSize: RoomSize;
  fascistCount: number;
  power: ExecutivePower;
}

export type GameEvent = GameEventPolicyEnacted | GameEventPowerSlotReached;

export interface GameState {
  phase: Phase;
  presidentSeat: number;
  chancellorSeat?: number;
  drawPile: Policy[];
  discardPile: Policy[];
  liberalEnacted: number;
  fascistEnacted: number;
  pendingVotes: Record<string, Vote>;
  legislativeHand?: Policy[];
  lastEnactedPolicy?: Policy;
  enactmentSequence: number;
}

export interface Room {
  code: string;
  roomSize: RoomSize;
  themeId: string;
  players: Player[];
  hostId: string;
  locked: boolean;
  game?: GameState;
  createdAt: number;
  updatedAt: number;
  version: number;
}

export interface PublicPlayer {
  id: string;
  name: string;
  isBot: boolean;
  botColor?: BotColor;
  seat: number;
  connected: boolean;
  alive: boolean;
  isHost: boolean;
}

export interface PublicRoom {
  code: string;
  roomSize: RoomSize;
  themeId: string;
  players: PublicPlayer[];
  hostId: string;
  locked: boolean;
  game?: GameState;
  createdAt: number;
  updatedAt: number;
  version: number;
}

export type GameAction =
  | { type: "NOMINATE_CHANCELLOR"; actorId: string; nomineeId: string }
  | { type: "CAST_VOTE"; actorId: string; vote: Vote }
  | { type: "LEGISLATIVE_DISCARD"; actorId: string; cardIndex: 0 | 1 | 2 }
  | { type: "CHANCELLOR_DISCARD"; actorId: string; cardIndex: 0 | 1 };

export interface EligibleActions {
  canStart: boolean;
  canUpdateConfig: boolean;
  canNominate: boolean;
  eligibleNomineeIds: string[];
  canVote: boolean;
  hasVoted: boolean;
  canPresidentDiscard: boolean;
  canChancellorDiscard: boolean;
}

export interface RoomProjection {
  room: PublicRoom;
  eligible: EligibleActions;
  actorId?: string;
  viewer?: ViewerIdentity;
}

export interface KnownFactionMember {
  id: string;
  name: string;
  role: "FASCIST" | "HITLER";
}

export interface ViewerIdentity {
  role: Role;
  team: Team;
  isHitler: boolean;
  knownFactionMembers: KnownFactionMember[];
}

export type ExecutivePower =
  | "NONE"
  | "INVESTIGATE_LOYALTY"
  | "SPECIAL_ELECTION"
  | "POLICY_PEEK"
  | "EXECUTION";

export interface PowerSlot {
  fascistCount: 1 | 2 | 3 | 4 | 5;
  power: ExecutivePower;
}

export type PowerTrackByRoomSize = Record<RoomSize, PowerSlot[]>;

export interface ThemeManifest {
  id: string;
  name: string;
  boardImage: string;
  liberalCardFace: string;
  fascistCardFace: string;
  cardBack: string;
  deadPlayerOverlayImage: string;
  botColorImages: Record<BotColor, string>;
}
