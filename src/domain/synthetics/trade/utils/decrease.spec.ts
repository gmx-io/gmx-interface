import { getDecreasePositionAmounts } from "./decrease";
import { TokenData } from "domain/synthetics/tokens";
import { expandDecimals } from "lib/numbers";
import { MarketInfo } from "domain/synthetics/markets";
import { PositionInfo } from "domain/synthetics/positions";
import { DecreasePositionSwapType } from "domain/synthetics/orders";

const closeSizeUsd = BigInt(99);

const usdcToken: TokenData = {
  prices: {
    minPrice: 10n ** 28n * 99n,
    maxPrice: 10n ** 28n * 99n,
  },
  isStable: true,
  name: "USDC",
  symbol: "USDC",
  decimals: 8,
  address: "0x00",
};

const ethToken: TokenData = {
  name: "Ethereum",
  symbol: "ETH",
  decimals: 18,
  address: "0x0000000000000000000000000000000000000000",
  isNative: true,
  isShortable: true,
  wrappedAddress: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
  prices: {
    minPrice: expandDecimals(4000, 30),
    maxPrice: expandDecimals(4000, 30),
  },
  balance: BigInt(0),
};

const wethToken: TokenData = {
  ...ethToken,
  isWrapped: true,
  address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
  wrappedAddress: undefined,
};

