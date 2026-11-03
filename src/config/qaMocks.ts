// QA-only test data for PRO-4540 (top-right messages). This branch is never merged.
//
// ?qaMocks=all (default)  every group: outage, funds, targeted, hints, whatsNew
// ?qaMocks=whatsNew,hints  only the listed groups; add lateOutage to start the outage warning ~30 s after load,
//                          slow to delay the KLI flags by 4 s
// ?qaMocks=qqqSpy          only the QQQ and SPY listing announcement from 25 Aug 2026, live again
// ?qaMocks=none            real data only
// ?qaMocks=reset           forget every close of these messages, then all groups
// The choice is kept in localStorage, so reloads and in-app navigation keep it.

export type QaMock = "outage" | "lateOutage" | "funds" | "targeted" | "hints" | "whatsNew" | "slow" | "qqqSpy";

const STORAGE_KEY = "pro-4540-qa-mocks";
const ALL: QaMock[] = ["outage", "funds", "targeted", "hints", "whatsNew"];
const KNOWN: QaMock[] = [...ALL, "lateOutage", "slow", "qqqSpy"];

const DISMISSAL_KEY_PARTS = [
  "visited-announcements",
  "ui-flag-event-dismissed",
  "delisting-announcement-dismissed",
  "closing-pools-notice-seen",
  "closing-pools-lp-notice-dismissed",
  "usdg-pools-announcement-v2-dismissed",
  "balancer-program-announcement-dismissed",
];

export const QA_STARTED_AT = Date.now();
export const QA_ACCOUNT = "qa";

function forgetDismissals() {
  for (const key of Object.keys(localStorage)) {
    if (DISMISSAL_KEY_PARTS.some((part) => key.includes(part))) localStorage.removeItem(key);
  }
}

function readQaMocks(): Set<QaMock> {
  try {
    const param = new URLSearchParams(window.location.search).get("qaMocks");
    if (param === "reset") {
      forgetDismissals();
      localStorage.setItem(STORAGE_KEY, "all");
    } else if (param !== null) {
      localStorage.setItem(STORAGE_KEY, param);
    }
    const value = localStorage.getItem(STORAGE_KEY) ?? "all";
    if (value === "none") return new Set();
    const names = value.split(",").map((name) => name.trim());
    return new Set(
      names.includes("all")
        ? [...ALL, ...KNOWN.filter((m) => names.includes(m))]
        : KNOWN.filter((m) => names.includes(m))
    );
  } catch {
    return new Set();
  }
}

const QA_MOCKS = typeof window === "undefined" ? new Set<QaMock>() : readQaMocks();

export function isQaMockOn(mock: QaMock) {
  return QA_MOCKS.has(mock);
}
