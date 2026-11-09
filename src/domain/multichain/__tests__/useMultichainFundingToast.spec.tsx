import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { render } from "@testing-library/react";
import { expect, it } from "vitest";

import { ARBITRUM, SOURCE_BASE_MAINNET } from "config/chains";
import { getMultichainFundingToastContent } from "domain/multichain/useMultichainFundingToast";
import { getTokenBySymbol } from "sdk/configs/tokens";

it("shows the amount and token on the only withdrawal row PRO-4570", () => {
  i18n.load("en", {});
  i18n.activate("en");

  const { container } = render(
    <I18nProvider i18n={i18n}>
      {getMultichainFundingToastContent({
        chainId: ARBITRUM,
        pendingItems: {
          guid: {
            id: "guid",
            operation: "withdrawal",
            step: "sent",
            settlementChainId: ARBITRUM,
            sourceChainId: SOURCE_BASE_MAINNET,
            account: "0x1111111111111111111111111111111111111111",
            token: getTokenBySymbol(ARBITRUM, "WETH").address,
            sentAmount: 5n * 10n ** 17n,
            receivedAmount: undefined,
            sentTxn: undefined,
            sentTimestamp: 0,
            receivedTxn: undefined,
            receivedTimestamp: undefined,
            isExecutionError: undefined,
            executedTxn: undefined,
            executedTimestamp: undefined,
          },
        },
        multichainFundingPendingIds: { staticId: "guid" },
      })}
    </I18nProvider>
  );

  expect(container.textContent?.replace(/\s+/g, " ")).toContain("Withdraw 0.50000 WETH");
});
