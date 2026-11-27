import { getIsPwaInstallUiEnabled } from "./pwaPlatform";
import { setPwaState } from "./pwaStore";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;

// Only while GMX shows its own install entry: otherwise the browser keeps its own install banner.
if (typeof window !== "undefined" && getIsPwaInstallUiEnabled()) {
  // Chrome, Edge and Samsung Internet fire this when GMX can be installed. Keep it, so our button can open the dialog.
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    // Installed from this browser: its install card and menu item go for good.
    setPwaState({ hasInstalled: true });
  });
}

export function getCanOpenBrowserInstallDialog() {
  return deferredPrompt !== null;
}

/** Opens the browser's own install dialog. Resolves to "unavailable" when the browser hasn't offered one. */
export async function openBrowserInstallDialog(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!deferredPrompt) {
    return "unavailable";
  }

  const promptEvent = deferredPrompt;
  deferredPrompt = null;
  await promptEvent.prompt();
  const { outcome } = await promptEvent.userChoice;

  if (outcome === "accepted") {
    setPwaState({ hasInstalled: true });
  }

  return outcome;
}
