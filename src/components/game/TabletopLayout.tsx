"use client";

import { useEffect, useMemo, useState } from "react";
import { SeatRing } from "@/components/lobby/SeatRing";
import { CardView } from "@/components/game/CardView";
import { PolicyBoard } from "@/components/game/PolicyBoard";
import { VotePanel } from "@/components/game/VotePanel";
import { VoteRevealBanner } from "@/components/game/VoteRevealBanner";
import { LegislativePanel } from "@/components/game/LegislativePanel";
import { FactionIntelPanel } from "@/components/game/FactionIntelPanel";
import { ExecutiveIntelPanel } from "@/components/game/ExecutiveIntelPanel";
import { ChatPanel } from "@/components/game/ChatPanel";
import { WinnerBanner } from "@/components/game/WinnerBanner";
import type { PublicChatMessage } from "@/lib/chat/types";
import type {
  EligibleActions,
  ExecutiveResolution,
  PublicRoom,
  ThemeManifest,
  ViewerIdentity,
  ViewerPrivateState
} from "@/lib/game/types";

interface TabletopLayoutProps {
  room: PublicRoom;
  theme: ThemeManifest;
  eligible: EligibleActions;
  actorId?: string;
  viewer?: ViewerIdentity;
  viewerPrivate?: ViewerPrivateState;
  busy?: boolean;
  onNominate: (nomineeId: string) => void;
  onVote: (vote: "JA" | "NEIN") => void;
  onPresidentDiscard: (cardIndex: number) => void;
  onChancellorDiscard: (cardIndex: number) => void;
  onResolveExecutivePower: (resolution: ExecutiveResolution) => void;
  chatMessages: PublicChatMessage[];
  chatCanSend: boolean;
  chatDisabledReason?: string;
  chatBusy?: boolean;
  onSendChat: (body: string) => void;
}

