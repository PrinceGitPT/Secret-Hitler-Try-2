import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChatPanel } from "@/components/game/ChatPanel";
import type { PublicChatMessage } from "@/lib/chat/types";

const messages: PublicChatMessage[] = [
  {
    id: "m1",
    roomCode: "ABC123",
    senderId: "p1",
    senderName: "Alice",
    senderIsBot: false,
    body: "Hello table.",
    createdAt: 1000
  },
  {
    id: "m2",
    roomCode: "ABC123",
    senderId: "b1",
    senderName: "Yellow Bot",
    senderIsBot: true,
    body: "Votes reveal more than words.",
    createdAt: 2000
  }
];

describe("chat panel", () => {
  it("renders messages and bot badge", () => {
    render(
      <ChatPanel
        messages={messages}
        canSend
        onSend={vi.fn()}
      />
    );

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Hello table.")).toBeInTheDocument();
    expect(screen.getByText("Yellow Bot")).toBeInTheDocument();
    expect(screen.getByText("Bot")).toBeInTheDocument();
  });

  it("shows disabled reason when sending is blocked", () => {
    render(
      <ChatPanel
        messages={[]}
        canSend={false}
        disabledReason="Dead players cannot send messages."
        onSend={vi.fn()}
      />
    );

    expect(screen.getByText("Dead players cannot send messages.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });

  it("sends trimmed content", () => {
    const onSend = vi.fn();
    render(
      <ChatPanel
        messages={[]}
        canSend
        onSend={onSend}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("Type a message..."), {
      target: { value: "   hello world   " }
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(onSend).toHaveBeenCalledWith("hello world");
  });
});
