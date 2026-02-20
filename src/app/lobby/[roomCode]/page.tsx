"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getRoomStateApi,
  joinRoomApi,
  startRoomApi,
  updateRoomConfigApi,
  type RoomStateResponse
} from "@/lib/client/api";
import { getStoredPlayerId, setStoredPlayerId } from "@/lib/client/playerIdentity";
import { RoomConfig } from "@/components/lobby/RoomConfig";
import { SeatRing } from "@/components/lobby/SeatRing";
import type { RoomSize } from "@/lib/game/types";

type LobbyRouteParams = Record<string, string | string[] | undefined> & {
  roomCode?: string | string[];
};

export default function LobbyPage() {
  const router = useRouter();
  const routeParams = useParams<LobbyRouteParams>();

  const [roomCode, setRoomCode] = useState<string>("");
  const [actorId, setActorId] = useState<string | undefined>(undefined);

  const [state, setState] = useState<RoomStateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joinName, setJoinName] = useState("Guest");
  const [busy, setBusy] = useState(false);

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

    const poll = async () => {
      try {
        const nextState = await getRoomStateApi(roomCode, actorId);
        if (cancelled) {
          return;
        }

        setState(nextState);
        setError(null);
        delay = 1500;

        if (nextState.room.locked && nextState.room.game && actorId) {
          router.replace(`/game/${roomCode}`);
          return;
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : "Failed to load lobby state.");
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
  }, [actorId, roomCode, router]);

  async function handleJoinFallback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!roomCode) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const result = await joinRoomApi(roomCode, { name: joinName });
      setStoredPlayerId(roomCode, result.actorId);
      setActorId(result.actorId);
      const latest = await getRoomStateApi(roomCode, result.actorId);
      setState(latest);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to join room.");
    } finally {
      setBusy(false);
    }
  }

  async function handleStartGame() {
    if (!roomCode || !actorId) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await startRoomApi(roomCode, actorId);
      router.push(`/game/${roomCode}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to start game.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRoomSizeChange(nextSize: RoomSize) {
    if (!roomCode || !actorId) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const projection = await updateRoomConfigApi({
        roomCode,
        actorId,
        roomSize: nextSize
      });

      setState((prev) =>
        prev
          ? {
              ...prev,
              room: projection.room,
              eligible: projection.eligible,
              actorId: projection.actorId
            }
          : prev
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to update room size.");
    } finally {
      setBusy(false);
    }
  }

  async function handleThemeChange(nextThemeId: string) {
    if (!roomCode || !actorId) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const projection = await updateRoomConfigApi({
        roomCode,
        actorId,
        themeId: nextThemeId
      });

      setState((prev) =>
        prev
          ? {
              ...prev,
              room: projection.room,
              eligible: projection.eligible,
              actorId: projection.actorId,
              theme: prev.themes.find((theme) => theme.id === projection.room.themeId) ?? prev.theme
            }
          : prev
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to update theme.");
    } finally {
      setBusy(false);
    }
  }

  const activeTheme = state ? state.theme ?? state.themes.find((theme) => theme.id === state.room.themeId) : undefined;

  return (
    <main className="app-shell">
      <div className="page-wrap">
        <div className="room-header panel block">
          <div>
            <h1 className="page-title" style={{ fontSize: "2rem" }}>
              Lobby {roomCode || "..."}
            </h1>
            <p className="page-subtitle">
              Configure room and players. Remaining seats are filled with random bots on start.
            </p>
          </div>
          <Link href="/" className="room-pill">
            Back to Home
          </Link>
        </div>

        {!actorId ? (
          <section className="panel block" style={{ marginTop: 16 }}>
            <h3>Join This Lobby</h3>
            <p>We could not find your local player identity for this room.</p>
            <form className="inline-row" onSubmit={handleJoinFallback}>
              <input
                value={joinName}
                onChange={(event) => setJoinName(event.target.value)}
                maxLength={24}
                required
                placeholder="Your Name"
                style={{ maxWidth: 280 }}
              />
              <button type="submit" className="button-primary" disabled={busy}>
                Join Room
              </button>
            </form>
          </section>
        ) : null}

        {state ? (
          <section className="grid-two" style={{ marginTop: 16 }}>
            <RoomConfig
              roomSize={state.room.roomSize}
              themeId={state.room.themeId}
              themes={state.themes}
              disabled={!state.eligible.canUpdateConfig || busy}
              onRoomSizeChange={handleRoomSizeChange}
              onThemeChange={handleThemeChange}
            />

            <div className="panel block">
              <h3>Players</h3>
              <p>
                Humans: {state.room.players.filter((player) => !player.isBot).length} | Current seats:
                {" "}
                {state.room.players.length}/{state.room.roomSize}
              </p>
              <SeatRing
                players={state.room.players}
                roomSize={state.room.roomSize}
                deadOverlayImage={activeTheme?.deadPlayerOverlayImage}
                botColorImages={activeTheme?.botColorImages}
              />

              <p className="center-note">Bots are auto-filled to room size when the host starts the game.</p>

              <div className="inline-row" style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="button-primary"
                  disabled={!state.eligible.canStart || busy}
                  onClick={handleStartGame}
                >
                  Start Game
                </button>
                {state.eligible.canStart ? (
                  <span className="info-inline">Only host can start.</span>
                ) : (
                  <span className="info-inline">Waiting for host to start the game.</span>
                )}
              </div>
            </div>
          </section>
        ) : (
          <section className="panel block" style={{ marginTop: 16 }}>
            <h3>Loading Lobby</h3>
            <p>Fetching room state...</p>
          </section>
        )}

        {error ? <p className="error-text">{error}</p> : null}
      </div>
    </main>
  );
}
