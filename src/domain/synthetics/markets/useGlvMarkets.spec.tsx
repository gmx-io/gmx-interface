import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import { GLV_MARKETS } from "config/markets";
import { ETH_ADDRESS, ETH_TOKEN, USDC_ADDRESS, USDC_TOKEN } from "domain/testUtils/mockTokens";
import { useMulticall } from "lib/multicall";
import { getTokenBySymbol } from "sdk/configs/tokens";

import { type GlvList, useGlvMarketsInfo } from "./useGlvMarkets";
import type { TokensData } from "../tokens/types";

vi.mock("lib/multicall", () => ({ useMulticall: vi.fn(), executeMulticall: vi.fn() }));
vi.mock("context/TokensBalancesContext/TokensBalancesContextProvider", () => ({
  useTokensBalancesUpdates: () => ({ websocketTokenBalancesUpdates: {}, resetTokensBalancesUpdates: vi.fn() }),
}));
vi.mock("../tokens/useTokenRecentPricesData", () => ({ useTokenRecentPricesRequest: () => ({}) }));

const ETH_GLV = "0x528A5bac7E746C9A509A1f4F6dF58A03d44279F9";
const USDG_GLV = "0x4Cd5A94a30876320ac65F2e192493EE476f13866";
const USDG_TOKEN = { ...getTokenBySymbol(ARBITRUM, "USDG"), prices: USDC_TOKEN.prices };
const emptyTokens: TokensData = {};
const tokensWithoutUsdg = { [ETH_ADDRESS]: ETH_TOKEN, [USDC_ADDRESS]: USDC_TOKEN };
const tokensWithUsdg = { ...tokensWithoutUsdg, [USDG_TOKEN.address]: USDG_TOKEN };

const glvs: GlvList = [ETH_GLV, USDG_GLV].map((address) => {
  const config = GLV_MARKETS[ARBITRUM][address];

  return {
    glv: { glvToken: address, longToken: config.longTokenAddress, shortToken: config.shortTokenAddress },
    markets: [],
  };
});

function mockGlvResponse(address: string) {
  return {
    [address + "-prices"]: {
      glvTokenPriceMax: { returnValues: [10n ** 30n, 0n, 10n ** 18n] },
      glvTokenPriceMin: { returnValues: [10n ** 30n, 0n, 10n ** 18n] },
    },
    [address + "-glvValue"]: {
      glvValueMax: { returnValues: [10n ** 30n] },
      glvValueMin: { returnValues: [10n ** 30n] },
    },
    [address + "-tokenData"]: { symbol: { returnValues: ["GLV"] } },
    [address + "-info"]: {
      glvShiftLastExecutedAt: { returnValues: [0n] },
      glvShiftMinInterval: { returnValues: [0n] },
    },
  };
}

let rawData: ReturnType<typeof mockGlvResponse>;
let result: ReturnType<typeof useGlvMarketsInfo>;

function TestComponent({ tokensData }: { tokensData: TokensData }) {
  result = useGlvMarketsInfo(true, {
    chainId: ARBITRUM,
    marketsInfoData: {},
    tokensData,
    account: undefined,
    srcChainId: undefined,
  });

  return null;
}

describe("useGlvMarketsInfo", () => {
  beforeEach(() => {
    rawData = mockGlvResponse(ETH_GLV);
    vi.mocked(useMulticall).mockImplementation(((_chainId: number, name: string) => ({
      data: name === "useGlvTokenMarkets" ? glvs : rawData,
      isLoading: false,
      error: undefined,
      mutate: vi.fn(),
    })) as typeof useMulticall);
  });

  afterEach(() => {
    cleanup();
    vi.mocked(useMulticall).mockReset();
  });

  it("keeps other vaults available and restores USDG after its missing data arrives", () => {
    const { rerender } = render(<TestComponent tokensData={tokensWithoutUsdg} />);

    expect(Object.keys(result.glvData!)).toEqual([ETH_GLV]);
    expect(result.glvData![ETH_GLV].glvToken.prices).toEqual(USDC_TOKEN.prices);

    rerender(<TestComponent tokensData={tokensWithUsdg} />);

    expect(Object.keys(result.glvData!)).toEqual([ETH_GLV]);

    rawData = { ...rawData, ...mockGlvResponse(USDG_GLV) };
    rerender(<TestComponent tokensData={tokensWithUsdg} />);

    expect(Object.keys(result.glvData!)).toEqual([ETH_GLV, USDG_GLV]);
    expect(result.glvData![USDG_GLV].longToken).toEqual(USDG_TOKEN);
    expect(result.glvData![USDG_GLV].glvToken.prices).toEqual(USDC_TOKEN.prices);
  });

  it("returns no vaults when all vaults were omitted from the multicall", () => {
    rawData = {};
    render(<TestComponent tokensData={emptyTokens} />);

    expect(result.glvData).toEqual({});
  });
});
