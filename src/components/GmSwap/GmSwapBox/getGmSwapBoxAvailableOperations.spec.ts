import { describe, expect, it } from "vitest";

import { GlvInfo, MarketInfo, Operation } from "domain/synthetics/markets/types";

import { getGmSwapBoxAvailableOperations } from "./getGmSwapBoxAvailableOperations";

const BTC_USDC_MARKET = { marketTokenAddress: "0x47c031236e19d024b42f8AE6780E44A573170703" } as MarketInfo;
const SWAP_ONLY_MARKET = { marketTokenAddress: "0x9C2433dFD71096C435Be9465220BB2B189375eA7" } as MarketInfo;
const GLV = { isGlv: true, glvTokenAddress: "0x528A5bac7E746C9A509A1f4F6dF58A03d44279F9" } as unknown as GlvInfo;

describe("getGmSwapBoxAvailableOperations", () => {
  it("returns deposit and withdrawal when there are no shift-available markets", () => {
    expect(
      getGmSwapBoxAvailableOperations({
        shiftAvailableMarkets: [],
        selectedGlvOrMarketAddress: BTC_USDC_MARKET.marketTokenAddress,
      })
    ).toEqual([Operation.Deposit, Operation.Withdrawal]);
  });

  it("returns deposit and withdrawal when the selected market is not shift-available", () => {
    expect(
      getGmSwapBoxAvailableOperations({
        shiftAvailableMarkets: [BTC_USDC_MARKET],
        selectedGlvOrMarketAddress: SWAP_ONLY_MARKET.marketTokenAddress,
      })
    ).toEqual([Operation.Deposit, Operation.Withdrawal]);
  });

  it("returns deposit and withdrawal when no market is selected", () => {
    expect(
      getGmSwapBoxAvailableOperations({
        shiftAvailableMarkets: [BTC_USDC_MARKET],
        selectedGlvOrMarketAddress: undefined,
      })
    ).toEqual([Operation.Deposit, Operation.Withdrawal]);
  });

  it("includes shift when the selected market is shift-available", () => {
    expect(
      getGmSwapBoxAvailableOperations({
        shiftAvailableMarkets: [BTC_USDC_MARKET],
        selectedGlvOrMarketAddress: BTC_USDC_MARKET.marketTokenAddress,
      })
    ).toEqual([Operation.Deposit, Operation.Withdrawal, Operation.Shift]);
  });

  it("matches a shift-available glv by its glv token address", () => {
    expect(
      getGmSwapBoxAvailableOperations({
        shiftAvailableMarkets: [GLV],
        selectedGlvOrMarketAddress: GLV.glvTokenAddress,
      })
    ).toEqual([Operation.Deposit, Operation.Withdrawal, Operation.Shift]);
  });
});
