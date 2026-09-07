const REANNOUNCE_DELAYS_MS = [0, 2000, 5000];

/**
 * In-app browsers (MetaMask iOS above all) can inject their provider after the app has already
 * scanned for wallets, leaving the injected wallet undiscovered. Re-dispatching
 * `eip6963:requestProvider` makes every EIP-6963 wallet announce itself again — announcements are
 * idempotent (stores dedupe by uuid), so extra requests are harmless. Fires immediately, on a few
 * short delays, and once more when the provider signals `ethereum#initialized`.
 */
export function watchInjectedProviderAnnouncements(browserWindow: Window = window): () => void {
  const requestAnnouncements = () => browserWindow.dispatchEvent(new Event("eip6963:requestProvider"));

  const timeoutIds = REANNOUNCE_DELAYS_MS.map((delay) => browserWindow.setTimeout(requestAnnouncements, delay));
  browserWindow.addEventListener("ethereum#initialized", requestAnnouncements);

  return () => {
    timeoutIds.forEach((timeoutId) => browserWindow.clearTimeout(timeoutId));
    browserWindow.removeEventListener("ethereum#initialized", requestAnnouncements);
  };
}
