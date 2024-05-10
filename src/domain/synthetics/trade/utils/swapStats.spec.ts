import { MarketsInfoData } from "domain/synthetics/markets";
import { getSwapPathOutputAddresses } from "./swapStats";

const someWrappedToken = "0x0000000000000000000000000000000000000001";
const someNativeToken = "0x0000000000000000000000000000000000000000";
const unrelatedToken = "0x0000000000000000000000000000000000000002";

const marketA = "0x0000000000000000000000000000000000000003";
const marketB = "0x0000000000000000000000000000000000000004";

const mockMarketsInfoData = {
  [marketA]: {
    longToken: {
      address: someWrappedToken,
    },
    shortToken: {
      address: unrelatedToken,
    },
  },
  [marketB]: {
    longToken: {
      address: unrelatedToken,
    },
    shortToken: {
      address: someWrappedToken,
    },
  },
} as unknown as MarketsInfoData;

describe("getSwapPathOutputAddresses", () => {
  type Input = Parameters<typeof getSwapPathOutputAddresses>[0];

  it("increase, pay native, collateral wrapped, swap empty", () => {
    const input: Input = {
      marketsInfoData: mockMarketsInfoData,
      swapPath: [],
      initialCollateralAddress: someWrappedToken,
      isIncrease: true,
      shouldUnwrapNativeToken: true,
      wrappedNativeTokenAddress: someWrappedToken,
    };

    const result = getSwapPathOutputAddresses(input);

    expect(result).toEqual({
      outTokenAddress: someWrappedToken,
      outMarketAddress: undefined,
    });
  });

  it("increase, pay native, collateral unrelated", () => {
    const input: Input = {
      marketsInfoData: mockMarketsInfoData,
      swapPath: [marketA],
      initialCollateralAddress: someWrappedToken,
      isIncrease: true,
      shouldUnwrapNativeToken: true,
      wrappedNativeTokenAddress: someWrappedToken,
    };

    const result = getSwapPathOutputAddresses(input);

    expect(result).toEqual({
      outTokenAddress: unrelatedToken,
      outMarketAddress: undefined,
    });
  });

  it("increase, pay wrapped, collateral wrapped, swap empty", () => {
    const input: Input = {
      marketsInfoData: mockMarketsInfoData,
      swapPath: [],
      initialCollateralAddress: someWrappedToken,
      isIncrease: true,
      shouldUnwrapNativeToken: false,
      wrappedNativeTokenAddress: someWrappedToken,
    };

    const result = getSwapPathOutputAddresses(input);

    expect(result).toEqual({
      outTokenAddress: someWrappedToken,
      outMarketAddress: undefined,
    });
  });

  it("increase, pay wrapped, collateral unrelated", () => {
    const input: Input = {
      marketsInfoData: mockMarketsInfoData,
      swapPath: [marketA],
      initialCollateralAddress: someWrappedToken,
      isIncrease: true,
      shouldUnwrapNativeToken: false,
      wrappedNativeTokenAddress: someWrappedToken,
    };

    const result = getSwapPathOutputAddresses(input);

    expect(result).toEqual({
      outTokenAddress: unrelatedToken,
      outMarketAddress: undefined,
    });
  });

  it("increase, pay unrelated, collateral unrelated, swap empty", () => {
    const input: Input = {
      marketsInfoData: mockMarketsInfoData,
      swapPath: [],
      initialCollateralAddress: unrelatedToken,
      isIncrease: true,
      shouldUnwrapNativeToken: false,
      wrappedNativeTokenAddress: someWrappedToken,
    };

    const result = getSwapPathOutputAddresses(input);

    expect(result).toEqual({
      outTokenAddress: unrelatedToken,
      outMarketAddress: undefined,
    });
  });

  it("increase, pay native, collateral wrapped, swap NOT empty", () => {
    const input: Input = {
      marketsInfoData: mockMarketsInfoData,
      swapPath: [marketB, marketA],
      initialCollateralAddress: someWrappedToken,
      isIncrease: true,
      shouldUnwrapNativeToken: true,
      wrappedNativeTokenAddress: someWrappedToken,
    };

    const result = getSwapPathOutputAddresses(input);

    expect(result).toEqual({
      outTokenAddress: someWrappedToken,
      outMarketAddress: undefined,
    });
  });

  it("decrease, pay native, collateral wrapped, swap empty", () => {
    const input: Input = {
      marketsInfoData: mockMarketsInfoData,
      swapPath: [],
      initialCollateralAddress: someWrappedToken,
      isIncrease: false,
      shouldUnwrapNativeToken: true,
      wrappedNativeTokenAddress: someWrappedToken,
    };

    const result = getSwapPathOutputAddresses(input);

    expect(result).toEqual({
      outTokenAddress: someNativeToken,
      outMarketAddress: undefined,
    });
  });

  it("decrease, pay native, collateral unrelated", () => {
    const input: Input = {
      marketsInfoData: mockMarketsInfoData,
      swapPath: [marketA],
      initialCollateralAddress: someWrappedToken,
      isIncrease: false,
      shouldUnwrapNativeToken: true,
      wrappedNativeTokenAddress: someWrappedToken,
    };

    const result = getSwapPathOutputAddresses(input);

    expect(result).toEqual({
      outTokenAddress: unrelatedToken,
      outMarketAddress: undefined,
    });
  });

  it("decrease, pay wrapped, collateral wrapped, swap empty", () => {
    const input: Input = {
      marketsInfoData: mockMarketsInfoData,
      swapPath: [],
      initialCollateralAddress: someWrappedToken,
      isIncrease: false,
      shouldUnwrapNativeToken: false,
      wrappedNativeTokenAddress: someWrappedToken,
    };

    const result = getSwapPathOutputAddresses(input);

    expect(result).toEqual({
      outTokenAddress: someWrappedToken,
      outMarketAddress: undefined,
    });
  });

  it("decrease, pay wrapped, collateral unrelated", () => {
    const input: Input = {
      marketsInfoData: mockMarketsInfoData,
      swapPath: [marketA],
      initialCollateralAddress: someWrappedToken,
      isIncrease: false,
      shouldUnwrapNativeToken: false,
      wrappedNativeTokenAddress: someWrappedToken,
    };

    const result = getSwapPathOutputAddresses(input);

    expect(result).toEqual({
      outTokenAddress: unrelatedToken,
      outMarketAddress: undefined,
    });
  });

  it("decrease, pay unrelated, collateral unrelated, swap empty", () => {
    const input: Input = {
      marketsInfoData: mockMarketsInfoData,
      swapPath: [],
      initialCollateralAddress: unrelatedToken,
      isIncrease: false,
      shouldUnwrapNativeToken: false,
      wrappedNativeTokenAddress: someWrappedToken,
    };

    const result = getSwapPathOutputAddresses(input);

    expect(result).toEqual({
      outTokenAddress: unrelatedToken,
      outMarketAddress: undefined,
    });
  });

  it("decreases, pay native, collateral wrapped, swap NOT empty", () => {
    const input: Input = {
      marketsInfoData: mockMarketsInfoData,
      swapPath: [marketB, marketA],
      initialCollateralAddress: someWrappedToken,
      isIncrease: false,
      shouldUnwrapNativeToken: true,
      wrappedNativeTokenAddress: someWrappedToken,
    };

    const result = getSwapPathOutputAddresses(input);

    expect(result).toEqual({
      outTokenAddress: someNativeToken,
      outMarketAddress: undefined,
    });
  });
});
