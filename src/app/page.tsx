"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createRoomApi, joinRoomApi } from "@/lib/client/api";
import { setStoredPlayerId } from "@/lib/client/playerIdentity";
import { listThemes } from "@/lib/themes/manifest";

export default function HomePage() {
  const router = useRouter();
  const themes = useMemo(() => listThemes(), []);

  const [hostName, setHostName] = useState("Host");
  const [roomSize, setRoomSize] = useState(5);
  const [themeId, setThemeId] = useState(themes[0]?.id ?? "classic");

  const [joinCode, setJoinCode] = useState("");
  const [joinName, setJoinName] = useState("Guest");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const result = await createRoomApi({
        hostName,
        roomSize,
        themeId
      });

      const code = result.room.room.code;
      setStoredPlayerId(code, result.actorId);
      router.push(`/lobby/${code}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to create room.");
    } finally {
      setBusy(false);
    }
  }

  async function handleJoinRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const normalized = joinCode.trim().toUpperCase();
      const result = await joinRoomApi(normalized, { name: joinName });
      const code = result.room.room.code;
      setStoredPlayerId(code, result.actorId);
      router.push(`/lobby/${code}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to join room.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="app-shell">
      <div className="page-wrap">
        <h1 className="page-title">Secret Hitler MVP</h1>
        <p className="page-subtitle">
          Tabletop layout with lobby setup, bot autofill, voting flow, and policy enactment.
        </p>

        <section className="grid-two">
          <article className="panel block">
            <h2>Create Room</h2>
            <p>Create a new lobby, choose size 5-10, and pick board/card art theme.</p>

            <form className="form-col" onSubmit={handleCreateRoom}>
              <div className="form-row">
                <label htmlFor="host-name">Your Name</label>
                <input
                  id="host-name"
                  value={hostName}
                  onChange={(event) => setHostName(event.target.value)}
                  maxLength={24}
                  required
                />
              </div>

              <div className="form-row">
                <label htmlFor="room-size">Room Size</label>
                <select
                  id="room-size"
                  value={roomSize}
                  onChange={(event) => setRoomSize(Number(event.target.value))}
                  required
                >
                  {[5, 6, 7, 8, 9, 10].map((size) => (
                    <option key={size} value={size}>
                      {size} Players
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <label htmlFor="theme">Theme</label>
                <select
                  id="theme"
                  value={themeId}
                  onChange={(event) => setThemeId(event.target.value)}
                  required
                >
                  {themes.map((theme) => (
                    <option key={theme.id} value={theme.id}>
                      {theme.name}
                    </option>
                  ))}
                </select>
              </div>

              <button type="submit" className="button-primary" disabled={busy}>
                Create Lobby
              </button>
            </form>
          </article>

          <article className="panel block">
            <h2>Join Room</h2>
            <p>Join an existing lobby by room code, then proceed to tabletop lobby view.</p>

            <form className="form-col" onSubmit={handleJoinRoom}>
              <div className="form-row">
                <label htmlFor="join-code">Room Code</label>
                <input
                  id="join-code"
                  value={joinCode}
                  onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                  maxLength={6}
                  required
                />
              </div>

              <div className="form-row">
                <label htmlFor="join-name">Your Name</label>
                <input
                  id="join-name"
                  value={joinName}
                  onChange={(event) => setJoinName(event.target.value)}
                  maxLength={24}
                  required
                />
              </div>

              <button type="submit" className="button-neutral" disabled={busy}>
                Join Lobby
              </button>
            </form>
          </article>
        </section>

        {error ? <p className="error-text">{error}</p> : null}
      </div>
    </main>
  );
}
