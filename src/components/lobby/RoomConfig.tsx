"use client";

import type { RoomSize, ThemeManifest } from "@/lib/game/types";

interface RoomConfigProps {
  roomSize: RoomSize;
  themeId: string;
  themes: ThemeManifest[];
  disabled: boolean;
  onRoomSizeChange: (roomSize: RoomSize) => void;
  onThemeChange: (themeId: string) => void;
}

const roomSizes: RoomSize[] = [5, 6, 7, 8, 9, 10];

export function RoomConfig({
  roomSize,
  themeId,
  themes,
  disabled,
  onRoomSizeChange,
  onThemeChange
}: RoomConfigProps) {
  return (
    <div className="panel block">
      <h3>Room Configuration</h3>
      <p>Host controls game size and board/card art theme before starting.</p>

      <div className="form-col">
        <div className="form-row">
          <label>Room Size</label>
          <div className="chip-row">
            {roomSizes.map((size) => (
              <button
                key={size}
                type="button"
                className={`chip ${size === roomSize ? "active" : ""}`}
                onClick={() => onRoomSizeChange(size)}
                disabled={disabled}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        <div className="form-row">
          <label htmlFor="theme-select">Theme</label>
          <select
            id="theme-select"
            value={themeId}
            onChange={(event) => onThemeChange(event.target.value)}
            disabled={disabled}
          >
            {themes.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
