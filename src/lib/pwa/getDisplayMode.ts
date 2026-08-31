type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

export type DisplayMode = "browser" | "standalone";

export function getDisplayMode(): DisplayMode {
  if (typeof window === "undefined") {
    return "browser";
  }

  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((window.navigator as NavigatorWithStandalone).standalone);

  return isStandalone ? "standalone" : "browser";
}