const marketInfo: MarketInfo = {
  marketTokenAddress: "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336",
  indexTokenAddress: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
  longTokenAddress: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
  shortTokenAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  isSameCollaterals: false,
  isSpotOnly: false,
  name: "ETH/USD [WETH-USDC]",
  data: "",
  isDisabled: false,
  longToken: wethToken,
  shortToken: usdcToken,
  indexToken: ethToken,
  longsPayShorts: true,
  longInterestUsd: BigInt("0x0fcaba9e090934843130d214c605c952"),
  shortInterestUsd: BigInt("0x10e6a1773a6b9d068141fbca38ef6383"),
  longInterestInTokens: BigInt("0x016e0289eb94057d17ff"),
  shortInterestInTokens: BigInt("0x018a3e9e04f7e6d6d55a"),
  longPoolAmount: BigInt("0x032ecc6c8a9bf888ddd6"),
  shortPoolAmount: BigInt("0x2a389dc3f499"),
  maxLongPoolAmountForDeposit: BigInt("0x0733d9325b6711540000"),
  maxShortPoolAmountForDeposit: BigInt("0x51dac207a000"),
  maxLongPoolAmount: BigInt("0x0800b55b59670a800000"),
  maxShortPoolAmount: BigInt("0x5af3107a4000"),
  longPoolAmountAdjustment: BigInt("0x00"),
  shortPoolAmountAdjustment: BigInt("0x00"),
  poolValueMin: BigInt("0x452f9638e41a56df3fe3e70889447d22"),
  poolValueMax: BigInt("0x4532dc368befac08ca96e5c969036182"),
  reserveFactorLong: BigInt("0x11aba4db89fc3d4d14c0000000"),
  reserveFactorShort: BigInt("0x11aba4db89fc3d4d14c0000000"),
  openInterestReserveFactorLong: BigInt("0x110a15d3b2c584412f70000000"),
  openInterestReserveFactorShort: BigInt("0x110a15d3b2c584412f70000000"),
  maxOpenInterestLong: BigInt("0x3c2f7086aed236c807a1b50000000000"),
  maxOpenInterestShort: BigInt("0x3c2f7086aed236c807a1b50000000000"),
  totalBorrowingFees: BigInt("0x2ebfa5dc1ddec7c234187319917264"),
  positionImpactPoolAmount: BigInt("0x112b7c0da7def1dbc7"),
  minPositionImpactPoolAmount: BigInt("0x8ac7230489e80000"),
  positionImpactPoolDistributionRate: BigInt("0x03b76a6df314d755bd57a46824600000000000"),
  swapImpactPoolAmountLong: BigInt("0xc20fe627d333"),
  swapImpactPoolAmountShort: BigInt("0x00"),
  borrowingFactorLong: BigInt("0x7e49b1c9400e0000"),
  borrowingFactorShort: BigInt("0x7e49b1c9400e0000"),
  borrowingExponentFactorLong: BigInt("0x11aba4db89fc3d4d14c0000000"),
  borrowingExponentFactorShort: BigInt("0x11aba4db89fc3d4d14c0000000"),
  fundingFactor: BigInt("0x043c33c1937564800000"),
  fundingExponentFactor: BigInt("0x0c9f2c9cd04674edea40000000"),
  fundingIncreaseFactorPerSecond: BigInt("0x0af6a4d07c8f0000"),
  fundingDecreaseFactorPerSecond: BigInt("0x00"),
  thresholdForDecreaseFunding: BigInt("0x00"),
  thresholdForStableFunding: BigInt("0xa18f07d736b90be550000000"),
  minFundingFactorPerSecond: BigInt("0x1043561a8829300000"),
  maxFundingFactorPerSecond: BigInt("0x021e19e0c9bab2400000"),
  pnlLongMax: BigInt("0x2a2124c59079e41e89148dca8efb02"),
  pnlLongMin: BigInt("0x2995258254fc7ab55ae3120ac1e292"),
  pnlShortMax: BigInt("0x10d41a53d640b48bcfc1b928c04303"),
  pnlShortMin: BigInt("0x116ae64c0e60b8773ad6fdbb1f7ba3"),
  netPnlMax: BigInt("0x194d0a71ba392f92b952d4a1ceb7ff"),
  netPnlMin: BigInt("0x182a3f36469bc23e200c144fa266ef"),
  maxPnlFactorForTradersLong: BigInt("0x0b5c0e8d21d902d61fa0000000"),
  maxPnlFactorForTradersShort: BigInt("0x0b5c0e8d21d902d61fa0000000"),
  minCollateralFactor: BigInt("0x204fce5e3e25026110000000"),
  minCollateralFactorForOpenInterestLong: BigInt("0x0ad78ebc5ac6200000"),
  minCollateralFactorForOpenInterestShort: BigInt("0x0ad78ebc5ac6200000"),
  claimableFundingAmountLong: BigInt("0x1cefb332ff83"),
  claimableFundingAmountShort: BigInt("0x05b1ee"),
  positionFeeFactorForPositiveImpact: BigInt("0x019d971e4fe8401e74000000"),
  positionFeeFactorForNegativeImpact: BigInt("0x024306c4097859c43c000000"),
  positionImpactFactorPositive: BigInt("0x04e1003b28d9280000"),
  positionImpactFactorNegative: BigInt("0x0821ab0d4414980000"),
  maxPositionImpactFactorPositive: BigInt("0x1027e72f1f12813088000000"),
  maxPositionImpactFactorNegative: BigInt("0x1027e72f1f12813088000000"),
  maxPositionImpactFactorForLiquidations: BigInt("0x00"),
  positionImpactExponentFactor: BigInt("0x193e5939a08ce9dbd480000000"),
  swapFeeFactorForPositiveImpact: BigInt("0x019d971e4fe8401e74000000"),
  swapFeeFactorForNegativeImpact: BigInt("0x024306c4097859c43c000000"),
  swapImpactFactorPositive: BigInt("0x0ad78ebc5ac6200000"),
  swapImpactFactorNegative: BigInt("0x0ad78ebc5ac6200000"),
  swapImpactExponentFactor: BigInt("0x193e5939a08ce9dbd480000000"),
  borrowingFactorPerSecondForLongs: BigInt("0x00"),
  borrowingFactorPerSecondForShorts: BigInt("0xd03c28208ed1247ad5"),
  fundingFactorPerSecond: BigInt("0xd731ac61a4dd60108e"),
  virtualPoolAmountForLongToken: BigInt("0x032ecc6c8a9bf888ddd6"),
  virtualPoolAmountForShortToken: BigInt("0x2a389dc3f499"),
  virtualInventoryForPositions: BigInt("0x011bc30393022dc539e557527e9158b2"),
  virtualMarketId: "0xf5134a0a1379cd7f246d7a04d2463c57aa177bf09a34e93dafc5e768c05cea63",
  virtualLongTokenId: "0x3c48977e4fc47fa4616e13af7ceb68b0d545dce7b1fb9ec7b85bb6e00870a051",
  virtualShortTokenId: "0x0000000000000000000000000000000000000000000000000000000000000000",
};

