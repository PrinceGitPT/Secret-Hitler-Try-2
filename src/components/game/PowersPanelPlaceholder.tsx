import { powerTrackByRoomSize } from "@/lib/game/powers/track";
import type { RoomSize } from "@/lib/game/types";

interface PowersPanelPlaceholderProps {
  roomSize: RoomSize;
  fascistEnacted: number;
}

export function PowersPanelPlaceholder({ roomSize, fascistEnacted }: PowersPanelPlaceholderProps) {
  const slots = powerTrackByRoomSize[roomSize];

  return (
    <div className="panel placeholder-box">
      <h4>Executive Powers (Planned)</h4>
      <p>
        Track preview for room size {roomSize}. Power resolution is intentionally disabled in this MVP.
      </p>
      <div className="power-track">
        {slots.map((slot) => {
          const unlocked = fascistEnacted >= slot.fascistCount;
          const active = fascistEnacted === slot.fascistCount;

          return (
            <div
              key={`${slot.fascistCount}-${slot.power}`}
              className={`power-slot ${unlocked ? "unlocked" : ""} ${active ? "active" : ""}`}
            >
              <strong>F{slot.fascistCount}</strong>
              <div>{slot.power}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
