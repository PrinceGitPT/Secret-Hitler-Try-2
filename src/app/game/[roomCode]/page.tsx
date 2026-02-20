"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { TabletopLayout } from "@/components/game/TabletopLayout";
import {
  getRoomChatApi,
  getRoomStateApi,
  postActionApi,
  postRoomChatApi,
  type RoomStateResponse
} from "@/lib/client/api";
import { getStoredPlayerId } from "@/lib/client/playerIdentity";
import type { ExecutiveResolution, GameAction, ThemeManifest } from "@/lib/game/types";
import type { PublicChatMessage } from "@/lib/chat/types";
import { listThemes } from "@/lib/themes/manifest";

type GameRouteParams = Record<string, string | string[] | undefined> & {
  roomCode?: string | string[];
};

export default function GamePage() {
  const router = useRouter();
  const routeParams = useParams<GameRouteParams>();
  const fallbackTheme = useMemo(() => listThemes()[0], []);

  const [roomCode, setRoomCode] = useState<string>("");
  const [actorId, setActorId] = useState<string | undefined>(undefined);

  const [state, setState] = useState<RoomStateResponse | null>(null);
  const [chatMessages, setChatMessages] = useState<PublicChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const rawCode = Array.isArray(routeParams.roomCode) ? routeParams.roomCode[0] : routeParams.roomCode;
    if (!rawCode) {
      return;
    }

    const normalized = rawCode.toUpperCase();
    setRoomCode(normalized);
    setActorId(getStoredPlayerId(normalized));
  }, [routeParams.roomCode]);

  useEffect(() => {
    if (!roomCode) {
      return;
    }

    let cancelled = false;
    let timerId = 0;
    let delay = 1500;
    let canPollChat = false;

    const poll = async () => {
      try {
        const shouldPollChat = Boolean(actorId && canPollChat);
        const [nextState, nextChat] = await Promise.all([
          getRoomStateApi(roomCode, actorId),
          shouldPollChat ? getRoomChatApi(roomCode, actorId!) : Promise.resolve({ messages: [] })
        ]);
        if (cancelled) {
          return;
        }

        setState(nextState);
        setError(null);
        delay = 1500;

        if (actorId && nextState.room.game) {
          canPollChat = true;
          if (shouldPollChat) {
            setChatMessages(nextChat.messages);
          } else {
            const bootstrapChat = await getRoomChatApi(roomCode, actorId);
            if (!cancelled) {
              setChatMessages(bootstrapChat.messages);
            }
          }
        } else {
          canPollChat = false;
          setChatMessages([]);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : "Failed to load game state.");
          delay = Math.min(delay * 2, 8000);
        }
      }

      if (!cancelled) {
        timerId = window.setTimeout(poll, delay);
      }
    };

    void poll();

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [actorId, roomCode]);

  async function submitAction(action: GameAction) {
    if (!roomCode) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await postActionApi(roomCode, action);
      const refreshed = await getRoomStateApi(roomCode, actorId);
      setState(refreshed);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to submit action.");
    } finally {
      setBusy(false);
    }
  }

  async function submitChat(body: string) {
    if (!roomCode || !actorId) {
      return;
    }

    setChatBusy(true);
    setError(null);

    try {
      const result = await postRoomChatApi(roomCode, {
        actorId,
        body
      });
      setChatMessages((previous) => [...previous, result.message].slice(-100));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to send chat message.");
    } finally {
      setChatBusy(false);
    }
  }

  const theme: ThemeManifest | undefined =
    state?.theme ?? state?.themes.find((candidate) => candidate.id === state.room.themeId) ?? fallbackTheme;

  const room = state?.room;
  const actor = room?.players.find((player) => player.id === actorId);
  const chatCanSend = Boolean(actorId && room?.game && actor && actor.alive);
  const chatDisabledReason = !actorId
    ? "No local player identity."
    : !room?.game
      ? "Chat unlocks after game start."
      : !actor
        ? "You are not in this room."
        : !actor.alive
          ? "Dead players cannot send messages."
          : undefined;

  return (
    <main className="app-shell">
      <div className="page-wrap">
        <div className="room-header panel block">
          <div>
            <h1 className="page-title" style={{ fontSize: "2rem" }}>
              Game Room {roomCode || "..."}
            </h1>
            <p className="page-subtitle">
              Vote and policy draw flow MVP with live room chat. Executive powers remain placeholder-only.
            </p>
          </div>
          <div className="inline-row">
            <Link href={`/lobby/${roomCode}`} className="room-pill">
              Lobby
            </Link>
            <Link href="/" className="room-pill">
              Home
            </Link>
          </div>
        </div>

        {!actorId ? (
          <section className="panel block" style={{ marginTop: 16 }}>
            <h3>No Local Player Identity</h3>
            <p>Join this room from home or lobby first so actions can be attributed to your player.</p>
          </section>
        ) : null}

        {room && room.game && theme ? (
          <TabletopLayout
            room={room}
            theme={theme}
            eligible={state!.eligible}
            actorId={actorId}
            viewer={state?.viewer}
            busy={busy}
            onNominate={(nomineeId) => {
              if (!actorId) {
                return;
              }

              void submitAction({
                type: "NOMINATE_CHANCELLOR",
                actorId,
                nomineeId
              });
            }}
            onVote={(vote) => {
              if (!actorId) {
                return;
              }

              void submitAction({
                type: "CAST_VOTE",
                actorId,
                vote
              });
            }}
            onPresidentDiscard={(cardIndex) => {
              if (!actorId) {
                return;
              }

              void submitAction({
                type: "LEGISLATIVE_DISCARD",
                actorId,
                cardIndex: cardIndex as 0 | 1 | 2
              });
            }}
            onChancellorDiscard={(cardIndex) => {
              if (!actorId) {
                return;
              }

              void submitAction({
                type: "CHANCELLOR_DISCARD",
                actorId,
                cardIndex: cardIndex as 0 | 1
              });
            }}
            onResolveExecutivePower={(resolution: ExecutiveResolution) => {
              if (!actorId) {
                return;
              }

              void submitAction({
                type: "RESOLVE_EXECUTIVE_POWER",
                actorId,
                resolution
              });
            }}
            chatMessages={chatMessages}
            chatCanSend={chatCanSend}
            chatDisabledReason={chatDisabledReason}
            chatBusy={chatBusy}
            onSendChat={(body) => {
              void submitChat(body);
            }}
          />
        ) : (
          <section className="panel block" style={{ marginTop: 16 }}>
            <h3>{room ? "Game Not Started" : "Loading Game"}</h3>
            <p>{room ? "Wait for host to start the game from lobby." : "Fetching game state..."}</p>
            {room && !room.game ? (
              <button type="button" className="button-primary" onClick={() => router.push(`/lobby/${roomCode}`)}>
                Return to Lobby
              </button>
            ) : null}
          </section>
        )}

        {error ? <p className="error-text">{error}</p> : null}
      </div>
    </main>
  );
}
