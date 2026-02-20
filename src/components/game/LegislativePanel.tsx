"use client";

import { useMemo, useState } from "react";
import { CardView } from "@/components/game/CardView";
import type { Phase, Policy, ThemeManifest } from "@/lib/game/types";

interface LegislativePanelProps {
  phase: Phase;
  hand: Policy[];
  theme: ThemeManifest;
  canPresidentDiscard: boolean;
  canChancellorDiscard: boolean;
  onDiscard: (cardIndex: number) => void;
  disabled?: boolean;
}

export function LegislativePanel({
  phase,
  hand,
  theme,
  canPresidentDiscard,
  canChancellorDiscard,
  onDiscard,
  disabled
}: LegislativePanelProps) {
  const [selected, setSelected] = useState<number | null>(null);

  const isPresidentStep = phase === "LEGISLATIVE_PRESIDENT";
  const isChancellorStep = phase === "LEGISLATIVE_CHANCELLOR";
  const canInteract = (isPresidentStep && canPresidentDiscard) || (isChancellorStep && canChancellorDiscard);

  const title = useMemo(() => {
    if (isPresidentStep) {
      return "President: Discard one of three cards";
    }
    if (isChancellorStep) {
      return "Chancellor: Discard one of two cards";
    }
    return "Legislative Session";
  }, [isChancellorStep, isPresidentStep]);

  return (
    <div>
      <h4>{title}</h4>
      <div className={`legislative-grid ${hand.length === 2 ? "two" : ""}`}>
        {hand.map((card, index) => (
          <CardView
            key={`${card}-${index}`}
            theme={theme}
            kind={card}
            label={`${card} policy`}
            selected={selected === index}
            selectable={canInteract && !disabled}
            onClick={() => setSelected(index)}
          />
        ))}
      </div>
      <div className="inline-row" style={{ marginTop: 10 }}>
        <button
          type="button"
          className="button-neutral"
          disabled={!canInteract || selected === null || disabled}
          onClick={() => {
            if (selected !== null) {
              onDiscard(selected);
              setSelected(null);
            }
          }}
        >
          Discard Selected
        </button>
        {!canInteract ? <span className="info-inline">Waiting for active player.</span> : null}
      </div>
    </div>
  );
}
