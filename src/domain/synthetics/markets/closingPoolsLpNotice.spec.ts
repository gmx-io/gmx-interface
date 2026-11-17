import { i18n } from "@lingui/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ARBITRUM } from "config/chains";
import { MARKET_CLOSING_DATES } from "config/static/markets";
import type { TokenData, TokensData } from "domain/synthetics/tokens";
import { expandDecimals } from "lib/numbers";
import { getTokenBySymbol } from "sdk/configs/tokens";

import {
  getClosingPoolLpHoldings,
  getClosingPoolsLpNotice,
  getUndismissedClosingMarkets,
} from "./closingPoolsLpNotice";

i18n.load({ en: {} });
i18n.activate("en");

const NEAR = "0x63Dc80EE90F26363B3FCD609007CC9e14c8991BE";
const XRP = "0x0CCB4fAa6f1F1B30911619f1184082aB4E25813c";
const ZEC = "0x587759c237acCa739bCE3911647BacF56C876E60";
const HYPE = "0xBcb8FE13d02b023e8f94f6881Cc0192fd918A5C0";
const NEAR_USDG = "0x54bc430A788DFFD4ae35e751E10899489f5a953f";

function gmToken(address: string, walletUsd: number, gmxAccountUsd = 0): TokenData {
  const price = expandDecimals(1, 30);

  return {
    ...getTokenBySymbol(ARBITRUM, "GM"),
    address,
    prices: { minPrice: price, maxPrice: price },
    walletBalance: BigInt(Math.round(walletUsd * 100)) * 10n ** 16n,
    gmxAccountBalance: BigInt(Math.round(gmxAccountUsd * 100)) * 10n ** 16n,
  } as TokenData;
}

describe("closing pools LP notice", () => {
  const configured = MARKET_CLOSING_DATES[ARBITRUM];

  beforeEach(() => {
    MARKET_CLOSING_DATES[ARBITRUM] = { [NEAR]: 0, [XRP]: 0, [ZEC]: 0, [HYPE]: 0 };
  });

  afterEach(() => {
    MARKET_CLOSING_DATES[ARBITRUM] = configured;
  });

  it.each([
    {
      name: "wallet and GMX Account add up to $10K in one pool",
      tokens: [gmToken(NEAR, 6_000, 4_000)],
      dismissed: [],
      title: "Trading in your NEAR pool is moving to USDG pools",
    },
    { name: "under $10K", tokens: [gmToken(NEAR, 9_999.99)], dismissed: [], title: undefined },
    {
      name: "every pool under $10K, even with a larger total",
      tokens: [gmToken(NEAR, 6_000), gmToken(XRP, 5_000)],
      dismissed: [],
      title: undefined,
    },
    {
      name: "only pools with $10K or more are named",
      tokens: [gmToken(NEAR, 50_000), gmToken(HYPE, 0.5)],
      dismissed: [],
      title: "Trading in your NEAR pool is moving to USDG pools",
    },
    {
      name: "three pools are named in full, largest first",
      tokens: [gmToken(NEAR, 10_000), gmToken(XRP, 20_000), gmToken(ZEC, 30_000)],
      dismissed: [],
      title: "Trading in your ZEC, XRP and NEAR pools is moving to USDG pools",
    },
    {
      name: "GM of other pools does not count",
      tokens: [gmToken(NEAR, 5_000), gmToken(NEAR_USDG, 50_000)],
      dismissed: [],
      title: undefined,
    },
    {
      name: "a dismissed wave stays hidden",
      tokens: [gmToken(NEAR, 50_000), gmToken(XRP, 20_000)],
      dismissed: [NEAR, XRP, ZEC],
      title: undefined,
    },
    {
      name: "a pool of the next wave with $10K or more brings it back",
      tokens: [gmToken(NEAR, 50_000), gmToken(HYPE, 10_000)],
      dismissed: [NEAR, XRP, ZEC],
      title: "Trading in your NEAR and HYPE pools is moving to USDG pools",
    },
    {
      name: "a pool of the next wave under $10K does not bring it back",
      tokens: [gmToken(NEAR, 50_000), gmToken(HYPE, 9_999.99)],
      dismissed: [NEAR, XRP, ZEC],
      title: undefined,
    },
  ])("$name", ({ tokens, dismissed, title }) => {
    const tokensData: TokensData = Object.fromEntries(tokens.map((token) => [token.address, token]));
    const notice = getClosingPoolsLpNotice(
      getClosingPoolLpHoldings(ARBITRUM, tokensData),
      getUndismissedClosingMarkets(ARBITRUM, dismissed)
    );

    expect(notice?.title).toBe(title);
  });
});
