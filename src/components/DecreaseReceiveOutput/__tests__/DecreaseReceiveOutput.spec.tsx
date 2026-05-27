import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { TokenData } from "domain/synthetics/tokens";
import type { DecreaseReceiveOutput } from "domain/synthetics/trade";

import { DecreaseReceiveOutputDisplay, SplitReceiveTokensLabel } from "../DecreaseReceiveOutput";

const wethToken = {
  address: "0xweth",
  decimals: 18,
  symbol: "WETH",
  isStable: false,
} as TokenData;

const wbtcToken = {
  address: "0xwbtc",
  decimals: 8,
  symbol: "WBTC.e",
  isStable: false,
} as TokenData;

const usdcToken = {
  address: "0xusdc",
  decimals: 6,
  symbol: "USDC",
  isStable: true,
} as TokenData;

const outputs: DecreaseReceiveOutput[] = [
  {
    type: "primary",
    token: wethToken,
    amount: 1000000000000000000n,
    usd: 2000000000000000000000000000000000n,
  },
  {
    type: "secondary",
    token: usdcToken,
    amount: 1000000000n,
    usd: 1000000000000000000000000000000000n,
  },
];

afterEach(cleanup);

i18n.load("en", {});
i18n.activate("en");

describe("DecreaseReceiveOutputDisplay", () => {
  it("renders split outputs on separate rows in stacked layout", () => {
    const { container } = render(<DecreaseReceiveOutputDisplay outputs={outputs} layout="stacked" />);

    const root = container.firstElementChild;

    expect(root?.className).toContain("flex-col");
    expect(root?.children).toHaveLength(2);
    expect(root?.textContent).toContain("+");
  });

  it("renders normalized split receive token symbols", () => {
    const { container } = render(
      <I18nProvider i18n={i18n}>
        <SplitReceiveTokensLabel profitToken={wbtcToken} collateralToken={wethToken} />
      </I18nProvider>
    );

    expect(container.textContent).toContain("Receive BTC and ETH separately");
  });
});