const position: PositionInfo = {
  data: "",
  key: "0xc9e1CE91d3f782499cFe787b6F1d2AF0Ca76C049:0x70d95587d40A2caf56bd97485aB3Eec10Bee6336:0xaf88d065e77c8cC2239327C5EDb3A432268e5831:true",
  contractKey: "0x45d022785433e1ce4bab9bda22a300cc960432ba5e8bf00788efbd6bde90b85c",
  account: "0xc9e1CE91d3f782499cFe787b6F1d2AF0Ca76C049",
  marketAddress: "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336",
  collateralTokenAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  sizeInUsd: BigInt("0x34f53e3e6e6e4258bd6e4c0000"),
  sizeInTokens: BigInt("0x069e5143218379"),
  collateralAmount: BigInt("0x1b3c0b"),
  increasedAtBlock: BigInt("0x09576d15"),
  decreasedAtBlock: BigInt("0x0a9fe700"),
  isLong: true,
  pendingBorrowingFeesUsd: BigInt("0x01f7685a27fa507f04c467a667"),
  fundingFeeAmount: BigInt("0x059624"),
  claimableLongTokenAmount: BigInt("0x00"),
  claimableShortTokenAmount: BigInt("0x00"),
  marketInfo,
  indexToken: ethToken,
  collateralToken: usdcToken,
  pnlToken: wethToken,
  markPrice: BigInt("0x9630ee7c4228a0ae237af8000000"),
  entryPrice: BigInt("0x6f0b60ef22cc9d66ddf3e1340000"),
  liquidationPrice: BigInt("0x682958f55ba441c1492a47080000"),
  collateralUsd: BigInt("0x1686d970e074ba9aa5c2e20000"),
  remainingCollateralUsd: BigInt("0x0ff0843a734b191deb6e225999"),
  remainingCollateralAmount: BigInt("0x13454a"),
  hasLowCollateral: false,
  leverage: BigInt("0x3bc5"),
  leverageWithPnl: BigInt("0x3bc5"),
  pnl: BigInt("0x12ab5bbd6ddb44211959c57e00"),
  pnlPercentage: BigInt("0x205f"),
  pnlAfterFees: BigInt("0x0c0c028ad300f9cb4b1449a799"),
  pnlAfterFeesPercentage: BigInt("0x14db"),
  netValue: BigInt("0x2292dbfbb375b465f0d72ba799"),
  closingFeeUsd: BigInt("0x0903fc2db0a8d913f0bc3000"),
  uiFeeUsd: BigInt("0x00"),
  pendingFundingFeesUsd: BigInt("0x049eecdc452f50fdb590580000"),
  pendingClaimableFundingFeesUsd: BigInt("0x00"),
};

const keepLeverage = false;
const isLong = true;
const minCollateralUsd = BigInt(100000);
const minPositionSizeUsd = BigInt(100000);
const uiFeeFactor = BigInt(0);

describe("getDecreasePositionAmounts DecreasePositionSwapType", () => {
  it("usdc collateral", () => {
    const amounts = getDecreasePositionAmounts({
      closeSizeUsd,
      collateralToken: usdcToken,
      position,
      keepLeverage,
      isLong,
      marketInfo,
      minCollateralUsd,
      minPositionSizeUsd,
      uiFeeFactor,
      acceptablePriceImpactBuffer: 30,
      userReferralInfo: undefined,
    });
    expect(amounts.decreaseSwapType).toEqual(DecreasePositionSwapType.SwapPnlTokenToCollateralToken);
  });

  it("eth collateral", () => {
    const amounts = getDecreasePositionAmounts({
      closeSizeUsd,
      collateralToken: ethToken,
      position,
      keepLeverage,
      isLong,
      marketInfo,
      minCollateralUsd,
      minPositionSizeUsd,
      uiFeeFactor,
      acceptablePriceImpactBuffer: 30,
      userReferralInfo: undefined,
    });
    expect(amounts.decreaseSwapType).toEqual(DecreasePositionSwapType.NoSwap);
  });

  it("usdc collateral but receive in eth", () => {
    const amounts = getDecreasePositionAmounts({
      closeSizeUsd,
      collateralToken: usdcToken,
      receiveToken: ethToken,
      position,
      keepLeverage,
      isLong,
      marketInfo,
      minCollateralUsd,
      minPositionSizeUsd,
      uiFeeFactor,
      acceptablePriceImpactBuffer: 30,
      userReferralInfo: undefined,
    });
    expect(amounts.decreaseSwapType).toEqual(DecreasePositionSwapType.SwapCollateralTokenToPnlToken);
  });
});
