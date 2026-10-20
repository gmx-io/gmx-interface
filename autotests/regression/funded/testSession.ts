import { USD, type FeeProfile } from "./economy";
import { marketAddress } from "./fundedQuote";
import type { FundedJournal } from "./journal";
import { FundedSession } from "./session";

export function testSession(profile?: FeeProfile) {
  const previous = process.env.REGRESSION_PRIVATE_KEY;
  // Public test key, never loaded from the user's env file.
  process.env.REGRESSION_PRIVATE_KEY = `0x${"1".repeat(64)}`;
  try {
    return new FundedSession(profile);
  } finally {
    if (previous === undefined) delete process.env.REGRESSION_PRIVATE_KEY;
    else process.env.REGRESSION_PRIVATE_KEY = previous;
  }
}

export function testJournal(address: string, overrides: Partial<FundedJournal> = {}): FundedJournal {
  return {
    version: 1,
    id: "run",
    chainId: 42161,
    address,
    createdAt: new Date().toISOString(),
    initialNativeUsd: (50n * USD).toString(),
    initialStableUsd: (50n * USD).toString(),
    targetNativeBps: "5000",
    marketAddress,
    ownedPositionKeys: [],
    ownedOrderKeys: [],
    actions: [],
    completed: false,
    ...overrides,
  };
}
