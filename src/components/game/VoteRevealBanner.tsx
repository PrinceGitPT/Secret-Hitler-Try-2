"use client";

import { useEffect, useMemo, useState } from "react";
import { isFailedElectionVisualActive } from "@/lib/game/voteReveal";
import type { VoteRevealState } from "@/lib/game/types";

interface VoteRevealBannerProps {
  voteReveal: VoteRevealState;
}

function countdownSeconds(endsAt: number, now: number): string {
  const remainingMs = Math.max(0, endsAt - now);
  return (remainingMs / 1000).toFixed(1);
}

export function VoteRevealBanner({ voteReveal }: VoteRevealBannerProps) {
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 100);

    return () => window.clearInterval(timer);
  }, []);

  const revealCountdown = useMemo(() => countdownSeconds(voteReveal.endsAt, now), [voteReveal.endsAt, now]);
  const showFailureVisual = isFailedElectionVisualActive(voteReveal, now);

  return (
    <div className="vote-reveal-banner" role="status" aria-live="polite">
      <h4>Votes Revealed</h4>
      <p className="info-inline">Next action in {revealCountdown}s</p>
      {voteReveal.outcome === "PASS" ? (
        <p className="vote-reveal-pass">Election passed. Starting legislative session when timer ends.</p>
      ) : null}
      {voteReveal.outcome === "FAIL" ? (
        <p className="vote-reveal-fail">Election failed. Government rejected.</p>
      ) : null}
      {showFailureVisual ? <p className="vote-reveal-fail-visual">Government Rejected</p> : null}
    </div>
  );
}
