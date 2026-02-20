import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TabletopLayout } from "@/components/game/TabletopLayout";
import type { EligibleActions, Phase, PublicRoom, ThemeManifest } from "@/lib/game/types";

const theme: ThemeManifest = {
  id: "classic",
  name: "Classic Felt",
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
  }
};

function makeRoom(phase: Phase): PublicRoom {
  return {
    code: "ROOM1",
    roomSize: 5,
    themeId: "classic",
    players: [
      { id: "p1", name: "Host", isBot: false, seat: 1, connected: true, alive: true, isHost: true },
      { id: "p2", name: "Player 2", isBot: false, seat: 2, connected: true, alive: true, isHost: false },
      { id: "b1", name: "Yellow Bot", isBot: true, botColor: "YELLOW", seat: 3, connected: true, alive: true, isHost: false },
      { id: "b2", name: "Blue Bot", isBot: true, botColor: "BLUE", seat: 4, connected: true, alive: true, isHost: false },
      { id: "b3", name: "Green Bot", isBot: true, botColor: "GREEN", seat: 5, connected: true, alive: true, isHost: false }
    ],
    hostId: "p1",
    locked: true,
    game: {
      phase,
      presidentSeat: 1,
      chancellorSeat: 2,
      drawPile: ["LIBERAL", "FASCIST", "FASCIST"],
      discardPile: ["LIBERAL"],
      liberalEnacted: 1,
      fascistEnacted: 2,
      pendingVotes: {},
      legislativeHand: phase === "LEGISLATIVE_PRESIDENT" ? ["LIBERAL", "FASCIST", "FASCIST"] : undefined,
      enactmentSequence: 2
    },
    createdAt: 0,
    updatedAt: 0,
    version: 1
  };
}

function makeEligible(overrides?: Partial<EligibleActions>): EligibleActions {
  return {
    canStart: false,
    canUpdateConfig: false,
    canNominate: false,
    eligibleNomineeIds: [],
    canVote: false,
    hasVoted: false,
    canPresidentDiscard: false,
    canChancellorDiscard: false,
    ...overrides
  };
}

const chatProps = {
  chatMessages: [],
  chatCanSend: true,
  chatDisabledReason: undefined,
  chatBusy: false,
  onSendChat: vi.fn()
};

describe("tabletop layout", () => {
  it("renders nomination in the top election panel and hides bottom action bar", () => {
    const room = makeRoom("NOMINATION");
    const eligible = makeEligible({ canNominate: true, eligibleNomineeIds: ["p2"] });
    const { container } = render(
      <TabletopLayout
        room={room}
        theme={theme}
        eligible={eligible}
        actorId="p1"
        onNominate={vi.fn()}
        onVote={vi.fn()}
        onPresidentDiscard={vi.fn()}
        onChancellorDiscard={vi.fn()}
        {...chatProps}
      />
    );

    const topPanel = container.querySelector(".top-action-slot");
    expect(topPanel).toBeInTheDocument();
    expect(screen.getByText("Nomination")).toBeInTheDocument();
    expect(container.querySelector(".action-bar")).not.toBeInTheDocument();
  });

  it("renders vote in the top election panel", () => {
    const room = makeRoom("VOTING");
    room.game!.pendingVotes = { p1: "JA", p2: "NEIN" };
    const eligible = makeEligible({ canVote: true });
    const { container } = render(
      <TabletopLayout
        room={room}
        theme={theme}
        eligible={eligible}
        actorId="p2"
        onNominate={vi.fn()}
        onVote={vi.fn()}
        onPresidentDiscard={vi.fn()}
        onChancellorDiscard={vi.fn()}
        {...chatProps}
      />
    );

    const topPanel = container.querySelector(".top-action-slot");
    expect(topPanel).toBeInTheDocument();
    expect(screen.getByText("Vote")).toBeInTheDocument();
    expect(screen.getByText("Votes submitted: 2/5")).toBeInTheDocument();
    expect(container.querySelector(".action-bar")).not.toBeInTheDocument();
  });

  it("renders legislative controls in the top action panel", () => {
    const room = makeRoom("LEGISLATIVE_PRESIDENT");
    const eligible = makeEligible({ canPresidentDiscard: true });
    const { container } = render(
      <TabletopLayout
        room={room}
        theme={theme}
        eligible={eligible}
        actorId="p1"
        onNominate={vi.fn()}
        onVote={vi.fn()}
        onPresidentDiscard={vi.fn()}
        onChancellorDiscard={vi.fn()}
        {...chatProps}
      />
    );

    expect(container.querySelector(".top-action-slot")).toBeInTheDocument();
    expect(container.querySelector(".action-bar")).not.toBeInTheDocument();
    expect(screen.getByText("President: Discard one of three cards")).toBeInTheDocument();
  });

  it("renders the board above the seating ring", () => {
    const room = makeRoom("NOMINATION");
    const eligible = makeEligible({ canNominate: true, eligibleNomineeIds: ["p2"] });
    const { container } = render(
      <TabletopLayout
        room={room}
        theme={theme}
        eligible={eligible}
        actorId="p1"
        onNominate={vi.fn()}
        onVote={vi.fn()}
        onPresidentDiscard={vi.fn()}
        onChancellorDiscard={vi.fn()}
        {...chatProps}
      />
    );

    const board = container.querySelector(".board-wrapper");
    const seats = container.querySelector(".seat-ring");
    expect(board).toBeInTheDocument();
    expect(seats).toBeInTheDocument();
    expect(Boolean(board && seats && (board.compareDocumentPosition(seats) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
  });
});
