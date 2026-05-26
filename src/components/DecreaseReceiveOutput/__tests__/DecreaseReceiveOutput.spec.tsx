import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { TokenData } from "domain/synthetics/tokens";
import type { DecreaseReceiveOutput } from "domain/synthetics/trade";

import { DecreaseReceiveOutputDisplay } from "../DecreaseReceiveOutput";

const wethToken = {
  address: "0xweth",
  decimals: 18,
  symbol: "WETH",
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

describe("DecreaseReceiveOutputDisplay", () => {
  it("renders split outputs on separate rows in stacked layout", () => {
    const { container } = render(<DecreaseReceiveOutputDisplay outputs={outputs} layout="stacked" />);

    const root = container.firstElementChild;

    expect(root?.className).toContain("flex-col");
    expect(root?.children).toHaveLength(2);
    expect(root?.textContent).toContain("+");
  });
});
