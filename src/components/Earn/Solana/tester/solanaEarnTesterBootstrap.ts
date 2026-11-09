// Tester for the Solana Earn design review: sample states, shown only outside gmx.io. Never merged.
// Opening any page with ?solanaEarnTester=1 switches this browser to the Solana network
// and opens the Solana Earn page with the Tester.
import { isDevelopment } from "config/env";

const PARAM = "solanaEarnTester";

function bootstrapSolanaEarnTester() {
  if (!isDevelopment() || typeof window === "undefined") return;

  const url = new URL(window.location.href);
  if (!url.searchParams.has(PARAM)) return;

  try {
    const abFlags = JSON.parse(window.localStorage.getItem("ab-flags") || "{}");
    abFlags.solanaNetwork = { enabled: true };
    window.localStorage.setItem("ab-flags", JSON.stringify(abFlags));
    window.localStorage.setItem("SELECTED_SOLANA_NETWORK", "true");

    const testerState = JSON.parse(window.localStorage.getItem("solana-earn-tester-state-v1") || "{}");
    window.localStorage.setItem(
      "solana-earn-tester-state-v1",
      JSON.stringify({ scenario: "typical", ...testerState, isCollapsed: false })
    );
  } catch {
    // Storage can be blocked; nothing to switch then.
  }

  url.searchParams.delete(PARAM);
  if (!url.pathname.startsWith("/earn")) url.pathname = "/earn/portfolio";
  // Reload so the app reads the Solana network on start.
  window.location.replace(url.toString());
}

bootstrapSolanaEarnTester();
