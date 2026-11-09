import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { ARBITRUM, SOURCE_BASE_MAINNET } from "config/chains";
import type { MultichainFundingHistoryItem } from "domain/multichain/types";
import { getMultichainFundingToastContent } from "domain/multichain/useMultichainFundingToast";
import { getTokenBySymbol } from "sdk/configs/tokens";

function makeItem(
  overrides: Pick<MultichainFundingHistoryItem, "operation" | "token" | "sentAmount">
): MultichainFundingHistoryItem {
  return {
    id: "guid",
    step: "sent",
    settlementChainId: ARBITRUM,
    sourceChainId: SOURCE_BASE_MAINNET,
    account: "0x1111111111111111111111111111111111111111",
    receivedAmount: undefined,
    sentTxn: undefined,
    sentTimestamp: 0,
    receivedTxn: undefined,
    receivedTimestamp: undefined,
    isExecutionError: undefined,
    executedTxn: undefined,
    executedTimestamp: undefined,
    ...overrides,
  };
}

describe("getMultichainFundingToastContent", () => {
  beforeAll(() => {
    i18n.load("en", {});
    i18n.activate("en");
  });

  afterEach(cleanup);

  it.each([
    [
      "withdrawal",
      makeItem({
        operation: "withdrawal",
        token: getTokenBySymbol(ARBITRUM, "WETH").address,
        sentAmount: 5n * 10n ** 17n,
      }),
      "Withdraw 0.50000 WETH",
    ],
    [
      "deposit",
      makeItem({ operation: "deposit", token: getTokenBySymbol(ARBITRUM, "USDC").address, sentAmount: 47_233_400n }),
      "Deposit 47.2334 USDC",
    ],
  ])("shows the amount and token on the only %s row PRO-4570", (_, item, expectedRow) => {
    const { container } = render(
      <I18nProvider i18n={i18n}>
        {getMultichainFundingToastContent({
          chainId: ARBITRUM,
          pendingItems: { guid: item },
          multichainFundingPendingIds: { staticId: "guid" },
        })}
      </I18nProvider>
    );

    expect(container.textContent?.replace(/\s+/g, " ")).toContain(expectedRow);
  });
});
