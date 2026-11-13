// Tester for the Solana Referrals design review: sample states, shown only outside gmx.io. Never merged.
// Opening any page with ?solanaReferralsTester=1 switches this browser to the Solana network
// and opens the Solana Referrals page with the Tester.
import { isDevelopment } from "config/env";

const PARAM = "solanaReferralsTester";
const STORAGE_KEY = "solana-referrals-tester-state-v1";

function bootstrapSolanaReferralsTester() {
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
      JSON.stringify({ scenario: "trader", ...testerState, isCollapsed: false })
    );
  } catch {
    // Storage can be blocked; nothing to switch then.
  }

  url.searchParams.delete(PARAM);
  if (!url.pathname.startsWith("/referrals")) url.pathname = "/referrals/traders";
  // Reload so the app reads the Solana network on start.
  window.location.replace(url.toString());
}

bootstrapSolanaReferralsTester();
