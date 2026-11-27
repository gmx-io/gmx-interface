import { zeroAddress } from "viem";
import { describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import type { SyntheticsState } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { Mode, Operation } from "domain/synthetics/markets/types";
import type { RawCreateGlvDepositParams } from "domain/synthetics/markets/types";
import { getTokenBySymbol } from "sdk/configs/tokens";

import { selectPoolsDetailsIsMarketClosed } from "../poolsDetailsDerivedSelectors";
import { selectPoolsDetailsParams } from "../selectPoolsDetailsParams";

vi.mock("../selectDepositWithdrawalAmounts", () => ({
  selectDepositWithdrawalAmounts: () => ({ glvTokenAmount: 100n, marketTokenAmount: 200n }),
}));

const GLV_WETH_USDC = "0x528A5bac7E746C9A509A1f4F6dF58A03d44279F9";
const GM_ETH_USD = "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336";
const GM_DOGE_USD = "0x6853EA96FF216fAb11D2d930CE3C508556A4bdc4";
const GM_GOLD_USD = "0x0Df2BE76F517BCF0000AbfFcB6344B3b2aC4Cc4f";
const GM_BTC_USD = "0x47c031236e19d024b42f8AE6780E44A573170703";
const USDC = getTokenBySymbol(ARBITRUM, "USDC").address;

function makeState({
  firstTokenAddress,
  selectedMarketAddressForGlv,
  operation = Operation.Deposit,
  closedMarketAddress,
}: {
  firstTokenAddress: string;
  selectedMarketAddressForGlv: string;
  operation?: Operation;
  closedMarketAddress?: string;
}): SyntheticsState {
  return {
    globals: {
      chainId: ARBITRUM,
      closedMarkets: closedMarketAddress ? { [closedMarketAddress]: true } : {},
      srcChainId: undefined,
      account: "0x1111111111111111111111111111111111111111",
      marketsInfo: { marketsInfoData: {} },
      glvInfo: {
        glvData: {
          [GLV_WETH_USDC]: {
            isGlv: true,
            glvTokenAddress: GLV_WETH_USDC,
            longTokenAddress: getTokenBySymbol(ARBITRUM, "WETH").address,
            shortTokenAddress: USDC,
            glvToken: { address: GLV_WETH_USDC, decimals: 18, totalSupply: 10n ** 24n },
            marketAddresses: [GM_ETH_USD, GM_DOGE_USD, GM_GOLD_USD],
            markets: [{ address: GM_ETH_USD }, { address: GM_DOGE_USD, isDisabled: true, gmBalance: 0n }],
          },
        },
      },
    },
    poolsDetails: {
      glvOrMarketAddress: GLV_WETH_USDC,
      operation,
      mode: Mode.Single,
      paySource: "gmxAccount",
      firstTokenAddress,
      firstTokenInputValue: "100",
      marketOrGlvTokenInputValue: "60",
      selectedMarketAddressForGlv,
    },
  } as unknown as SyntheticsState;
}

describe("selectPoolsDetailsParams", () => {
  it("names the paid GM as the GLV deposit market after the Sell tab moved the pool selection PRO-4537", () => {
    const params = selectPoolsDetailsParams(
      makeState({ firstTokenAddress: GM_ETH_USD, selectedMarketAddressForGlv: GM_DOGE_USD })
    ) as RawCreateGlvDepositParams;

    expect(params.isMarketTokenDeposit).toBe(true);
    expect(params.addresses.market).toBe(GM_ETH_USD);
    expect(params.addresses.initialLongToken).toBe(zeroAddress);
    expect(params.addresses.initialShortToken).toBe(zeroAddress);
  });

  it("keeps the selected pool as the GLV deposit market when paying with a collateral token", () => {
    const params = selectPoolsDetailsParams(
      makeState({ firstTokenAddress: USDC, selectedMarketAddressForGlv: GM_DOGE_USD })
    ) as RawCreateGlvDepositParams;

    expect(params.minGlvTokens).toBe(99n);
    expect(params.isMarketTokenDeposit).toBe(false);
    expect(params.addresses.market).toBe(GM_DOGE_USD);
    expect(params.addresses.initialShortToken).toBe(USDC);
  });
});

describe("selectPoolsDetailsIsMarketClosed", () => {
  it.each([
    [Operation.Deposit, GM_ETH_USD],
    [Operation.Deposit, USDC],
    [Operation.Withdrawal, USDC],
  ] as const)("checks every GLV member for %s with payment token %s", (operation, firstTokenAddress) => {
    const params = { operation, firstTokenAddress, selectedMarketAddressForGlv: GM_ETH_USD };
    expect(selectPoolsDetailsIsMarketClosed(makeState({ ...params, closedMarketAddress: GM_GOLD_USD }))).toBe(true);
    expect(selectPoolsDetailsIsMarketClosed(makeState({ ...params, closedMarketAddress: GM_DOGE_USD }))).toBe(true);
    expect(selectPoolsDetailsIsMarketClosed(makeState({ ...params, closedMarketAddress: GM_BTC_USD }))).toBe(false);
    expect(selectPoolsDetailsIsMarketClosed(makeState(params))).toBe(false);
  });
});
