"use client";

import { useEffect, useState } from "react";
import { CardView } from "@/components/game/CardView";
import type { Policy, ThemeManifest } from "@/lib/game/types";

interface PolicyBoardProps {
  theme: ThemeManifest;
  liberalEnacted: number;
  fascistEnacted: number;
  lastEnactedPolicy?: Policy;
  enactmentSequence: number;
}

interface AnimatedSlot {
  track: "LIBERAL" | "FASCIST";
  index: number;
  sequence: number;
}

export function PolicyBoard({
  theme,
  liberalEnacted,
  fascistEnacted,
  lastEnactedPolicy,
  enactmentSequence
}: PolicyBoardProps) {
  const [animated, setAnimated] = useState<AnimatedSlot | null>(null);

  useEffect(() => {
    if (!lastEnactedPolicy || enactmentSequence <= 0) {
      return;
    }

    if (lastEnactedPolicy === "LIBERAL" && liberalEnacted > 0) {
      setAnimated({
        track: "LIBERAL",
        index: liberalEnacted - 1,
        sequence: enactmentSequence
      });
      return;
    }

    if (lastEnactedPolicy === "FASCIST" && fascistEnacted > 0) {
      setAnimated({
        track: "FASCIST",
        index: fascistEnacted - 1,
        sequence: enactmentSequence
      });
    }
  }, [enactmentSequence, fascistEnacted, lastEnactedPolicy, liberalEnacted]);

  return (
    <div className="board-wrapper">
      <div className="board-bg" style={{ backgroundImage: `url(${theme.boardImage})` }}>
        <div className="board-row">
          <h4>Liberal Policies (5 to win)</h4>
          <div className="policy-track liberal">
            {Array.from({ length: 5 }, (_, index) => {
              const filled = index < liberalEnacted;
              const shouldAnimate =
                animated?.track === "LIBERAL" && animated.index === index && animated.sequence === enactmentSequence;

              return (
                <div
                  key={`liberal-${index}`}
                  className={`policy-slot ${filled ? "filled" : ""} ${shouldAnimate ? "animating" : ""}`}
                >
                  {filled ? (
                    <CardView theme={theme} kind="LIBERAL" label="Liberal Policy" />
                  ) : (
                    <div className="center-note">Empty</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="board-row">
          <h4>Fascist Policies (6 to win)</h4>
          <div className="policy-track">
            {Array.from({ length: 6 }, (_, index) => {
              const filled = index < fascistEnacted;
              const shouldAnimate =
                animated?.track === "FASCIST" && animated.index === index && animated.sequence === enactmentSequence;

              return (
                <div
                  key={`fascist-${index}`}
                  className={`policy-slot ${filled ? "filled" : ""} ${shouldAnimate ? "animating" : ""}`}
                >
                  {filled ? (
                    <CardView theme={theme} kind="FASCIST" label="Fascist Policy" />
                  ) : (
                    <div className="center-note">Empty</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