export function TabletopLayout({
  room,
  theme,
  eligible,
  actorId,
  viewer,
  viewerPrivate,
  busy,
  onNominate,
  onVote,
  onPresidentDiscard,
  onChancellorDiscard,
  onResolveExecutivePower,
  chatMessages,
  chatCanSend,
  chatDisabledReason,
  chatBusy,
  onSendChat
}: TabletopLayoutProps) {
  const eligibleNominees = useMemo(() => eligible.eligibleNomineeIds ?? [], [eligible.eligibleNomineeIds]);
  const eligibleExecutionTargets = useMemo(
    () => eligible.eligibleExecutiveTargets ?? [],
    [eligible.eligibleExecutiveTargets]
  );
  const eligibleInvestigateTargets = useMemo(
    () => eligible.eligibleInvestigateTargetIds ?? [],
    [eligible.eligibleInvestigateTargetIds]
  );
  const eligibleSpecialElectionSeats = useMemo(
    () => eligible.eligibleSpecialElectionSeatNumbers ?? [],
    [eligible.eligibleSpecialElectionSeatNumbers]
  );

  const [nomineeId, setNomineeId] = useState<string>(eligibleNominees[0] ?? "");
  const [executionTargetId, setExecutionTargetId] = useState<string>(eligibleExecutionTargets[0] ?? "");
  const [investigateTargetId, setInvestigateTargetId] = useState<string>(eligibleInvestigateTargets[0] ?? "");
  const [specialElectionSeat, setSpecialElectionSeat] = useState<number | undefined>(eligibleSpecialElectionSeats[0]);

  useEffect(() => {
    if (eligibleNominees.length === 0) {
      setNomineeId("");
      return;
    }

    if (!eligibleNominees.includes(nomineeId)) {
      setNomineeId(eligibleNominees[0]);
    }
  }, [eligibleNominees, nomineeId]);

  useEffect(() => {
    if (eligibleExecutionTargets.length === 0) {
      setExecutionTargetId("");
      return;
    }

    if (!eligibleExecutionTargets.includes(executionTargetId)) {
      setExecutionTargetId(eligibleExecutionTargets[0]);
    }
  }, [eligibleExecutionTargets, executionTargetId]);

  useEffect(() => {
    if (eligibleInvestigateTargets.length === 0) {
      setInvestigateTargetId("");
      return;
    }

    if (!eligibleInvestigateTargets.includes(investigateTargetId)) {
      setInvestigateTargetId(eligibleInvestigateTargets[0]);
    }
  }, [eligibleInvestigateTargets, investigateTargetId]);

  useEffect(() => {
    if (eligibleSpecialElectionSeats.length === 0) {
      setSpecialElectionSeat(undefined);
      return;
    }

    if (specialElectionSeat === undefined || !eligibleSpecialElectionSeats.includes(specialElectionSeat)) {
      setSpecialElectionSeat(eligibleSpecialElectionSeats[0]);
    }
  }, [eligibleSpecialElectionSeats, specialElectionSeat]);

  const game = room.game;

  const president = useMemo(
    () => room.players.find((player) => player.seat === game?.presidentSeat),
    [game?.presidentSeat, room.players]
  );

  const chancellor = useMemo(
    () => room.players.find((player) => player.seat === game?.chancellorSeat),
    [game?.chancellorSeat, room.players]
  );

  const actor = useMemo(() => room.players.find((player) => player.id === actorId), [actorId, room.players]);

  if (!game) {
    return (
      <div className="panel block">
        <h3>Game Not Started</h3>
        <p>Once the host starts the game from lobby, the tabletop room will activate.</p>
      </div>
    );
  }

  const showTopActionPanel =
    game.phase === "NOMINATION" ||
    game.phase === "VOTING" ||
    game.phase === "VOTE_REVEAL" ||
    game.phase === "LEGISLATIVE_PRESIDENT" ||
    game.phase === "LEGISLATIVE_CHANCELLOR" ||
    game.phase === "EXECUTIVE_ACTION";
  const teamClass = viewer?.team === "FASCIST" ? "fascist" : "liberal";
  const roleLabel = viewer
    ? viewer.role === "HITLER"
      ? "Hitler"
      : viewer.role === "FASCIST"
        ? "Fascist"
        : "Liberal"
    : undefined;

  const pendingPower = game.pendingExecutivePower?.power;
  const privateLegislativeHand = viewerPrivate?.legislativeHand ?? [];
  const privatePolicyPeekCards = viewerPrivate?.activePolicyPeekCards ?? [];

  return (
    <div className="tabletop">
      <div className="table-main">
        <div className="panel block room-header">
          <div>
            <h2 className="page-title" style={{ fontSize: "1.8rem" }}>
              Room {room.code}
            </h2>
            <p className="page-subtitle">
              Phase: {game.phase.replaceAll("_", " ")} | Size: {room.roomSize}
            </p>
          </div>
          <div className="table-status">
            <span className="room-pill">President: {president?.name ?? "-"}</span>
            <span className="room-pill">Chancellor: {chancellor?.name ?? "-"}</span>
            <span className="room-pill">Election Tracker: {game.electionTracker}/3</span>
            <span className="room-pill">You: {actor?.name ?? "Observer"}</span>
            {viewer ? (
              <span className={`team-pill ${teamClass}`}>
                Team: {viewer.team} ({roleLabel})
              </span>
            ) : null}
          </div>
        </div>

        <div className="panel table-surface">
          {game.phase === "GAME_OVER" ? (
            <WinnerBanner winner={game.winner} winReason={game.winReason} theme={theme} />
          ) : null}

          {showTopActionPanel ? (
            <div className="top-action-slot">
              {game.phase === "VOTE_REVEAL" && game.voteReveal ? (
                <VoteRevealBanner voteReveal={game.voteReveal} />
              ) : null}

              {game.phase === "NOMINATION" ? (
                <div>
                  <h4>Nomination</h4>
                  <p className="info-inline">President chooses an eligible chancellor candidate.</p>
                  <div className="inline-row" style={{ marginTop: 8 }}>
                    <select
                      value={nomineeId}
                      onChange={(event) => setNomineeId(event.target.value)}
                      disabled={!eligible.canNominate || busy}
                      style={{ minWidth: 220 }}
                    >
                      {eligible.eligibleNomineeIds.map((candidateId) => {
                        const player = room.players.find((candidate) => candidate.id === candidateId);
                        if (!player) {
                          return null;
                        }
                        return (
                          <option key={candidateId} value={candidateId}>
                            {player.name} (Seat {player.seat})
                          </option>
                        );
                      })}
                    </select>
                    <button
                      type="button"
                      className="button-primary"
                      onClick={() => nomineeId && onNominate(nomineeId)}
                      disabled={!eligible.canNominate || !nomineeId || busy}
                    >
                      Nominate
                    </button>
                    {!eligible.canNominate ? <span className="info-inline">Waiting for current president.</span> : null}
                  </div>
                </div>
              ) : null}

              {game.phase === "VOTING" ? (
                <VotePanel
                  totalPlayers={room.players.filter((player) => player.alive).length}
                  votesReceived={game.pendingVotesCount}
                  canVote={eligible.canVote}
                  hasVoted={eligible.hasVoted}
                  onVote={onVote}
                  disabled={busy}
                />
              ) : null}

              {game.phase === "LEGISLATIVE_PRESIDENT" || game.phase === "LEGISLATIVE_CHANCELLOR" ? (
                <div>
                  <LegislativePanel
                    phase={game.phase}
                    hand={privateLegislativeHand}
                    theme={theme}
                    canPresidentDiscard={eligible.canPresidentDiscard}
                    canChancellorDiscard={eligible.canChancellorDiscard}
                    onDiscard={game.phase === "LEGISLATIVE_PRESIDENT" ? onPresidentDiscard : onChancellorDiscard}
                    disabled={busy}
                  />
                  {privateLegislativeHand.length === 0 ? (
                    <p className="info-inline" style={{ marginTop: 8 }}>
                      Legislative cards are only visible to the acting president or chancellor.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {game.phase === "EXECUTIVE_ACTION" ? (
                <div className="executive-panel">
                  <h4>Executive Action</h4>
                  <p className="info-inline">
                    Pending power: <strong>{pendingPower ?? "UNKNOWN"}</strong>
                  </p>

                  {pendingPower === "EXECUTION" ? (
                    <div className="inline-row" style={{ marginTop: 8 }}>
                      <select
                        value={executionTargetId}
                        onChange={(event) => setExecutionTargetId(event.target.value)}
                        disabled={!eligible.canResolveExecutivePower || busy}
                        style={{ minWidth: 220 }}
                      >
                        {eligibleExecutionTargets.map((candidateId) => {
                          const player = room.players.find((candidate) => candidate.id === candidateId);
                          if (!player) {
                            return null;
                          }
                          return (
                            <option key={candidateId} value={candidateId}>
                              {player.name} (Seat {player.seat})
                            </option>
                          );
                        })}
                      </select>

                      <button
                        type="button"
                        className="button-danger"
                        onClick={() =>
                          executionTargetId && onResolveExecutivePower({ kind: "EXECUTION", targetId: executionTargetId })
                        }
                        disabled={!eligible.canResolveExecutivePower || !executionTargetId || busy}
                      >
                        Execute Target
                      </button>
                    </div>
                  ) : null}

                  {pendingPower === "INVESTIGATE_LOYALTY" ? (
                    <div className="inline-row" style={{ marginTop: 8 }}>
                      <select
                        value={investigateTargetId}
                        onChange={(event) => setInvestigateTargetId(event.target.value)}
                        disabled={!eligible.canResolveExecutivePower || busy}
                        style={{ minWidth: 220 }}
                      >
                        {eligibleInvestigateTargets.map((candidateId) => {
                          const player = room.players.find((candidate) => candidate.id === candidateId);
                          if (!player) {
                            return null;
                          }
                          return (
                            <option key={candidateId} value={candidateId}>
                              {player.name} (Seat {player.seat})
                            </option>
                          );
                        })}
                      </select>

                      <button
                        type="button"
                        className="button-primary"
                        onClick={() =>
                          investigateTargetId &&
                          onResolveExecutivePower({ kind: "INVESTIGATE_LOYALTY", targetId: investigateTargetId })
                        }
                        disabled={!eligible.canResolveExecutivePower || !investigateTargetId || busy}
                      >
                        Investigate
                      </button>
                    </div>
                  ) : null}

                  {pendingPower === "SPECIAL_ELECTION" ? (
                    <div className="inline-row" style={{ marginTop: 8 }}>
                      <select
                        value={specialElectionSeat ?? ""}
                        onChange={(event) => setSpecialElectionSeat(Number(event.target.value))}
                        disabled={!eligible.canResolveExecutivePower || busy}
                        style={{ minWidth: 220 }}
                      >
                        {eligibleSpecialElectionSeats.map((seat) => {
                          const player = room.players.find((candidate) => candidate.seat === seat);
                          if (!player) {
                            return null;
                          }
                          return (
                            <option key={seat} value={seat}>
                              {player.name} (Seat {seat})
                            </option>
                          );
                        })}
                      </select>

                      <button
                        type="button"
                        className="button-primary"
                        onClick={() =>
                          specialElectionSeat !== undefined &&
                          onResolveExecutivePower({ kind: "SPECIAL_ELECTION", presidentSeat: specialElectionSeat })
                        }
                        disabled={!eligible.canResolveExecutivePower || specialElectionSeat === undefined || busy}
                      >
                        Choose President
                      </button>
                    </div>
                  ) : null}

                  {pendingPower === "POLICY_PEEK" ? (
                    <div className="executive-peek" style={{ marginTop: 10 }}>
                      <div className="legislative-grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
                        {privatePolicyPeekCards.map((card, index) => (
                          <CardView key={`${card}-${index}`} theme={theme} kind={card} label={card} />
                        ))}
                      </div>

                      {privatePolicyPeekCards.length === 0 ? (
                        <p className="info-inline" style={{ marginTop: 8 }}>
                          Peeked cards are visible only to the acting president.
                        </p>
                      ) : null}

                      <div className="inline-row" style={{ marginTop: 8 }}>
                        <button
                          type="button"
                          className="button-primary"
                          onClick={() => onResolveExecutivePower({ kind: "POLICY_PEEK" })}
                          disabled={!eligible.canAcknowledgePolicyPeek || busy}
                        >
                          Acknowledge Peek
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {!eligible.canResolveExecutivePower && !eligible.canAcknowledgePolicyPeek ? (
                    <span className="info-inline" style={{ marginTop: 8, display: "block" }}>
                      Waiting for current president.
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="table-board-section">
            <PolicyBoard
              theme={theme}
              liberalEnacted={game.liberalEnacted}
              fascistEnacted={game.fascistEnacted}
              lastEnactedPolicy={game.lastEnactedPolicy}
              enactmentSequence={game.enactmentSequence}
            />
          </div>

          <div className="deck-strip table-deck-section">
            <div className="deck-card">
              <h5>Draw Deck</h5>
              <CardView theme={theme} kind="BACK" label="Deck" small />
              <p>{game.drawPileCount} cards remaining</p>
            </div>

            <div className="deck-card">
              <h5>Discard Pile</h5>
              <CardView theme={theme} kind="BACK" label="Discard" small />
              <p>{game.discardPileCount} cards in discard</p>
            </div>
          </div>

          <div className="table-seat-section">
            <SeatRing
              players={room.players}
              roomSize={room.roomSize}
              currentSeat={game.presidentSeat}
              deadOverlayImage={theme.deadPlayerOverlayImage}
              botColorImages={theme.botColorImages}
              revealedVotesByPlayerId={game.voteReveal?.votesByPlayerId}
            />
          </div>
        </div>
      </div>

      <aside className="side-rail">
        <FactionIntelPanel viewer={viewer} roomSize={room.roomSize} />
        <ChatPanel
          messages={chatMessages}
          canSend={chatCanSend}
          disabledReason={chatDisabledReason}
          busy={chatBusy}
          onSend={onSendChat}
        />
        <ExecutiveIntelPanel
          roomSize={room.roomSize}
          fascistEnacted={game.fascistEnacted}
          viewerPrivate={viewerPrivate}
          pendingPower={game.pendingExecutivePower?.power}
        />
      </aside>
    </div>
  );
}
