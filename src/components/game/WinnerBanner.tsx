import Image from "next/image";
import type { ThemeManifest, WinReason, WinnerTeam } from "@/lib/game/types";

interface WinnerBannerProps {
  winner?: WinnerTeam;
  winReason?: WinReason;
  theme: ThemeManifest;
}

const WIN_REASON_LABEL: Record<WinReason, string> = {
  LIBERAL_POLICY: "Liberals passed 5 policies.",
  FASCIST_POLICY: "Fascists passed 6 policies.",
  HITLER_ELECTED_CHANCELLOR: "Hitler was elected Chancellor after 3+ Fascist policies.",
  HITLER_EXECUTED: "Hitler was executed."
};

export function WinnerBanner({ winner, winReason, theme }: WinnerBannerProps) {
  if (!winner || !winReason) {
    return null;
  }

  const imagePath = theme.winnerBannerByReason[winReason];

  return (
    <section className={`winner-banner winner-${winner.toLowerCase()}`} aria-live="polite">
      {imagePath ? (
        <div className="winner-image-wrap">
          <Image src={imagePath} alt={`${winner} victory banner`} className="winner-image" width={640} height={220} />
        </div>
      ) : null}
      <div className="winner-copy">
        <h3>{winner} Victory</h3>
        <p>{WIN_REASON_LABEL[winReason]}</p>
      </div>
    </section>
  );
}
