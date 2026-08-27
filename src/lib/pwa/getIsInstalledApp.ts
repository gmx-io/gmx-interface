type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

export function getIsInstalledApp() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((window.navigator as NavigatorWithStandalone).standalone)
  );
}
