import { powerTrackByRoomSize } from "@/lib/game/powers/track";
import type { ExecutivePower, RoomSize, ViewerPrivateState } from "@/lib/game/types";

interface ExecutiveIntelPanelProps {
  roomSize: RoomSize;
  fascistEnacted: number;
  viewerPrivate?: ViewerPrivateState;
  pendingPower?: ExecutivePower;
}

export function ExecutiveIntelPanel({
  roomSize,
  fascistEnacted,
  viewerPrivate,
  pendingPower
}: ExecutiveIntelPanelProps) {
  const slots = powerTrackByRoomSize[roomSize];
  const intelLog = [...(viewerPrivate?.executiveIntelLog ?? [])].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="panel placeholder-box executive-intel-panel">
      <h4>Executive Intel</h4>
      <p>Power track for room size {roomSize}. Active slot unlocks as fascist policies are enacted.</p>

      <div className="power-track" aria-label="Power track">
        {slots.map((slot) => {
          const unlocked = fascistEnacted >= slot.fascistCount;
          const active = fascistEnacted === slot.fascistCount;
          const pending = pendingPower === slot.power && active;

          return (
            <div
              key={`${slot.fascistCount}-${slot.power}`}
              className={`power-slot ${unlocked ? "unlocked" : ""} ${active ? "active" : ""} ${pending ? "pending" : ""}`}
            >
              <strong>F{slot.fascistCount}</strong>
              <div>{slot.power}</div>
            </div>
          );
        })}
      </div>

      <h5 className="executive-log-title">Private Intel Log</h5>
      {!viewerPrivate ? (
        <p className="intel-note">Private executive intel appears after game start for your current actor.</p>
      ) : intelLog.length === 0 ? (
        <p className="intel-note">No private executive intel yet.</p>
      ) : (
        <ul className="executive-intel-log" aria-label="Private executive intel log">
          {intelLog.map((entry) => (
            <li key={entry.id} className="executive-intel-item">
              <div className="executive-intel-meta">{entry.power.replaceAll("_", " ")}</div>
              <p>{entry.summary}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
