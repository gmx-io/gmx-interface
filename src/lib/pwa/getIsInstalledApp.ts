type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

export const INSTALLED_APP_ATTRIBUTE = "data-installed-app";

export function getIsInstalledApp() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((window.navigator as NavigatorWithStandalone).standalone)
  );
}

export function configureInstalledApp() {
  document.documentElement.toggleAttribute(INSTALLED_APP_ATTRIBUTE, getIsInstalledApp());
}
