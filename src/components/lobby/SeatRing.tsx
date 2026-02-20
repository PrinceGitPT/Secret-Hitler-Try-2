import type { CSSProperties } from "react";
import type { BotColor, PublicPlayer, RoomSize } from "@/lib/game/types";

interface SeatRingProps {
  players: PublicPlayer[];
  roomSize: RoomSize;
  currentSeat?: number;
  deadOverlayImage?: string;
  botColorImages?: Partial<Record<BotColor, string>>;
}

function seatPosition(seat: number, roomSize: number): { x: number; y: number } {
  const angleDeg = ((seat - 1) / roomSize) * 360 - 90;
  const angleRad = (angleDeg * Math.PI) / 180;
  const radius = 41;

  return {
    x: 50 + Math.cos(angleRad) * radius,
    y: 50 + Math.sin(angleRad) * radius
  };
}

const BOT_COLOR_LABEL: Partial<Record<BotColor, string>> = {
  YELLOW: "Yellow",
  BLUE: "Blue",
  GREEN: "Green",
  ORANGE: "Orange",
  PURPLE: "Purple",
  TEAL: "Teal",
  RED: "Red",
  PINK: "Pink",
  BROWN: "Brown",
  GRAY: "Gray"
};

const BOT_COLOR_HEX: Partial<Record<BotColor, string>> = {
  YELLOW: "#f2cc33",
  BLUE: "#4d86ff",
  GREEN: "#46b36f",
  ORANGE: "#eb8f35",
  PURPLE: "#9d65d5",
  TEAL: "#34b5b5",
  RED: "#d84f4f",
  PINK: "#e472b3",
  BROWN: "#9a6849",
  GRAY: "#8f94a0"
};

type SeatStyle = CSSProperties & {
  "--seat-dead-overlay"?: string;
  "--seat-bot-image"?: string;
  "--seat-bot-color"?: string;
};

export function SeatRing({ players, roomSize, currentSeat, deadOverlayImage, botColorImages }: SeatRingProps) {
  const seats = Array.from({ length: roomSize }, (_, index) => index + 1);

  return (
    <div className="seat-ring" aria-label="Seat ring">
      {seats.map((seat) => {
        const player = players.find((candidate) => candidate.seat === seat);
        const position = seatPosition(seat, roomSize);
        const classNames = ["seat-node"];

        if (!player) {
          classNames.push("empty");
        }

        if (player && !player.alive) {
          classNames.push("dead");
        }

        if (player?.isBot) {
          classNames.push("bot");
        }

        if (seat === currentSeat) {
          classNames.push("current");
        }

        const seatStyle: SeatStyle = {
          left: `${position.x}%`,
          top: `${position.y}%`
        };

        if (player && !player.alive && deadOverlayImage) {
          seatStyle["--seat-dead-overlay"] = `url(${deadOverlayImage})`;
        }

        if (player?.isBot && player.botColor) {
          const botImage = botColorImages?.[player.botColor];
          seatStyle["--seat-bot-color"] = BOT_COLOR_HEX[player.botColor] ?? "#8f94a0";
          if (botImage) {
            seatStyle["--seat-bot-image"] = `url(${botImage})`;
          }
        }

        return (
          <div
            key={seat}
            className={classNames.join(" ")}
            style={seatStyle}
          >
            {player ? (
              <>
                {player.isBot ? <div className="seat-avatar" aria-hidden="true" /> : null}
                <strong>{player.name}</strong>
                <div className="meta">Seat {seat}</div>
                <div className="meta">
                  {player.isBot
                    ? `Bot${player.botColor ? ` • ${BOT_COLOR_LABEL[player.botColor] ?? player.botColor}` : ""}`
                    : "Human"}
                  {player.isHost ? " • Host" : ""}
                </div>
              </>
            ) : (
              <>
                <strong>Empty</strong>
                <div className="meta">Seat {seat}</div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
