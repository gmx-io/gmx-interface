type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

export const INSTALLED_APP_ATTRIBUTE = "data-installed-app";
const VIEWPORT_FIT_COVER = "viewport-fit=cover";

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
  const isInstalledApp = getIsInstalledApp();
  const viewportMeta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');

  document.documentElement.toggleAttribute(INSTALLED_APP_ATTRIBUTE, isInstalledApp);

  if (!viewportMeta) {
    return;
  }

  const viewportOptions = viewportMeta.content
    .split(",")
    .map((option) => option.trim())
    .filter(Boolean)
    .filter((option) => option !== VIEWPORT_FIT_COVER);

  if (isInstalledApp) {
    viewportOptions.push(VIEWPORT_FIT_COVER);
  }

  viewportMeta.content = viewportOptions.join(", ");
}
