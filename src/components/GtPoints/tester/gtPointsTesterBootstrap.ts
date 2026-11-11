// Tester for the GT Points design review: sample states, shown only outside gmx.io. Never merged.
// Opening any page with ?gtPointsTester=1 switches this browser to the Solana network
// and opens the GT Points page with the Tester.
import { isDevelopment } from "config/env";

const PARAM = "gtPointsTester";
const STORAGE_KEY = "gt-points-tester-state-v1";

function bootstrapGtPointsTester() {
  if (!isDevelopment() || typeof window === "undefined") return;

  const url = new URL(window.location.href);
  if (!url.searchParams.has(PARAM)) return;

  try {
    const abFlags = JSON.parse(window.localStorage.getItem("ab-flags") || "{}");
    abFlags.solanaNetwork = { enabled: true };
    window.localStorage.setItem("ab-flags", JSON.stringify(abFlags));
    window.localStorage.setItem("SELECTED_SOLANA_NETWORK", "true");

    const testerState = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ scenario: "typical", ...testerState, isCollapsed: false })
    );
  } catch {
    // Storage can be blocked; nothing to switch then.
  }

  url.searchParams.delete(PARAM);
  if (!url.pathname.startsWith("/gt-points")) url.pathname = "/gt-points/my";
  // Reload so the app reads the Solana network on start.
  window.location.replace(url.toString());
}

bootstrapGtPointsTester();
