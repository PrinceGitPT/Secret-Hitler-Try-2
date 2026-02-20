export type RoomSize = 5 | 6 | 7 | 8 | 9 | 10;

export type Policy = "LIBERAL" | "FASCIST";
export type Role = "LIBERAL" | "FASCIST" | "HITLER";
export type Team = "LIBERAL" | "FASCIST";
export type Vote = "JA" | "NEIN";
export type VoteRevealOutcome = "PASS" | "FAIL";
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
  | "VOTE_REVEAL"
  | "LEGISLATIVE_PRESIDENT"
  | "LEGISLATIVE_CHANCELLOR"
  | "EXECUTIVE_ACTION"
  | "GAME_OVER";

export interface VoteRevealState {
  votesByPlayerId: Record<string, Vote>;
  outcome: VoteRevealOutcome;
  startedAt: number;
  endsAt: number;
}

export type WinnerTeam = "LIBERAL" | "FASCIST";
export type WinReason =
  | "LIBERAL_POLICY"
  | "FASCIST_POLICY"
  | "HITLER_ELECTED_CHANCELLOR"
  | "HITLER_EXECUTED";

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
  electionTracker: number;
  pendingVotes: Record<string, Vote>;
  voteReveal?: VoteRevealState;
  legislativeHand?: Policy[];
  lastElectedPresidentSeat?: number;
  lastElectedChancellorSeat?: number;
  specialElectionNextPresidentSeat?: number;
  specialElectionReturnSeat?: number;
  pendingExecutivePower?: PendingExecutivePower;
  executiveIntelLogByPlayer: Record<string, ExecutiveIntelEntry[]>;
  lastEnactedPolicy?: Policy;
  enactmentSequence: number;
  winner?: WinnerTeam;
  winReason?: WinReason;
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
  game?: PublicGameState;
  createdAt: number;
  updatedAt: number;
  version: number;
}

export type GameAction =
  | { type: "NOMINATE_CHANCELLOR"; actorId: string; nomineeId: string }
  | { type: "CAST_VOTE"; actorId: string; vote: Vote }
  | { type: "LEGISLATIVE_DISCARD"; actorId: string; cardIndex: 0 | 1 | 2 }
  | { type: "CHANCELLOR_DISCARD"; actorId: string; cardIndex: 0 | 1 }
  | { type: "RESOLVE_EXECUTIVE_POWER"; actorId: string; resolution: ExecutiveResolution };

export interface EligibleActions {
  canStart: boolean;
  canUpdateConfig: boolean;
  canNominate: boolean;
  eligibleNomineeIds: string[];
  canVote: boolean;
  hasVoted: boolean;
  canPresidentDiscard: boolean;
  canChancellorDiscard: boolean;
  canResolveExecutivePower: boolean;
  eligibleExecutiveTargets: string[];
  eligibleInvestigateTargetIds: string[];
  eligibleSpecialElectionSeatNumbers: number[];
  canAcknowledgePolicyPeek: boolean;
}

export interface RoomProjection {
  room: PublicRoom;
  eligible: EligibleActions;
  actorId?: string;
  viewer?: ViewerIdentity;
  viewerPrivate?: ViewerPrivateState;
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

export interface PendingExecutivePower {
  power: ExecutivePower;
  sourceFascistCount: number;
  presidentSeat: number;
  policyPeekCards?: Policy[];
}

export type ExecutiveResolution =
  | { kind: "EXECUTION"; targetId: string }
  | { kind: "INVESTIGATE_LOYALTY"; targetId: string }
  | { kind: "SPECIAL_ELECTION"; presidentSeat: number }
  | { kind: "POLICY_PEEK" };

export interface ExecutiveIntelEntry {
  id: string;
  power: Exclude<ExecutivePower, "NONE">;
  createdAt: number;
  summary: string;
}

export interface ViewerPrivateState {
  legislativeHand?: Policy[];
  activePolicyPeekCards?: Policy[];
  executiveIntelLog: ExecutiveIntelEntry[];
}

export interface PublicPendingExecutivePower {
  power: ExecutivePower;
  sourceFascistCount: number;
  presidentSeat: number;
}

export interface PublicGameState {
  phase: Phase;
  presidentSeat: number;
  chancellorSeat?: number;
  liberalEnacted: number;
  fascistEnacted: number;
  electionTracker: number;
  pendingVotesCount: number;
  voteReveal?: VoteRevealState;
  drawPileCount: number;
  discardPileCount: number;
  pendingExecutivePower?: PublicPendingExecutivePower;
  lastEnactedPolicy?: Policy;
  enactmentSequence: number;
  winner?: WinnerTeam;
  winReason?: WinReason;
}

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
  winnerBannerByReason: Record<WinReason, string>;
}
