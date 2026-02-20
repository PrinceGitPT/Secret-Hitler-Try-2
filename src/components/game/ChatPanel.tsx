"use client";

import { useMemo, useState } from "react";
import { CHAT_MAX_LENGTH, type PublicChatMessage } from "@/lib/chat/types";

interface ChatPanelProps {
  messages: PublicChatMessage[];
  canSend: boolean;
  disabledReason?: string;
  busy?: boolean;
  onSend: (body: string) => void;
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function ChatPanel({ messages, canSend, disabledReason, busy, onSend }: ChatPanelProps) {
  const [draft, setDraft] = useState("");

  const trimmedLength = useMemo(() => draft.trim().length, [draft]);
  const canSubmit = canSend && !busy && trimmedLength > 0;

  return (
    <div className="panel chat-panel">
      <h4>Room Chat</h4>
      <div className="chat-list" role="log" aria-live="polite">
        {messages.length === 0 ? (
          <p className="chat-meta">No messages yet.</p>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="chat-message">
              <div className="chat-sender">
                <span>{message.senderName}</span>
                {message.senderIsBot ? <span className="chat-meta">Bot</span> : null}
              </div>
              <p>{message.body}</p>
              <div className="chat-meta">{formatTimestamp(message.createdAt)}</div>
            </div>
          ))
        )}
      </div>

      <div className="chat-input-row">
        <textarea
          rows={3}
          value={draft}
          maxLength={CHAT_MAX_LENGTH}
          disabled={!canSend || busy}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={canSend ? "Type a message..." : "Chat unavailable"}
        />
        <div className="inline-row">
          <span className="chat-meta">
            {trimmedLength}/{CHAT_MAX_LENGTH}
          </span>
          <button
            type="button"
            className="button-primary"
            disabled={!canSubmit}
            onClick={() => {
              const nextBody = draft.trim();
              if (!nextBody) {
                return;
              }
              onSend(nextBody);
              setDraft("");
            }}
          >
            Send
          </button>
        </div>
      </div>

      {!canSend && disabledReason ? <p className="chat-disabled-note">{disabledReason}</p> : null}
    </div>
  );
}
