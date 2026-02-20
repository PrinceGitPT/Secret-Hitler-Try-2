"use client";

import { useEffect, useMemo, useState } from "react";
import { SeatRing } from "@/components/lobby/SeatRing";
import { CardView } from "@/components/game/CardView";
import { PolicyBoard } from "@/components/game/PolicyBoard";
import { VotePanel } from "@/components/game/VotePanel";
import { LegislativePanel } from "@/components/game/LegislativePanel";
import { FactionIntelPanel } from "@/components/game/FactionIntelPanel";
import { ChatPanel } from "@/components/game/ChatPanel";
import { PowersPanelPlaceholder } from "@/components/game/PowersPanelPlaceholder";
import type { PublicChatMessage } from "@/lib/chat/types";
import type { EligibleActions, PublicRoom, ThemeManifest, ViewerIdentity } from "@/lib/game/types";

interface TabletopLayoutProps {
  room: PublicRoom;
  theme: ThemeManifest;
  eligible: EligibleActions;
  actorId?: string;
  viewer?: ViewerIdentity;
  busy?: boolean;
  onNominate: (nomineeId: string) => void;
  onVote: (vote: "JA" | "NEIN") => void;
  onPresidentDiscard: (cardIndex: number) => void;
  onChancellorDiscard: (cardIndex: number) => void;
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
  busy,
  onNominate,
  onVote,
  onPresidentDiscard,
  onChancellorDiscard,
  chatMessages,
  chatCanSend,
  chatDisabledReason,
  chatBusy,
  onSendChat
}: TabletopLayoutProps) {
  const [nomineeId, setNomineeId] = useState<string>(eligible.eligibleNomineeIds[0] ?? "");

  useEffect(() => {
    if (eligible.eligibleNomineeIds.length === 0) {
      setNomineeId("");
      return;
    }

    if (!eligible.eligibleNomineeIds.includes(nomineeId)) {
      setNomineeId(eligible.eligibleNomineeIds[0]);
    }
  }, [eligible.eligibleNomineeIds, nomineeId]);

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

  const votesReceived = Object.keys(game.pendingVotes).length;
  const showTopActionPanel =
    game.phase === "NOMINATION" ||
    game.phase === "VOTING" ||
    game.phase === "LEGISLATIVE_PRESIDENT" ||
    game.phase === "LEGISLATIVE_CHANCELLOR";
  const teamClass = viewer?.team === "FASCIST" ? "fascist" : "liberal";
  const roleLabel = viewer
    ? viewer.role === "HITLER"
      ? "Hitler"
      : viewer.role === "FASCIST"
        ? "Fascist"
        : "Liberal"
    : undefined;

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
            <span className="room-pill">You: {actor?.name ?? "Observer"}</span>
            {viewer ? (
              <span className={`team-pill ${teamClass}`}>
                Team: {viewer.team} ({roleLabel})
              </span>
            ) : null}
          </div>
        </div>

        <div className="panel table-surface">
          {showTopActionPanel ? (
            <div className="top-action-slot">
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
                  totalPlayers={room.players.length}
                  votesReceived={votesReceived}
                  canVote={eligible.canVote}
                  hasVoted={eligible.hasVoted}
                  onVote={onVote}
                  disabled={busy}
                />
              ) : null}

              {game.phase === "LEGISLATIVE_PRESIDENT" || game.phase === "LEGISLATIVE_CHANCELLOR" ? (
                <LegislativePanel
                  phase={game.phase}
                  hand={game.legislativeHand ?? []}
                  theme={theme}
                  canPresidentDiscard={eligible.canPresidentDiscard}
                  canChancellorDiscard={eligible.canChancellorDiscard}
                  onDiscard={
                    game.phase === "LEGISLATIVE_PRESIDENT" ? onPresidentDiscard : onChancellorDiscard
                  }
                  disabled={busy}
                />
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
              <p>{game.drawPile.length} cards remaining</p>
            </div>

            <div className="deck-card">
              <h5>Discard Pile</h5>
              <CardView theme={theme} kind="BACK" label="Discard" small />
              <p>{game.discardPile.length} cards in discard</p>
            </div>
          </div>

          <div className="table-seat-section">
            <SeatRing
              players={room.players}
              roomSize={room.roomSize}
              currentSeat={game.presidentSeat}
              deadOverlayImage={theme.deadPlayerOverlayImage}
              botColorImages={theme.botColorImages}
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
        <PowersPanelPlaceholder roomSize={room.roomSize} fascistEnacted={game.fascistEnacted} />
      </aside>
    </div>
  );
}
