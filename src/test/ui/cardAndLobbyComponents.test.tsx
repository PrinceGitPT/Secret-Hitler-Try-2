import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CardView } from "@/components/game/CardView";
import { PolicyBoard } from "@/components/game/PolicyBoard";
import { RoomConfig } from "@/components/lobby/RoomConfig";
import { SeatRing } from "@/components/lobby/SeatRing";
import type { ThemeManifest } from "@/lib/game/types";

const theme: ThemeManifest = {
  id: "classic",
  name: "Classic",
  boardImage: "/themes/classic/board.svg",
  liberalCardFace: "/themes/classic/liberal-card.svg",
  fascistCardFace: "/themes/classic/fascist-card.svg",
  cardBack: "/themes/classic/card-back.svg",
  deadPlayerOverlayImage: "/themes/classic/dead-overlay.svg",
  botColorImages: {
    YELLOW: "/themes/classic/bots/yellow.svg",
    BLUE: "/themes/classic/bots/blue.svg",
    GREEN: "/themes/classic/bots/green.svg",
    ORANGE: "/themes/classic/bots/orange.svg",
    PURPLE: "/themes/classic/bots/purple.svg",
    TEAL: "/themes/classic/bots/teal.svg",
    RED: "/themes/classic/bots/red.svg",
    PINK: "/themes/classic/bots/pink.svg",
    BROWN: "/themes/classic/bots/brown.svg",
    GRAY: "/themes/classic/bots/gray.svg"
  },
  winnerBannerByReason: {
    LIBERAL_POLICY: "/themes/classic/winner-liberal-policy.svg",
    FASCIST_POLICY: "/themes/classic/winner-fascist-policy.svg",
    HITLER_ELECTED_CHANCELLOR: "/themes/classic/winner-hitler-elected.svg",
    HITLER_EXECUTED: "/themes/classic/winner-hitler-executed.svg"
  }
};

describe("UI components", () => {
  it("binds card image from theme manifest", () => {
    render(<CardView theme={theme} kind="LIBERAL" label="Liberal Policy" />);
    const card = screen.getByRole("button", { name: "Liberal Policy" });

    expect(card).toHaveStyle({ backgroundImage: "url(/themes/classic/liberal-card.svg)" });
  });

  it("renders enacted board slots", () => {
    render(
      <PolicyBoard
        theme={theme}
        liberalEnacted={2}
        fascistEnacted={1}
        lastEnactedPolicy="FASCIST"
        enactmentSequence={1}
      />
    );

    const enactedCards = screen
      .getAllByRole("button")
      .filter((element) => (element.getAttribute("aria-label") ?? "").includes("Policy"));

    expect(enactedCards).toHaveLength(3);
    expect(screen.getByRole("button", { name: /Fascist Policy/i })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Liberal Policy/i })).toHaveLength(2);
  });

  it("fires lobby config callbacks", () => {
    const onRoomSizeChange = vi.fn();
    const onThemeChange = vi.fn();

    render(
      <RoomConfig
        roomSize={5}
        themeId="classic"
        themes={[theme]}
        disabled={false}
        onRoomSizeChange={onRoomSizeChange}
        onThemeChange={onThemeChange}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "7" }));
    fireEvent.change(screen.getByLabelText("Theme"), { target: { value: "classic" } });

    expect(onRoomSizeChange).toHaveBeenCalledWith(7);
    expect(onThemeChange).toHaveBeenCalledWith("classic");
  });

  it("renders dead seat style with theme overlay image", () => {
    render(
      <SeatRing
        roomSize={5}
        players={[
          {
            id: "p1",
            name: "Dead Player",
            isBot: false,
            seat: 1,
            connected: true,
            alive: false,
            isHost: true
          }
        ]}
        deadOverlayImage={theme.deadPlayerOverlayImage}
      />
    );

    const deadLabel = screen.getByText("Dead Player");
    const deadNode = deadLabel.closest(".seat-node");

    expect(deadNode).toHaveClass("dead");
    expect(deadNode).toHaveStyle({ "--seat-dead-overlay": "url(/themes/classic/dead-overlay.svg)" });
  });

  it("renders bot avatar image from theme bot color map", () => {
    render(
      <SeatRing
        roomSize={5}
        players={[
          {
            id: "b1",
            name: "Yellow Bot",
            isBot: true,
            botColor: "YELLOW",
            seat: 1,
            connected: true,
            alive: true,
            isHost: false
          }
        ]}
        botColorImages={theme.botColorImages}
      />
    );

    const botLabel = screen.getByText("Yellow Bot");
    const botNode = botLabel.closest(".seat-node");
    const botAvatar = botNode?.querySelector(".seat-avatar");

    expect(botNode).toHaveClass("bot");
    expect(botNode).toHaveStyle({ "--seat-bot-image": "url(/themes/classic/bots/yellow.svg)" });
    expect(botAvatar).toBeInTheDocument();
  });
});
