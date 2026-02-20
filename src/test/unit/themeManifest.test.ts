import { describe, expect, it } from "vitest";
import { listThemes } from "@/lib/themes/manifest";

describe("theme manifest", () => {
  it("defines dead player overlay image for every theme", () => {
    const themes = listThemes();

    expect(themes.length).toBeGreaterThan(0);

    for (const theme of themes) {
      expect(theme.deadPlayerOverlayImage).toBeTruthy();
      expect(theme.deadPlayerOverlayImage.startsWith("/themes/")).toBe(true);
      expect(Object.keys(theme.botColorImages)).toHaveLength(10);
      for (const image of Object.values(theme.botColorImages)) {
        expect(image.startsWith("/themes/")).toBe(true);
      }

      expect(Object.keys(theme.winnerBannerByReason).sort()).toEqual(
        ["FASCIST_POLICY", "HITLER_ELECTED_CHANCELLOR", "HITLER_EXECUTED", "LIBERAL_POLICY"].sort()
      );
      for (const image of Object.values(theme.winnerBannerByReason)) {
        expect(image.startsWith("/themes/")).toBe(true);
      }
    }
  });
});
