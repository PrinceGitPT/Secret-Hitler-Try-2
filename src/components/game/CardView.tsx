"use client";

import type { Policy, ThemeManifest } from "@/lib/game/types";

type CardKind = Policy | "BACK";

interface CardViewProps {
  theme: ThemeManifest;
  kind: CardKind;
  label?: string;
  small?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onClick?: () => void;
}

function resolveImage(theme: ThemeManifest, kind: CardKind): string {
  if (kind === "BACK") {
    return theme.cardBack;
  }

  if (kind === "LIBERAL") {
    return theme.liberalCardFace;
  }

  return theme.fascistCardFace;
}

export function CardView({ theme, kind, label, small, selectable, selected, onClick }: CardViewProps) {
  const classes = ["card-view"];

  if (small) {
    classes.push("small");
  }

  if (selectable) {
    classes.push("selectable");
  }

  if (selected) {
    classes.push("selected");
  }

  return (
    <button
      type="button"
      className={classes.join(" ")}
      style={{ backgroundImage: `url(${resolveImage(theme, kind)})` }}
      onClick={onClick}
      disabled={!selectable}
      aria-label={label ?? kind}
    >
      {label ?? kind}
    </button>
  );
}
