import { PositionTradeAction, SwapTradeAction } from "domain/synthetics/tradeHistory";
import { deserializeBigIntsInObject } from "lib/numbers";

const prepare = (action: any): PositionTradeAction => {
  return deserializeBigIntsInObject(action) as PositionTradeAction;
};

const prepareSwap = (action: any): SwapTradeAction => {
  return prepare(action) as unknown as SwapTradeAction;
};

export const requestIncreasePosition = prepare({
  id: "0x54c09779cf511553be331c932eb5909ef19e712ff73bf839e0cd95d6a76360c2:2",
  eventName: "OrderCreated",
  account: "0x414da6c7c50eadfbd4c67c902c7daf59f58d32c7",
  marketAddress: "0xD996ff47A1F763E1e55415BC4437c59292D1F415",
  marketInfo: {
    marketTokenAddress: "0xD996ff47A1F763E1e55415BC4437c59292D1F415",
    indexTokenAddress: "0x1D308089a2D1Ced3f1Ce36B1FcaF815b07217be3",
    longTokenAddress: "0x1D308089a2D1Ced3f1Ce36B1FcaF815b07217be3",
    shortTokenAddress: "0x3eBDeaA0DB3FfDe96E7a0DBBAFEC961FC50F725F",
    isSameCollaterals: false,
    isSpotOnly: false,
    name: "AVAX/USD [WAVAX-USDC]",
    data: "",
    isDisabled: false,
    longToken: {
      name: "Wrapped AVAX",
      symbol: "WAVAX",
      decimals: 18,
      address: "0x1D308089a2D1Ced3f1Ce36B1FcaF815b07217be3",
      isWrapped: true,
      baseSymbol: "AVAX",
      imageUrl: "https://assets.coingecko.com/coins/images/12559/small/coin-round-red.png?1604021818",
      coingeckoUrl: "https://www.coingecko.com/en/coins/avalanche",
      explorerUrl: "https://testnet.snowtrace.io/address/0x1D308089a2D1Ced3f1Ce36B1FcaF815b07217be3",
      prices: {
        minPrice: {
          type: "bigint",
          hex: "0x020848ce70e679b47f64d9000000",
        },
        maxPrice: {
          type: "bigint",
          hex: "0x020848ce70e679b47f64d9000000",
        },
      },
      balance: {
        type: "bigint",
        hex: "0x1e9b7a9f0b6f20",
      },
    },
    shortToken: {
      name: "USD Coin",
      symbol: "USDC",
      address: "0x3eBDeaA0DB3FfDe96E7a0DBBAFEC961FC50F725F",
      decimals: 6,
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
      coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
      explorerUrl: "https://testnet.snowtrace.io/address/0x3eBDeaA0DB3FfDe96E7a0DBBAFEC961FC50F725F",
      prices: {
        minPrice: {
          type: "bigint",
          hex: "0x0c9f2c9cd04674edea40000000",
        },
        maxPrice: {
          type: "bigint",
          hex: "0x0ca0b1305ce70e40af20000000",
        },
      },
      balance: {
        type: "bigint",
        hex: "0x1260d05b",
      },
    },
    indexToken: {
      name: "Avalanche",
      symbol: "AVAX",
      decimals: 18,
      address: "0x0000000000000000000000000000000000000000",
      isNative: true,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/12559/small/coin-round-red.png?1604021818",
      wrappedAddress: "0x1D308089a2D1Ced3f1Ce36B1FcaF815b07217be3",
      prices: {
        minPrice: {
          type: "bigint",
          hex: "0x020848ce70e679b47f64d9000000",
        },
        maxPrice: {
          type: "bigint",
          hex: "0x020848ce70e679b47f64d9000000",
        },
      },
      balance: {
        type: "bigint",
        hex: "0x7ad19dcc2e798676",
      },
    },
    longInterestUsd: {
      type: "bigint",
      hex: "0x3594cfa5ef4e727dd1634908c000",
    },
    shortInterestUsd: {
      type: "bigint",
      hex: "0x1e26b364eac3d5b12bf666c10000",
    },
    longInterestInTokens: {
      type: "bigint",
      hex: "0x0374e917e36ae364a1",
    },
    shortInterestInTokens: {
      type: "bigint",
      hex: "0xc84ac80825452690",
    },
    longPoolAmount: {
      type: "bigint",
      hex: "0x03d18d6b0bdbb860af",
    },
    shortPoolAmount: {
      type: "bigint",
      hex: "0x8dea649b",
    },
    maxLongPoolAmountForDeposit: {
      type: "bigint",
      hex: "0x033b2e3c9fd0803ce8000000",
    },
    maxShortPoolAmountForDeposit: {
      type: "bigint",
      hex: "0x033b2e3c9fd0803ce8000000",
    },
    maxLongPoolAmount: {
      type: "bigint",
      hex: "0x033b2e3c9fd0803ce8000000",
    },
    maxShortPoolAmount: {
      type: "bigint",
      hex: "0x033b2e3c9fd0803ce8000000",
    },
    longPoolAmountAdjustment: {
      type: "bigint",
      hex: "0x00",
    },
    shortPoolAmountAdjustment: {
      type: "bigint",
      hex: "0x00",
    },
    poolValueMin: {
      type: "bigint",
      hex: "0xb9a13c1cd44fb107b4317ba1aff5",
    },
    poolValueMax: {
      type: "bigint",
      hex: "0xb9af5a1931b19e9f389ff621aff5",
    },
    reserveFactorLong: {
      type: "bigint",
      hex: "0x0bfd9d94f90fbbe204f0000000",
    },
    reserveFactorShort: {
      type: "bigint",
      hex: "0x0bfd9d94f90fbbe204f0000000",
    },
    openInterestReserveFactorLong: {
      type: "bigint",
      hex: "0x0b5c0e8d21d902d61fa0000000",
    },
    openInterestReserveFactorShort: {
      type: "bigint",
      hex: "0x0b5c0e8d21d902d61fa0000000",
    },
    maxOpenInterestLong: {
      type: "bigint",
      hex: "0x02f050fe938943acc45f65568000000000",
    },
    maxOpenInterestShort: {
      type: "bigint",
      hex: "0x02f050fe938943acc45f65568000000000",
    },
    totalBorrowingFees: {
      type: "bigint",
      hex: "0x0312dc3edf3f01f94db43caa6644",
    },
    positionImpactPoolAmount: {
      type: "bigint",
      hex: "0x2d33d8623f8865",
    },
    minPositionImpactPoolAmount: {
      type: "bigint",
      hex: "0x00",
    },
    positionImpactPoolDistributionRate: {
      type: "bigint",
      hex: "0x00",
    },
    swapImpactPoolAmountLong: {
      type: "bigint",
      hex: "0x147d7ff57b9ad81a",
    },
    swapImpactPoolAmountShort: {
      type: "bigint",
      hex: "0x01a8e72a",
    },
    borrowingFactorLong: {
      type: "bigint",
      hex: "0x0152d02c7e14af680000",
    },
    borrowingFactorShort: {
      type: "bigint",
      hex: "0x0152d02c7e14af680000",
    },
    borrowingExponentFactorLong: {
      type: "bigint",
      hex: "0x0c9f2c9cd04674edea40000000",
    },
    borrowingExponentFactorShort: {
      type: "bigint",
      hex: "0x0c9f2c9cd04674edea40000000",
    },
    fundingFactor: {
      type: "bigint",
      hex: "0x043c33c1937564800000",
    },
    fundingExponentFactor: {
      type: "bigint",
      hex: "0x0c9f2c9cd04674edea40000000",
    },
    fundingIncreaseFactorPerSecond: {
      type: "bigint",
      hex: "0x00",
    },
    fundingDecreaseFactorPerSecond: {
      type: "bigint",
      hex: "0x00",
    },
    thresholdForDecreaseFunding: {
      type: "bigint",
      hex: "0x00",
    },
    thresholdForStableFunding: {
      type: "bigint",
      hex: "0x00",
    },
    minFundingFactorPerSecond: {
      type: "bigint",
      hex: "0x00",
    },
    maxFundingFactorPerSecond: {
      type: "bigint",
      hex: "0x00",
    },

    maxPnlFactorForTradersLong: {
      type: "bigint",
      hex: "0x0a18f07d736b90be5500000000",
    },
    maxPnlFactorForTradersShort: {
      type: "bigint",
      hex: "0x0a18f07d736b90be5500000000",
    },
    minCollateralFactor: {
      type: "bigint",
      hex: "0x204fce5e3e25026110000000",
    },
    minCollateralFactorForOpenInterestLong: {
      type: "bigint",
      hex: "0x00",
    },
    minCollateralFactorForOpenInterestShort: {
      type: "bigint",
      hex: "0x00",
    },
    claimableFundingAmountLong: {
      type: "bigint",
      hex: "0x13165c0e3542c3",
    },
    claimableFundingAmountShort: {
      type: "bigint",
      hex: "0x01d670",
    },
    positionFeeFactorForPositiveImpact: {
      type: "bigint",
      hex: "0x019d971e4fe8401e74000000",
    },
    positionFeeFactorForNegativeImpact: {
      type: "bigint",
      hex: "0x024306c4097859c43c000000",
    },
    positionImpactFactorPositive: {
      type: "bigint",
      hex: "0x0a968163f0a57b400000",
    },
    positionImpactFactorNegative: {
      type: "bigint",
      hex: "0x152d02c7e14af6800000",
    },
    maxPositionImpactFactorPositive: {
      type: "bigint",
      hex: "0x204fce5e3e25026110000000",
    },
    maxPositionImpactFactorNegative: {
      type: "bigint",
      hex: "0x204fce5e3e25026110000000",
    },
    maxPositionImpactFactorForLiquidations: {
      type: "bigint",
      hex: "0x204fce5e3e25026110000000",
    },
    positionImpactExponentFactor: {
      type: "bigint",
      hex: "0x193e5939a08ce9dbd480000000",
    },
    swapFeeFactorForPositiveImpact: {
      type: "bigint",
      hex: "0x019d971e4fe8401e74000000",
    },
    swapFeeFactorForNegativeImpact: {
      type: "bigint",
      hex: "0x024306c4097859c43c000000",
    },
    swapImpactFactorPositive: {
      type: "bigint",
      hex: "0x0422ca8b0a00a425000000",
    },
    swapImpactFactorNegative: {
      type: "bigint",
      hex: "0x084595161401484a000000",
    },
    swapImpactExponentFactor: {
      type: "bigint",
      hex: "0x193e5939a08ce9dbd480000000",
    },
    borrowingFactorPerSecondForLongs: {
      type: "bigint",
      hex: "0x0132b440c5a7c78c000c",
    },
    borrowingFactorPerSecondForShorts: {
      type: "bigint",
      hex: "0x00",
    },
    fundingFactorPerSecond: {
      type: "bigint",
      hex: "0x012f61fb21f0403f2694",
    },
    longsPayShorts: true,
    virtualPoolAmountForLongToken: {
      type: "bigint",
      hex: "0x00",
    },
    virtualPoolAmountForShortToken: {
      type: "bigint",
      hex: "0x00",
    },
    virtualInventoryForPositions: {
      type: "bigint",
      hex: "0x00",
    },
    virtualMarketId: "0x0000000000000000000000000000000000000000000000000000000000000000",
    virtualLongTokenId: "0x0000000000000000000000000000000000000000000000000000000000000000",
    virtualShortTokenId: "0x0000000000000000000000000000000000000000000000000000000000000000",
  },
  indexToken: {
    name: "Avalanche",
    symbol: "AVAX",
    decimals: 18,
    address: "0x0000000000000000000000000000000000000000",
    isNative: true,
    isShortable: true,
    imageUrl: "https://assets.coingecko.com/coins/images/12559/small/coin-round-red.png?1604021818",
    wrappedAddress: "0x1D308089a2D1Ced3f1Ce36B1FcaF815b07217be3",
    prices: {
      minPrice: {
        type: "bigint",
        hex: "0x020848ce70e679b47f64d9000000",
      },
      maxPrice: {
        type: "bigint",
        hex: "0x020848ce70e679b47f64d9000000",
      },
    },
    balance: {
      type: "bigint",
      hex: "0x7ad19dcc2e798676",
    },
  },
  swapPath: ["0xD996ff47A1F763E1e55415BC4437c59292D1F415"],
  initialCollateralTokenAddress: "0x1D308089a2D1Ced3f1Ce36B1FcaF815b07217be3",
  initialCollateralToken: {
    name: "Wrapped AVAX",
    symbol: "WAVAX",
    decimals: 18,
    address: "0x1D308089a2D1Ced3f1Ce36B1FcaF815b07217be3",
    isWrapped: true,
    baseSymbol: "AVAX",
    imageUrl: "https://assets.coingecko.com/coins/images/12559/small/coin-round-red.png?1604021818",
    coingeckoUrl: "https://www.coingecko.com/en/coins/avalanche",
    explorerUrl: "https://testnet.snowtrace.io/address/0x1D308089a2D1Ced3f1Ce36B1FcaF815b07217be3",
    prices: {
      minPrice: {
        type: "bigint",
        hex: "0x020848ce70e679b47f64d9000000",
      },
      maxPrice: {
        type: "bigint",
        hex: "0x020848ce70e679b47f64d9000000",
      },
    },
    balance: {
      type: "bigint",
      hex: "0x1e9b7a9f0b6f20",
    },
  },
  targetCollateralToken: {
    name: "USD Coin",
    symbol: "USDC",
    address: "0x3eBDeaA0DB3FfDe96E7a0DBBAFEC961FC50F725F",
    decimals: 6,
    isStable: true,
    imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
    coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
    explorerUrl: "https://testnet.snowtrace.io/address/0x3eBDeaA0DB3FfDe96E7a0DBBAFEC961FC50F725F",
    prices: {
      minPrice: {
        type: "bigint",
        hex: "0x0c9f2c9cd04674edea40000000",
      },
      maxPrice: {
        type: "bigint",
        hex: "0x0ca0b1305ce70e40af20000000",
      },
    },
    balance: {
      type: "bigint",
      hex: "0x1260d05b",
    },
  },
  initialCollateralDeltaAmount: {
    type: "bigint",
    hex: "0x8ac7230489e80000",
  },
  sizeDeltaUsd: {
    type: "bigint",
    hex: "0x34027e417db6da41c6bace000000",
  },
  triggerPrice: {
    type: "bigint",
    hex: "0x00",
  },
  acceptablePrice: {
    type: "bigint",
    hex: "0x01ba7ddecf686427743628600000",
  },
  minOutputAmount: {
    type: "bigint",
    hex: "0x00",
  },
  orderType: 2,
  orderKey: "0x8a7c8b5f3a2026b7dcca239a957d684e2dcffda4f8b901657eff8d5e5e3717fc",
  isLong: false,
  reason: null,
  reasonBytes: null,
  timestamp: 1707375050,
  transaction: {
    hash: "0x54c09779cf511553be331c932eb5909ef19e712ff73bf839e0cd95d6a76360c2",
    __typename: "Transaction",
  },
});

export const withdraw1Usd = prepare({
  id: "0x0e55cbb747fc2bae9c2fc38588af6f6e3eeab823e4afd32afc628c773de33007:2",
  eventName: "OrderCreated",
  account: "0x414da6c7c50eadfbd4c67c902c7daf59f58d32c7",
  marketAddress: "0xD996ff47A1F763E1e55415BC4437c59292D1F415",
  marketInfo: {
    marketTokenAddress: "0xD996ff47A1F763E1e55415BC4437c59292D1F415",
    indexTokenAddress: "0x1D308089a2D1Ced3f1Ce36B1FcaF815b07217be3",
    longTokenAddress: "0x1D308089a2D1Ced3f1Ce36B1FcaF815b07217be3",
    shortTokenAddress: "0x3eBDeaA0DB3FfDe96E7a0DBBAFEC961FC50F725F",
    isSameCollaterals: false,
    isSpotOnly: false,
    name: "AVAX/USD [WAVAX-USDC]",
    data: "",
    isDisabled: false,
    longToken: {
      name: "Wrapped AVAX",
      symbol: "WAVAX",
      decimals: 18,
      address: "0x1D308089a2D1Ced3f1Ce36B1FcaF815b07217be3",
      isWrapped: true,
      baseSymbol: "AVAX",
      imageUrl: "https://assets.coingecko.com/coins/images/12559/small/coin-round-red.png?1604021818",
      coingeckoUrl: "https://www.coingecko.com/en/coins/avalanche",
      explorerUrl: "https://testnet.snowtrace.io/address/0x1D308089a2D1Ced3f1Ce36B1FcaF815b07217be3",
      prices: {
        minPrice: {
          type: "bigint",
          hex: "0x0208e8c9ceb8ae36e64f41000000",
        },
        maxPrice: {
          type: "bigint",
          hex: "0x0208e8c9ceb8ae36e64f41000000",
        },
      },
      balance: {
        type: "bigint",
        hex: "0x1e9b7a9f0b6f20",
      },
    },
    shortToken: {
      name: "USD Coin",
      symbol: "USDC",
      address: "0x3eBDeaA0DB3FfDe96E7a0DBBAFEC961FC50F725F",
      decimals: 6,
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
      coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
      explorerUrl: "https://testnet.snowtrace.io/address/0x3eBDeaA0DB3FfDe96E7a0DBBAFEC961FC50F725F",
      prices: {
        minPrice: {
          type: "bigint",
          hex: "0x0c9f2c9cd04674edea40000000",
        },
        maxPrice: {
          type: "bigint",
          hex: "0x0ca0b1305ce70e40af20000000",
        },
      },
      balance: {
        type: "bigint",
        hex: "0x1260d05b",
      },
    },
    indexToken: {
      name: "Avalanche",
      symbol: "AVAX",
      decimals: 18,
      address: "0x0000000000000000000000000000000000000000",
      isNative: true,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/12559/small/coin-round-red.png?1604021818",
      wrappedAddress: "0x1D308089a2D1Ced3f1Ce36B1FcaF815b07217be3",
      prices: {
        minPrice: {
          type: "bigint",
          hex: "0x0208e8c9ceb8ae36e64f41000000",
        },
        maxPrice: {
          type: "bigint",
          hex: "0x0208e8c9ceb8ae36e64f41000000",
        },
      },
      balance: {
        type: "bigint",
        hex: "0x7ad19dcc2e798676",
      },
    },
    longInterestUsd: {
      type: "bigint",
      hex: "0x3594cfa5ef4e727dd1634908c000",
    },
    shortInterestUsd: {
      type: "bigint",
      hex: "0x1e26b364eac3d5b12bf666c10000",
    },
    longInterestInTokens: {
      type: "bigint",
      hex: "0x0374e917e36ae364a1",
    },
    shortInterestInTokens: {
      type: "bigint",
      hex: "0xc84ac80825452690",
    },
    longPoolAmount: {
      type: "bigint",
      hex: "0x03d18d6b0bdbb860af",
    },
    shortPoolAmount: {
      type: "bigint",
      hex: "0x8dea649b",
    },
    maxLongPoolAmountForDeposit: {
      type: "bigint",
      hex: "0x033b2e3c9fd0803ce8000000",
    },
    maxShortPoolAmountForDeposit: {
      type: "bigint",
      hex: "0x033b2e3c9fd0803ce8000000",
    },
    maxLongPoolAmount: {
      type: "bigint",
      hex: "0x033b2e3c9fd0803ce8000000",
    },
    maxShortPoolAmount: {
      type: "bigint",
      hex: "0x033b2e3c9fd0803ce8000000",
    },
    longPoolAmountAdjustment: {
      type: "bigint",
      hex: "0x00",
    },
    shortPoolAmountAdjustment: {
      type: "bigint",
      hex: "0x00",
    },
    poolValueMin: {
      type: "bigint",
      hex: "0xb9ae6f030e75b41fc7ad7c5c4a59",
    },
    poolValueMax: {
      type: "bigint",
      hex: "0xb9bc8cff6bd7a1b74c1bf6dc4a59",
    },
    reserveFactorLong: {
      type: "bigint",
      hex: "0x0bfd9d94f90fbbe204f0000000",
    },
    reserveFactorShort: {
      type: "bigint",
      hex: "0x0bfd9d94f90fbbe204f0000000",
    },
    openInterestReserveFactorLong: {
      type: "bigint",
      hex: "0x0b5c0e8d21d902d61fa0000000",
    },
    openInterestReserveFactorShort: {
      type: "bigint",
      hex: "0x0b5c0e8d21d902d61fa0000000",
    },
    maxOpenInterestLong: {
      type: "bigint",
      hex: "0x02f050fe938943acc45f65568000000000",
    },
    maxOpenInterestShort: {
      type: "bigint",
      hex: "0x02f050fe938943acc45f65568000000000",
    },
    totalBorrowingFees: {
      type: "bigint",
      hex: "0x0312e29f769647e643be40a5b828",
    },
    positionImpactPoolAmount: {
      type: "bigint",
      hex: "0x2d33d8623f8865",
    },
    minPositionImpactPoolAmount: {
      type: "bigint",
      hex: "0x00",
    },
    positionImpactPoolDistributionRate: {
      type: "bigint",
      hex: "0x00",
    },
    swapImpactPoolAmountLong: {
      type: "bigint",
      hex: "0x147d7ff57b9ad81a",
    },
    swapImpactPoolAmountShort: {
      type: "bigint",
      hex: "0x01a8e72a",
    },
    borrowingFactorLong: {
      type: "bigint",
      hex: "0x0152d02c7e14af680000",
    },
    borrowingFactorShort: {
      type: "bigint",
      hex: "0x0152d02c7e14af680000",
    },
    borrowingExponentFactorLong: {
      type: "bigint",
      hex: "0x0c9f2c9cd04674edea40000000",
    },
    borrowingExponentFactorShort: {
      type: "bigint",
      hex: "0x0c9f2c9cd04674edea40000000",
    },
    fundingFactor: {
      type: "bigint",
      hex: "0x043c33c1937564800000",
    },
    fundingExponentFactor: {
      type: "bigint",
      hex: "0x0c9f2c9cd04674edea40000000",
    },
    fundingIncreaseFactorPerSecond: {
      type: "bigint",
      hex: "0x00",
    },
    fundingDecreaseFactorPerSecond: {
      type: "bigint",
      hex: "0x00",
    },
    thresholdForDecreaseFunding: {
      type: "bigint",
      hex: "0x00",
    },
    thresholdForStableFunding: {
      type: "bigint",
      hex: "0x00",
    },
    minFundingFactorPerSecond: {
      type: "bigint",
      hex: "0x00",
    },
    maxFundingFactorPerSecond: {
      type: "bigint",
      hex: "0x00",
    },
    maxPnlFactorForTradersLong: {
      type: "bigint",
      hex: "0x0a18f07d736b90be5500000000",
    },
    maxPnlFactorForTradersShort: {
      type: "bigint",
      hex: "0x0a18f07d736b90be5500000000",
    },
    minCollateralFactor: {
      type: "bigint",
      hex: "0x204fce5e3e25026110000000",
    },
    minCollateralFactorForOpenInterestLong: {
      type: "bigint",
      hex: "0x00",
    },
    minCollateralFactorForOpenInterestShort: {
      type: "bigint",
      hex: "0x00",
    },
    claimableFundingAmountLong: {
      type: "bigint",
      hex: "0x13165c0e3542c3",
    },
    claimableFundingAmountShort: {
      type: "bigint",
      hex: "0x01d670",
    },
    positionFeeFactorForPositiveImpact: {
      type: "bigint",
      hex: "0x019d971e4fe8401e74000000",
    },
    positionFeeFactorForNegativeImpact: {
      type: "bigint",
      hex: "0x024306c4097859c43c000000",
    },
    positionImpactFactorPositive: {
      type: "bigint",
      hex: "0x0a968163f0a57b400000",
    },
    positionImpactFactorNegative: {
      type: "bigint",
      hex: "0x152d02c7e14af6800000",
    },
    maxPositionImpactFactorPositive: {
      type: "bigint",
      hex: "0x204fce5e3e25026110000000",
    },
    maxPositionImpactFactorNegative: {
      type: "bigint",
      hex: "0x204fce5e3e25026110000000",
    },
    maxPositionImpactFactorForLiquidations: {
      type: "bigint",
      hex: "0x204fce5e3e25026110000000",
    },
    positionImpactExponentFactor: {
      type: "bigint",
      hex: "0x193e5939a08ce9dbd480000000",
    },
    swapFeeFactorForPositiveImpact: {
      type: "bigint",
      hex: "0x019d971e4fe8401e74000000",
    },
    swapFeeFactorForNegativeImpact: {
      type: "bigint",
      hex: "0x024306c4097859c43c000000",
    },
    swapImpactFactorPositive: {
      type: "bigint",
      hex: "0x0422ca8b0a00a425000000",
    },
    swapImpactFactorNegative: {
      type: "bigint",
      hex: "0x084595161401484a000000",
    },
    swapImpactExponentFactor: {
      type: "bigint",
      hex: "0x193e5939a08ce9dbd480000000",
    },
    borrowingFactorPerSecondForLongs: {
      type: "bigint",
      hex: "0x0132b440c5a7c78c000c",
    },
    borrowingFactorPerSecondForShorts: {
      type: "bigint",
      hex: "0x00",
    },
    fundingFactorPerSecond: {
      type: "bigint",
      hex: "0x012f61fb21f0403f2694",
    },
    longsPayShorts: true,
    virtualPoolAmountForLongToken: {
      type: "bigint",
      hex: "0x00",
    },
    virtualPoolAmountForShortToken: {
      type: "bigint",
      hex: "0x00",
    },
    virtualInventoryForPositions: {
      type: "bigint",
      hex: "0x00",
    },
    virtualMarketId: "0x0000000000000000000000000000000000000000000000000000000000000000",
    virtualLongTokenId: "0x0000000000000000000000000000000000000000000000000000000000000000",
    virtualShortTokenId: "0x0000000000000000000000000000000000000000000000000000000000000000",
  },
  indexToken: {
    name: "Avalanche",
    symbol: "AVAX",
    decimals: 18,
    address: "0x0000000000000000000000000000000000000000",
    isNative: true,
    isShortable: true,
    imageUrl: "https://assets.coingecko.com/coins/images/12559/small/coin-round-red.png?1604021818",
    wrappedAddress: "0x1D308089a2D1Ced3f1Ce36B1FcaF815b07217be3",
    prices: {
      minPrice: {
        type: "bigint",
        hex: "0x0208e8c9ceb8ae36e64f41000000",
      },
      maxPrice: {
        type: "bigint",
        hex: "0x0208e8c9ceb8ae36e64f41000000",
      },
    },
    balance: {
      type: "bigint",
      hex: "0x7ad19dcc2e798676",
    },
  },
  swapPath: [],
  initialCollateralTokenAddress: "0x3eBDeaA0DB3FfDe96E7a0DBBAFEC961FC50F725F",
  initialCollateralToken: {
    name: "USD Coin",
    symbol: "USDC",
    address: "0x3eBDeaA0DB3FfDe96E7a0DBBAFEC961FC50F725F",
    decimals: 6,
    isStable: true,
    imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
    coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
    explorerUrl: "https://testnet.snowtrace.io/address/0x3eBDeaA0DB3FfDe96E7a0DBBAFEC961FC50F725F",
    prices: {
      minPrice: {
        type: "bigint",
        hex: "0x0c9f2c9cd04674edea40000000",
      },
      maxPrice: {
        type: "bigint",
        hex: "0x0ca0b1305ce70e40af20000000",
      },
    },
    balance: {
      type: "bigint",
      hex: "0x1260d05b",
    },
  },
  targetCollateralToken: {
    name: "USD Coin",
    symbol: "USDC",
    address: "0x3eBDeaA0DB3FfDe96E7a0DBBAFEC961FC50F725F",
    decimals: 6,
    isStable: true,
    imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
    coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
    explorerUrl: "https://testnet.snowtrace.io/address/0x3eBDeaA0DB3FfDe96E7a0DBBAFEC961FC50F725F",
    prices: {
      minPrice: {
        type: "bigint",
        hex: "0x0c9f2c9cd04674edea40000000",
      },
      maxPrice: {
        type: "bigint",
        hex: "0x0ca0b1305ce70e40af20000000",
      },
    },
    balance: {
      type: "bigint",
      hex: "0x1260d05b",
    },
  },
  initialCollateralDeltaAmount: {
    type: "bigint",
    hex: "0xbc3ab0",
  },
  sizeDeltaUsd: {
    type: "bigint",
    hex: "0x00",
  },
  triggerPrice: {
    type: "bigint",
    hex: "0x00",
  },
  acceptablePrice: {
    type: "bigint",
    hex: "0x0221bc46098b5dbc3eb3ebc00000",
  },
  minOutputAmount: {
    type: "bigint",
    hex: "0x9b8b3c0e0e2dc72bdf62000000",
  },
  orderType: 4,
  orderKey: "0xb892cdce3d8bc139e56bc9162feecb98f6a3e8e3394d296d5bbb3768d78f39e6",
  isLong: false,
  reason: null,
  reasonBytes: null,
  timestamp: 1708007688,
  transaction: {
    hash: "0x0e55cbb747fc2bae9c2fc38588af6f6e3eeab823e4afd32afc628c773de33007",
    __typename: "Transaction",
  },
});

export const deposit1Usd = prepare({
  id: "0x2917cbae7e1d07e0a7126d0488fb00be3443d19025e28b66ff9ea4abe90b4618:3",
  eventName: "OrderCreated",
  account: "0x414da6c7c50eadfbd4c67c902c7daf59f58d32c7",
  marketAddress: "0xAC2c6C1b0cd1CabF78B4e8ad58aA9d43375318Cb",
  marketInfo: {
    marketTokenAddress: "0xAC2c6C1b0cd1CabF78B4e8ad58aA9d43375318Cb",
    indexTokenAddress: "0x2265F317eA5f47A684E5B26c50948617c945d986",
    longTokenAddress: "0x82F0b3695Ed2324e55bbD9A9554cB4192EC3a514",
    shortTokenAddress: "0x51290cb93bE5062A6497f16D9cd3376Adf54F920",
    isSameCollaterals: false,
    isSpotOnly: false,
    name: "DOGE/USD [ETH-DAI]",
    data: "",
    isDisabled: false,
    longToken: {
      name: "Ethereum (WETH.e)",
      symbol: "ETH",
      assetSymbol: "WETH.e",
      address: "0x82F0b3695Ed2324e55bbD9A9554cB4192EC3a514",
      decimals: 18,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880",
      coingeckoUrl: "https://www.coingecko.com/en/coins/weth",
      coingeckoSymbol: "WETH",
      explorerUrl: "https://testnet.snowtrace.io/address/0x82F0b3695Ed2324e55bbD9A9554cB4192EC3a514",
      prices: {
        minPrice: {
          type: "bigint",
          hex: "0x8c29bef70ea3f7c069ee80000000",
        },
        maxPrice: {
          type: "bigint",
          hex: "0x8c29bef70ea3f7c069ee80000000",
        },
      },
      balance: {
        type: "bigint",
        hex: "0x11431e0210d745",
      },
    },
    shortToken: {
      name: "Dai",
      symbol: "DAI",
      address: "0x51290cb93bE5062A6497f16D9cd3376Adf54F920",
      decimals: 6,
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/9956/thumb/4943.png?1636636734",
      coingeckoUrl: "https://www.coingecko.com/en/coins/dai",
      explorerUrl: "https://testnet.snowtrace.io/address/0x51290cb93bE5062A6497f16D9cd3376Adf54F920",
      prices: {
        minPrice: {
          type: "bigint",
          hex: "0x0c9f2c9cd04674edea40000000",
        },
        maxPrice: {
          type: "bigint",
          hex: "0x0ca0b1305ce70e40af20000000",
        },
      },
      balance: {
        type: "bigint",
        hex: "0x072e",
      },
    },
    indexToken: {
      name: "Dogecoin",
      symbol: "DOGE",
      decimals: 8,
      priceDecimals: 4,
      address: "0x2265F317eA5f47A684E5B26c50948617c945d986",
      isSynthetic: true,
      isShortable: true,
      coingeckoUrl: "https://www.coingecko.com/en/coins/dogecoin",
      prices: {
        minPrice: {
          type: "bigint",
          hex: "0x011b7142687318ed15d1800000",
        },
        maxPrice: {
          type: "bigint",
          hex: "0x011b7142687318ed15d1800000",
        },
      },
    },
    longInterestUsd: {
      type: "bigint",
      hex: "0xfa55dabd2e2e76bec0e834d40000",
    },
    shortInterestUsd: {
      type: "bigint",
      hex: "0x0140631b25be0bf21fef9d4b480000",
    },
    longInterestInTokens: {
      type: "bigint",
      hex: "0x058d5715ac9f",
    },
    shortInterestInTokens: {
      type: "bigint",
      hex: "0x0718c35873fc",
    },
    longPoolAmount: {
      type: "bigint",
      hex: "0x6af50383aaf91cc8",
    },
    shortPoolAmount: {
      type: "bigint",
      hex: "0x01dc2a3c6d",
    },
    maxLongPoolAmountForDeposit: {
      type: "bigint",
      hex: "0x033b2e3c9fd0803ce8000000",
    },
    maxShortPoolAmountForDeposit: {
      type: "bigint",
      hex: "0x033b2e3c9fd0803ce8000000",
    },
    maxLongPoolAmount: {
      type: "bigint",
      hex: "0x033b2e3c9fd0803ce8000000",
    },
    maxShortPoolAmount: {
      type: "bigint",
      hex: "0x033b2e3c9fd0803ce8000000",
    },
    longPoolAmountAdjustment: {
      type: "bigint",
      hex: "0x00",
    },
    shortPoolAmountAdjustment: {
      type: "bigint",
      hex: "0x00",
    },
    poolValueMin: {
      type: "bigint",
      hex: "0x05c5aff17ef19c51e3390cc886d66d",
    },
    poolValueMax: {
      type: "bigint",
      hex: "0x05c5df4f63ce406fada4fc8a06d66d",
    },
    reserveFactorLong: {
      type: "bigint",
      hex: "0x0bfd9d94f90fbbe204f0000000",
    },
    reserveFactorShort: {
      type: "bigint",
      hex: "0x0bfd9d94f90fbbe204f0000000",
    },
    openInterestReserveFactorLong: {
      type: "bigint",
      hex: "0x0b5c0e8d21d902d61fa0000000",
    },
    openInterestReserveFactorShort: {
      type: "bigint",
      hex: "0x0b5c0e8d21d902d61fa0000000",
    },
    maxOpenInterestLong: {
      type: "bigint",
      hex: "0x02f050fe938943acc45f65568000000000",
    },
    maxOpenInterestShort: {
      type: "bigint",
      hex: "0x02f050fe938943acc45f65568000000000",
    },
    totalBorrowingFees: {
      type: "bigint",
      hex: "0x44ffb6d9efc35b60f80a10eab6",
    },
    positionImpactPoolAmount: {
      type: "bigint",
      hex: "0x05f5e100",
    },
    minPositionImpactPoolAmount: {
      type: "bigint",
      hex: "0x05f5e100",
    },
    positionImpactPoolDistributionRate: {
      type: "bigint",
      hex: "0x024fa54b36a2e6a910447800000000",
    },
    swapImpactPoolAmountLong: {
      type: "bigint",
      hex: "0x29ddf0e98e7da8d7",
    },
    swapImpactPoolAmountShort: {
      type: "bigint",
      hex: "0x175a0e44",
    },
    borrowingFactorLong: {
      type: "bigint",
      hex: "0x0152d02c7e14af680000",
    },
    borrowingFactorShort: {
      type: "bigint",
      hex: "0x0152d02c7e14af680000",
    },
    borrowingExponentFactorLong: {
      type: "bigint",
      hex: "0x0c9f2c9cd04674edea40000000",
    },
    borrowingExponentFactorShort: {
      type: "bigint",
      hex: "0x0c9f2c9cd04674edea40000000",
    },
    fundingFactor: {
      type: "bigint",
      hex: "0x043c33c1937564800000",
    },
    fundingExponentFactor: {
      type: "bigint",
      hex: "0x0c9f2c9cd04674edea40000000",
    },
    fundingIncreaseFactorPerSecond: {
      type: "bigint",
      hex: "0x00",
    },
    fundingDecreaseFactorPerSecond: {
      type: "bigint",
      hex: "0x00",
    },
    thresholdForDecreaseFunding: {
      type: "bigint",
      hex: "0x00",
    },
    thresholdForStableFunding: {
      type: "bigint",
      hex: "0x00",
    },
    minFundingFactorPerSecond: {
      type: "bigint",
      hex: "0x00",
    },
    maxFundingFactorPerSecond: {
      type: "bigint",
      hex: "0x00",
    },
    maxPnlFactorForTradersLong: {
      type: "bigint",
      hex: "0x0a18f07d736b90be5500000000",
    },
    maxPnlFactorForTradersShort: {
      type: "bigint",
      hex: "0x0a18f07d736b90be5500000000",
    },
    minCollateralFactor: {
      type: "bigint",
      hex: "0x204fce5e3e25026110000000",
    },
    minCollateralFactorForOpenInterestLong: {
      type: "bigint",
      hex: "0x00",
    },
    minCollateralFactorForOpenInterestShort: {
      type: "bigint",
      hex: "0x00",
    },
    claimableFundingAmountLong: {
      type: "bigint",
      hex: "0x00",
    },
    claimableFundingAmountShort: {
      type: "bigint",
      hex: "0xa3aa",
    },
    positionFeeFactorForPositiveImpact: {
      type: "bigint",
      hex: "0x019d971e4fe8401e74000000",
    },
    positionFeeFactorForNegativeImpact: {
      type: "bigint",
      hex: "0x024306c4097859c43c000000",
    },
    positionImpactFactorPositive: {
      type: "bigint",
      hex: "0x0a968163f0a57b400000",
    },
    positionImpactFactorNegative: {
      type: "bigint",
      hex: "0x152d02c7e14af6800000",
    },
    maxPositionImpactFactorPositive: {
      type: "bigint",
      hex: "0x204fce5e3e25026110000000",
    },
    maxPositionImpactFactorNegative: {
      type: "bigint",
      hex: "0x204fce5e3e25026110000000",
    },
    maxPositionImpactFactorForLiquidations: {
      type: "bigint",
      hex: "0x204fce5e3e25026110000000",
    },
    positionImpactExponentFactor: {
      type: "bigint",
      hex: "0x193e5939a08ce9dbd480000000",
    },
    swapFeeFactorForPositiveImpact: {
      type: "bigint",
      hex: "0x019d971e4fe8401e74000000",
    },
    swapFeeFactorForNegativeImpact: {
      type: "bigint",
      hex: "0x024306c4097859c43c000000",
    },
    swapImpactFactorPositive: {
      type: "bigint",
      hex: "0x0422ca8b0a00a425000000",
    },
    swapImpactFactorNegative: {
      type: "bigint",
      hex: "0x084595161401484a000000",
    },
    swapImpactExponentFactor: {
      type: "bigint",
      hex: "0x193e5939a08ce9dbd480000000",
    },
    borrowingFactorPerSecondForLongs: {
      type: "bigint",
      hex: "0x00",
    },
    borrowingFactorPerSecondForShorts: {
      type: "bigint",
      hex: "0x01139954c6584c493782",
    },
    fundingFactorPerSecond: {
      type: "bigint",
      hex: "0x8513d16a358eebbe3c",
    },
    longsPayShorts: false,
    virtualPoolAmountForLongToken: {
      type: "bigint",
      hex: "0x00",
    },
    virtualPoolAmountForShortToken: {
      type: "bigint",
      hex: "0x00",
    },
    virtualInventoryForPositions: {
      type: "bigint",
      hex: "0x00",
    },
    virtualMarketId: "0x0000000000000000000000000000000000000000000000000000000000000000",
    virtualLongTokenId: "0x275d2a6e341e6a078d4eee59b08907d1e50825031c5481f9551284f4b7ee2fb9",
    virtualShortTokenId: "0x0000000000000000000000000000000000000000000000000000000000000000",
  },
  indexToken: {
    name: "Dogecoin",
    symbol: "DOGE",
    decimals: 8,
    priceDecimals: 4,
    address: "0x2265F317eA5f47A684E5B26c50948617c945d986",
    isSynthetic: true,
    isShortable: true,
    coingeckoUrl: "https://www.coingecko.com/en/coins/dogecoin",
    prices: {
      minPrice: {
        type: "bigint",
        hex: "0x011b7142687318ed15d1800000",
      },
      maxPrice: {
        type: "bigint",
        hex: "0x011b7142687318ed15d1800000",
      },
    },
  },
  swapPath: [],
  initialCollateralTokenAddress: "0x51290cb93bE5062A6497f16D9cd3376Adf54F920",
  initialCollateralToken: {
    name: "Dai",
    symbol: "DAI",
    address: "0x51290cb93bE5062A6497f16D9cd3376Adf54F920",
    decimals: 6,
    isStable: true,
    imageUrl: "https://assets.coingecko.com/coins/images/9956/thumb/4943.png?1636636734",
    coingeckoUrl: "https://www.coingecko.com/en/coins/dai",
    explorerUrl: "https://testnet.snowtrace.io/address/0x51290cb93bE5062A6497f16D9cd3376Adf54F920",
    prices: {
      minPrice: {
        type: "bigint",
        hex: "0x0c9f2c9cd04674edea40000000",
      },
      maxPrice: {
        type: "bigint",
        hex: "0x0ca0b1305ce70e40af20000000",
      },
    },
    balance: {
      type: "bigint",
      hex: "0x072e",
    },
  },
  targetCollateralToken: {
    name: "Dai",
    symbol: "DAI",
    address: "0x51290cb93bE5062A6497f16D9cd3376Adf54F920",
    decimals: 6,
    isStable: true,
    imageUrl: "https://assets.coingecko.com/coins/images/9956/thumb/4943.png?1636636734",
    coingeckoUrl: "https://www.coingecko.com/en/coins/dai",
    explorerUrl: "https://testnet.snowtrace.io/address/0x51290cb93bE5062A6497f16D9cd3376Adf54F920",
    prices: {
      minPrice: {
        type: "bigint",
        hex: "0x0c9f2c9cd04674edea40000000",
      },
      maxPrice: {
        type: "bigint",
        hex: "0x0ca0b1305ce70e40af20000000",
      },
    },
    balance: {
      type: "bigint",
      hex: "0x072e",
    },
  },
  initialCollateralDeltaAmount: {
    type: "bigint",
    hex: "0xc350",
  },
  sizeDeltaUsd: {
    type: "bigint",
    hex: "0x00",
  },
  triggerPrice: {
    type: "bigint",
    hex: "0x00",
  },
  acceptablePrice: {
    type: "bigint",
    hex: "0x011323b776d9589200e7e80000",
  },
  minOutputAmount: {
    type: "bigint",
    hex: "0x00",
  },
  orderType: 2,
  orderKey: "0x6bafe2942d6feb80ca9c851201c46a6ac41471f141dfa7c781edd6629c5cfb70",
  isLong: true,
  reason: null,
  reasonBytes: null,
  timestamp: 1708018244,
  transaction: {
    hash: "0x2917cbae7e1d07e0a7126d0488fb00be3443d19025e28b66ff9ea4abe90b4618",
    __typename: "Transaction",
  },
});

export const createOrderDecreaseLong = prepare({
  id: "0x72899a3e8e11ebdcbd98fa5d97ff7d59770a0d891142b494e92a71ca67575955:2",
  eventName: "OrderCreated",
  account: "0xc9e1ce91d3f782499cfe787b6f1d2af0ca76c049",
  marketAddress: "0x339eF6aAcF8F4B2AD15BdcECBEED1842Ec4dBcBf",
  marketInfo: {
    marketTokenAddress: "0x339eF6aAcF8F4B2AD15BdcECBEED1842Ec4dBcBf",
    indexTokenAddress: "0xCcF73F4Dcbbb573296BFA656b754Fe94BB957d62",
    longTokenAddress: "0xCcF73F4Dcbbb573296BFA656b754Fe94BB957d62",
    shortTokenAddress: "0x04FC936a15352a1b15b3B9c56EA002051e3DB3e5",
    isSameCollaterals: false,
    isSpotOnly: false,
    name: "BTC/USD [BTC-USDC]",
    data: "",
    isDisabled: false,
    longToken: {
      name: "Bitcoin",
      symbol: "BTC",
      decimals: 8,
      address: "0xCcF73F4Dcbbb573296BFA656b754Fe94BB957d62",
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/7598/thumb/wrapped_bitcoin_wbtc.png?1548822744",
      coingeckoUrl: "https://www.coingecko.com/en/coins/bitcoin",
      explorerUrl: "https://goerli.arbiscan.io/address/0xCcF73F4Dcbbb573296BFA656b754Fe94BB957d62",
      prices: {
        minPrice: {
          type: "bigint",
          hex: "0x0516893b936002a4cd3f1d10000000",
        },
        maxPrice: {
          type: "bigint",
          hex: "0x0516893b936002a4cd3f1d10000000",
        },
      },
      balance: {
        type: "bigint",
        hex: "0x04b571c0",
      },
    },
    shortToken: {
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      address: "0x04FC936a15352a1b15b3B9c56EA002051e3DB3e5",
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
      coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
      explorerUrl: "https://goerli.arbiscan.io/address/0x04FC936a15352a1b15b3B9c56EA002051e3DB3e5",
      prices: {
        minPrice: {
          type: "bigint",
          hex: "0x0c9f2c9cd04674edea40000000",
        },
        maxPrice: {
          type: "bigint",
          hex: "0x0c9f456d8f88b0f1c31e000000",
        },
      },
      balance: {
        type: "bigint",
        hex: "0x03312adc93",
      },
    },
    indexToken: {
      name: "Bitcoin",
      symbol: "BTC",
      decimals: 8,
      address: "0xCcF73F4Dcbbb573296BFA656b754Fe94BB957d62",
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/7598/thumb/wrapped_bitcoin_wbtc.png?1548822744",
      coingeckoUrl: "https://www.coingecko.com/en/coins/bitcoin",
      explorerUrl: "https://goerli.arbiscan.io/address/0xCcF73F4Dcbbb573296BFA656b754Fe94BB957d62",
      prices: {
        minPrice: {
          type: "bigint",
          hex: "0x0516893b936002a4cd3f1d10000000",
        },
        maxPrice: {
          type: "bigint",
          hex: "0x0516893b936002a4cd3f1d10000000",
        },
      },
      balance: {
        type: "bigint",
        hex: "0x04b571c0",
      },
    },
    longInterestUsd: {
      type: "bigint",
      hex: "0x8d151dda39e2f3d6ca7318000000",
    },
    shortInterestUsd: {
      type: "bigint",
      hex: "0xdbe32f323e0c4c6831d2dc900000",
    },
    longInterestInTokens: {
      type: "bigint",
      hex: "0xa3ea16",
    },
    shortInterestInTokens: {
      type: "bigint",
      hex: "0x0107657e",
    },
    longPoolAmount: {
      type: "bigint",
      hex: "0x02b24068",
    },
    shortPoolAmount: {
      type: "bigint",
      hex: "0x06102f5c1c",
    },
    maxLongPoolAmount: {
      type: "bigint",
      hex: "0x033b2e3c9fd0803ce8000000",
    },
    maxShortPoolAmount: {
      type: "bigint",
      hex: "0x033b2e3c9fd0803ce8000000",
    },
    longPoolAmountAdjustment: {
      type: "bigint",
      hex: "0x00",
    },
    shortPoolAmountAdjustment: {
      type: "bigint",
      hex: "0x00",
    },
    poolValueMin: {
      type: "bigint",
      hex: "0x075604a051118873263d1c8933c137",
    },
    poolValueMax: {
      type: "bigint",
      hex: "0x07560e7ca3e3e583ea140fe953c137",
    },
    reserveFactorLong: {
      type: "bigint",
      hex: "0x0b5c0e8d21d902d61fa0000000",
    },
    reserveFactorShort: {
      type: "bigint",
      hex: "0x0b5c0e8d21d902d61fa0000000",
    },
    openInterestReserveFactorLong: {
      type: "bigint",
      hex: "0x0a18f07d736b90be5500000000",
    },
    openInterestReserveFactorShort: {
      type: "bigint",
      hex: "0x0a18f07d736b90be5500000000",
    },
    maxOpenInterestLong: {
      type: "bigint",
      hex: "0x02f050fe938943acc45f65568000000000",
    },
    maxOpenInterestShort: {
      type: "bigint",
      hex: "0x02f050fe938943acc45f65568000000000",
    },
    totalBorrowingFees: {
      type: "bigint",
      hex: "0x2ae01a651ad1a71f94202c9027",
    },
    positionImpactPoolAmount: {
      type: "bigint",
      hex: "0x0197ea",
    },
    swapImpactPoolAmountLong: {
      type: "bigint",
      hex: "0x49",
    },
    swapImpactPoolAmountShort: {
      type: "bigint",
      hex: "0x04b76bc737",
    },
    borrowingFactorLong: {
      type: "bigint",
      hex: "0x0152d02c7e14af680000",
    },
    borrowingFactorShort: {
      type: "bigint",
      hex: "0x0152d02c7e14af680000",
    },
    borrowingExponentFactorLong: {
      type: "bigint",
      hex: "0x0c9f2c9cd04674edea40000000",
    },
    borrowingExponentFactorShort: {
      type: "bigint",
      hex: "0x0c9f2c9cd04674edea40000000",
    },
    fundingFactor: {
      type: "bigint",
      hex: "0x043c33c1937564800000",
    },
    fundingExponentFactor: {
      type: "bigint",
      hex: "0x0c9f2c9cd04674edea40000000",
    },
    maxPnlFactorForTradersLong: {
      type: "bigint",
      hex: "0x0a18f07d736b90be5500000000",
    },
    maxPnlFactorForTradersShort: {
      type: "bigint",
      hex: "0x0a18f07d736b90be5500000000",
    },
    minCollateralFactor: {
      type: "bigint",
      hex: "0x204fce5e3e25026110000000",
    },
    minCollateralFactorForOpenInterestLong: {
      type: "bigint",
      hex: "0x00",
    },
    minCollateralFactorForOpenInterestShort: {
      type: "bigint",
      hex: "0x00",
    },
    claimableFundingAmountLong: {
      type: "bigint",
      hex: "0x00",
    },
    claimableFundingAmountShort: {
      type: "bigint",
      hex: "0x0bbc20",
    },
    positionFeeFactorForPositiveImpact: {
      type: "bigint",
      hex: "0x019d971e4fe8401e74000000",
    },
    positionFeeFactorForNegativeImpact: {
      type: "bigint",
      hex: "0x024306c4097859c43c000000",
    },
    positionImpactFactorPositive: {
      type: "bigint",
      hex: "0x0a968163f0a57b400000",
    },
    positionImpactFactorNegative: {
      type: "bigint",
      hex: "0x152d02c7e14af6800000",
    },
    maxPositionImpactFactorPositive: {
      type: "bigint",
      hex: "0x204fce5e3e25026110000000",
    },
    maxPositionImpactFactorNegative: {
      type: "bigint",
      hex: "0x204fce5e3e25026110000000",
    },
    maxPositionImpactFactorForLiquidations: {
      type: "bigint",
      hex: "0x204fce5e3e25026110000000",
    },
    positionImpactExponentFactor: {
      type: "bigint",
      hex: "0x193e5939a08ce9dbd480000000",
    },
    swapFeeFactorForPositiveImpact: {
      type: "bigint",
      hex: "0x019d971e4fe8401e74000000",
    },
    swapFeeFactorForNegativeImpact: {
      type: "bigint",
      hex: "0x024306c4097859c43c000000",
    },
    swapImpactFactorPositive: {
      type: "bigint",
      hex: "0x0422ca8b0a00a425000000",
    },
    swapImpactFactorNegative: {
      type: "bigint",
      hex: "0x084595161401484a000000",
    },
    swapImpactExponentFactor: {
      type: "bigint",
      hex: "0x193e5939a08ce9dbd480000000",
    },
    borrowingFactorPerSecondForLongs: {
      type: "bigint",
      hex: "0x00",
    },
    borrowingFactorPerSecondForShorts: {
      type: "bigint",
      hex: "0x3a06759dd7f012b91a",
    },
    fundingFactorPerSecond: {
      type: "bigint",
      hex: "0xecb26eec42fc7658e0",
    },
    longsPayShorts: false,
    virtualPoolAmountForLongToken: {
      type: "bigint",
      hex: "0x02b24068",
    },
    virtualPoolAmountForShortToken: {
      type: "bigint",
      hex: "0x06102f5c1c",
    },
    virtualInventoryForPositions: {
      type: "bigint",
      hex: "-0x3885f95a824cd6d349eb2ab00000",
    },
    virtualMarketId: "0x11111137e2e8ae1c70c421e7a0dd36e023e0d6217198f889f9eb9c2a6727481f",
    virtualLongTokenId: "0x04533137e2e8ae1c11111111a0dd36e023e0d6217198f889f9eb9c2a6727481d",
    virtualShortTokenId: "0x0000000000000000000000000000000000000000000000000000000000000000",
  },
  indexToken: {
    name: "Bitcoin",
    symbol: "BTC",
    decimals: 8,
    address: "0xCcF73F4Dcbbb573296BFA656b754Fe94BB957d62",
    isShortable: true,
    imageUrl: "https://assets.coingecko.com/coins/images/7598/thumb/wrapped_bitcoin_wbtc.png?1548822744",
    coingeckoUrl: "https://www.coingecko.com/en/coins/bitcoin",
    explorerUrl: "https://goerli.arbiscan.io/address/0xCcF73F4Dcbbb573296BFA656b754Fe94BB957d62",
    prices: {
      minPrice: {
        type: "bigint",
        hex: "0x0516893b936002a4cd3f1d10000000",
      },
      maxPrice: {
        type: "bigint",
        hex: "0x0516893b936002a4cd3f1d10000000",
      },
    },
    balance: {
      type: "bigint",
      hex: "0x04b571c0",
    },
  },
  swapPath: [],
  initialCollateralTokenAddress: "0x04FC936a15352a1b15b3B9c56EA002051e3DB3e5",
  initialCollateralToken: {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    address: "0x04FC936a15352a1b15b3B9c56EA002051e3DB3e5",
    isStable: true,
    imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
    coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
    explorerUrl: "https://goerli.arbiscan.io/address/0x04FC936a15352a1b15b3B9c56EA002051e3DB3e5",
    prices: {
      minPrice: {
        type: "bigint",
        hex: "0x0c9f2c9cd04674edea40000000",
      },
      maxPrice: {
        type: "bigint",
        hex: "0x0c9f456d8f88b0f1c31e000000",
      },
    },
    balance: {
      type: "bigint",
      hex: "0x03312adc93",
    },
  },
  targetCollateralToken: {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    address: "0x04FC936a15352a1b15b3B9c56EA002051e3DB3e5",
    isStable: true,
    imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
    coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
    explorerUrl: "https://goerli.arbiscan.io/address/0x04FC936a15352a1b15b3B9c56EA002051e3DB3e5",
    prices: {
      minPrice: {
        type: "bigint",
        hex: "0x0c9f2c9cd04674edea40000000",
      },
      maxPrice: {
        type: "bigint",
        hex: "0x0c9f456d8f88b0f1c31e000000",
      },
    },
    balance: {
      type: "bigint",
      hex: "0x03312adc93",
    },
  },
  initialCollateralDeltaAmount: {
    type: "bigint",
    hex: "0x019632cc",
  },
  sizeDeltaUsd: {
    type: "bigint",
    hex: "0x0d204b867ae0cad26c1ef0000000",
  },
  triggerPrice: {
    type: "bigint",
    hex: "0x05c71d3c089740a6a8ab2c00000000",
  },
  acceptablePrice: {
    type: "bigint",
    hex: "0x05b852b3c0d32e15a1dca900000000",
  },
  minOutputAmount: {
    type: "bigint",
    hex: "0x00",
  },
  orderType: 5,
  orderKey: "0x2cb19912edeb90ae392a715ca4770a8510e7bc05418a3d16c4cbda3fb4438acf",
  isLong: true,
  reason: null,
  timestamp: 1694770176,
  transaction: {
    hash: "0x72899a3e8e11ebdcbd98fa5d97ff7d59770a0d891142b494e92a71ca67575955",
    __typename: "Transaction",
  },
});

export const cancelOrderIncreaseLong = prepare({
  id: "0xe9444461179ef70b01b080c5fb6e044c3acb01696a1cf7f2e6445363a453aba4:1",
  eventName: "OrderCancelled",
  account: "0x9a68746711b1314edbbdbcc8f1e1887276bd361e",
  marketAddress: "0x1529876A9348D61C6c4a3EEe1fe6CbF1117Ca315",
  marketInfo: {
    marketTokenAddress: "0x1529876A9348D61C6c4a3EEe1fe6CbF1117Ca315",
    indexTokenAddress: "0xe39Ab88f8A4777030A534146A9Ca3B52bd5D43A3",
    longTokenAddress: "0xe39Ab88f8A4777030A534146A9Ca3B52bd5D43A3",
    shortTokenAddress: "0x04FC936a15352a1b15b3B9c56EA002051e3DB3e5",
    isSameCollaterals: false,
    isSpotOnly: false,
    name: "ETH/USD [WETH-USDC]",
    data: "",
    isDisabled: false,
    longToken: {
      name: "Wrapped Ethereum",
      symbol: "WETH",
      decimals: 18,
      address: "0xe39Ab88f8A4777030A534146A9Ca3B52bd5D43A3",
      isWrapped: true,
      baseSymbol: "ETH",
      imageUrl: "https://assets.coingecko.com/coins/images/2518/thumb/weth.png?1628852295",
      coingeckoUrl: "https://www.coingecko.com/en/coins/ethereum",
      explorerUrl: "https://goerli.arbiscan.io/address/0xe39Ab88f8A4777030A534146A9Ca3B52bd5D43A3",
      prices: {
        minPrice: {
          type: "bigint",
          hex: "0x4fffe06fdbae5caf74e5d8000000",
        },
        maxPrice: {
          type: "bigint",
          hex: "0x4fffe06fdbae5caf74e5d8000000",
        },
      },
    },
    shortToken: {
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      address: "0x04FC936a15352a1b15b3B9c56EA002051e3DB3e5",
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
      coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
      explorerUrl: "https://goerli.arbiscan.io/address/0x04FC936a15352a1b15b3B9c56EA002051e3DB3e5",
      prices: {
        minPrice: {
          type: "bigint",
          hex: "0x0c9f2c9cd04674edea40000000",
        },
        maxPrice: {
          type: "bigint",
          hex: "0x0c9f456d8f88b0f1c31e000000",
        },
      },
    },
    indexToken: {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
      address: "0x0000000000000000000000000000000000000000",
      isNative: true,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880",
      wrappedAddress: "0xe39Ab88f8A4777030A534146A9Ca3B52bd5D43A3",
      prices: {
        minPrice: {
          type: "bigint",
          hex: "0x4fffe06fdbae5caf74e5d8000000",
        },
        maxPrice: {
          type: "bigint",
          hex: "0x4fffe06fdbae5caf74e5d8000000",
        },
      },
    },
    longInterestUsd: {
      type: "bigint",
      hex: "0x01af50ec949321a889571b153c0000",
    },
    shortInterestUsd: {
      type: "bigint",
      hex: "0x77a266f7371cc95bf30190200000",
    },
    longInterestInTokens: {
      type: "bigint",
      hex: "0x44cf820531daea33",
    },
    shortInterestInTokens: {
      type: "bigint",
      hex: "0x13a39f8e7b584ed3",
    },
    longPoolAmount: {
      type: "bigint",
      hex: "0xcdf8585f19fbef21",
    },
    shortPoolAmount: {
      type: "bigint",
      hex: "0xa92af2a9",
    },
    maxLongPoolAmount: {
      type: "bigint",
      hex: "0x033b2e3c9fd0803ce8000000",
    },
    maxShortPoolAmount: {
      type: "bigint",
      hex: "0x033b2e3c9fd0803ce8000000",
    },
    longPoolAmountAdjustment: {
      type: "bigint",
      hex: "0x00",
    },
    shortPoolAmountAdjustment: {
      type: "bigint",
      hex: "0x00",
    },
    poolValueMin: {
      type: "bigint",
      hex: "0x054c4c094100f0e6f4710d1d4be8fd",
    },
    poolValueMax: {
      type: "bigint",
      hex: "0x054c4d1c5f3bf1b60002522bc3e8fd",
    },
    reserveFactorLong: {
      type: "bigint",
      hex: "0x0b5c0e8d21d902d61fa0000000",
    },
    reserveFactorShort: {
      type: "bigint",
      hex: "0x0b5c0e8d21d902d61fa0000000",
    },
    openInterestReserveFactorLong: {
      type: "bigint",
      hex: "0x0a18f07d736b90be5500000000",
    },
    openInterestReserveFactorShort: {
      type: "bigint",
      hex: "0x0a18f07d736b90be5500000000",
    },
    maxOpenInterestLong: {
      type: "bigint",
      hex: "0x02f050fe938943acc45f65568000000000",
    },
    maxOpenInterestShort: {
      type: "bigint",
      hex: "0x02f050fe938943acc45f65568000000000",
    },
    totalBorrowingFees: {
      type: "bigint",
      hex: "0x02a1527b2029038ab8110a2a1b9b",
    },
    positionImpactPoolAmount: {
      type: "bigint",
      hex: "0x25cf2e00e8141c",
    },
    swapImpactPoolAmountLong: {
      type: "bigint",
      hex: "0xa7dac58934ecfca5",
    },
    swapImpactPoolAmountShort: {
      type: "bigint",
      hex: "0x08f62c",
    },
    borrowingFactorLong: {
      type: "bigint",
      hex: "0x0152d02c7e14af680000",
    },
    borrowingFactorShort: {
      type: "bigint",
      hex: "0x0152d02c7e14af680000",
    },
    borrowingExponentFactorLong: {
      type: "bigint",
      hex: "0x0c9f2c9cd04674edea40000000",
    },
    borrowingExponentFactorShort: {
      type: "bigint",
      hex: "0x0c9f2c9cd04674edea40000000",
    },
    fundingFactor: {
      type: "bigint",
      hex: "0x043c33c1937564800000",
    },
    fundingExponentFactor: {
      type: "bigint",
      hex: "0x0c9f2c9cd04674edea40000000",
    },
    maxPnlFactorForTradersLong: {
      type: "bigint",
      hex: "0x0a18f07d736b90be5500000000",
    },
    maxPnlFactorForTradersShort: {
      type: "bigint",
      hex: "0x0a18f07d736b90be5500000000",
    },
    minCollateralFactor: {
      type: "bigint",
      hex: "0x204fce5e3e25026110000000",
    },
    minCollateralFactorForOpenInterestLong: {
      type: "bigint",
      hex: "0x00",
    },
    minCollateralFactorForOpenInterestShort: {
      type: "bigint",
      hex: "0x00",
    },
    claimableFundingAmountLong: {
      type: "bigint",
      hex: "0x00",
    },
    claimableFundingAmountShort: {
      type: "bigint",
      hex: "0x00",
    },
    positionFeeFactorForPositiveImpact: {
      type: "bigint",
      hex: "0x019d971e4fe8401e74000000",
    },
    positionFeeFactorForNegativeImpact: {
      type: "bigint",
      hex: "0x024306c4097859c43c000000",
    },
    positionImpactFactorPositive: {
      type: "bigint",
      hex: "0x0a968163f0a57b400000",
    },
    positionImpactFactorNegative: {
      type: "bigint",
      hex: "0x152d02c7e14af6800000",
    },
    maxPositionImpactFactorPositive: {
      type: "bigint",
      hex: "0x204fce5e3e25026110000000",
    },
    maxPositionImpactFactorNegative: {
      type: "bigint",
      hex: "0x204fce5e3e25026110000000",
    },
    maxPositionImpactFactorForLiquidations: {
      type: "bigint",
      hex: "0x204fce5e3e25026110000000",
    },
    positionImpactExponentFactor: {
      type: "bigint",
      hex: "0x193e5939a08ce9dbd480000000",
    },
    swapFeeFactorForPositiveImpact: {
      type: "bigint",
      hex: "0x019d971e4fe8401e74000000",
    },
    swapFeeFactorForNegativeImpact: {
      type: "bigint",
      hex: "0x024306c4097859c43c000000",
    },
    swapImpactFactorPositive: {
      type: "bigint",
      hex: "0x0422ca8b0a00a425000000",
    },
    swapImpactFactorNegative: {
      type: "bigint",
      hex: "0x084595161401484a000000",
    },
    swapImpactExponentFactor: {
      type: "bigint",
      hex: "0x193e5939a08ce9dbd480000000",
    },
    borrowingFactorPerSecondForLongs: {
      type: "bigint",
      hex: "0x7130db903ec145a31e",
    },
    borrowingFactorPerSecondForShorts: {
      type: "bigint",
      hex: "0x00",
    },
    fundingFactorPerSecond: {
      type: "bigint",
      hex: "0x026559d766a55b1c18d8",
    },
    longsPayShorts: true,
    virtualPoolAmountForLongToken: {
      type: "bigint",
      hex: "0xdbb0e89f08c9cc6e",
    },
    virtualPoolAmountForShortToken: {
      type: "bigint",
      hex: "0x011f58e15d00a69966",
    },
    virtualInventoryForPositions: {
      type: "bigint",
      hex: "0x00",
    },
    virtualMarketId: "0x04533437e2e8ae1c70c421e7a0dd36e023e0d6217198f889f9eb9c2a6727481d",
    virtualLongTokenId: "0x0000000000000000000000000000000000000000000000000000000000000000",
    virtualShortTokenId: "0x0000000000000000000000000000000000000000000000000000000000000000",
  },
  indexToken: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
    address: "0x0000000000000000000000000000000000000000",
    isNative: true,
    isShortable: true,
    imageUrl: "https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880",
    wrappedAddress: "0xe39Ab88f8A4777030A534146A9Ca3B52bd5D43A3",
    prices: {
      minPrice: {
        type: "bigint",
        hex: "0x4fffe06fdbae5caf74e5d8000000",
      },
      maxPrice: {
        type: "bigint",
        hex: "0x4fffe06fdbae5caf74e5d8000000",
      },
    },
  },
  swapPath: ["0x1529876A9348D61C6c4a3EEe1fe6CbF1117Ca315"],
  initialCollateralTokenAddress: "0xe39Ab88f8A4777030A534146A9Ca3B52bd5D43A3",
  initialCollateralToken: {
    name: "Wrapped Ethereum",
    symbol: "WETH",
    decimals: 18,
    address: "0xe39Ab88f8A4777030A534146A9Ca3B52bd5D43A3",
    isWrapped: true,
    baseSymbol: "ETH",
    imageUrl: "https://assets.coingecko.com/coins/images/2518/thumb/weth.png?1628852295",
    coingeckoUrl: "https://www.coingecko.com/en/coins/ethereum",
    explorerUrl: "https://goerli.arbiscan.io/address/0xe39Ab88f8A4777030A534146A9Ca3B52bd5D43A3",
    prices: {
      minPrice: {
        type: "bigint",
        hex: "0x4fffe06fdbae5caf74e5d8000000",
      },
      maxPrice: {
        type: "bigint",
        hex: "0x4fffe06fdbae5caf74e5d8000000",
      },
    },
    balance: {
      type: "bigint",
      hex: "0x00",
    },
  },
  targetCollateralToken: {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    address: "0x04FC936a15352a1b15b3B9c56EA002051e3DB3e5",
    isStable: true,
    imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
    coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
    explorerUrl: "https://goerli.arbiscan.io/address/0x04FC936a15352a1b15b3B9c56EA002051e3DB3e5",
    prices: {
      minPrice: {
        type: "bigint",
        hex: "0x0c9f2c9cd04674edea40000000",
      },
      maxPrice: {
        type: "bigint",
        hex: "0x0c9f456d8f88b0f1c31e000000",
      },
    },
    balance: {
      type: "bigint",
      hex: "0x03312adc93",
    },
  },
  initialCollateralDeltaAmount: {
    type: "bigint",
    hex: "0x2386f26fc10000",
  },
  sizeDeltaUsd: {
    type: "bigint",
    hex: "0x33ef189b49394e91a0c5600000",
  },
  triggerPrice: {
    type: "bigint",
    hex: "0x5055eb5a180a0bd64ac3c0000000",
  },
  acceptablePrice: {
    type: "bigint",
    hex: "0x5123941afeadfc986f5a30000000",
  },
  minOutputAmount: {
    type: "bigint",
    hex: "0x00",
  },
  orderType: 3,
  orderKey: "0x17dc6ec45b31e95185dbe2bf5dccf21eb4c05f731fd2b0d48947f8173959132f",
  isLong: true,
  reason: "USER_INITIATED_CANCEL",
  timestamp: 1694770633,
  transaction: {
    hash: "0xe9444461179ef70b01b080c5fb6e044c3acb01696a1cf7f2e6445363a453aba4",
    __typename: "Transaction",
  },
});

export const createOrderIncreaseLong = prepare({
  id: "0x1290b5858dc8efa0e2eec75a241fa95bdb5f9a58950a57bf540f269edff18751:2",
  eventName: "OrderCreated",
  account: "0x0a6ad098f65c048d1aa263d38ea174e781ae6899",
  marketAddress: "0x339eF6aAcF8F4B2AD15BdcECBEED1842Ec4dBcBf",
  marketInfo: {
    marketTokenAddress: "0x339eF6aAcF8F4B2AD15BdcECBEED1842Ec4dBcBf",
    indexTokenAddress: "0xCcF73F4Dcbbb573296BFA656b754Fe94BB957d62",
    longTokenAddress: "0xCcF73F4Dcbbb573296BFA656b754Fe94BB957d62",
    shortTokenAddress: "0x04FC936a15352a1b15b3B9c56EA002051e3DB3e5",
    isSameCollaterals: false,
    isSpotOnly: false,
    name: "BTC/USD [BTC-USDC]",
    data: "",
    isDisabled: false,
    longToken: {
      name: "Bitcoin",
      symbol: "BTC",
      decimals: 8,
      address: "0xCcF73F4Dcbbb573296BFA656b754Fe94BB957d62",
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/7598/thumb/wrapped_bitcoin_wbtc.png?1548822744",
      coingeckoUrl: "https://www.coingecko.com/en/coins/bitcoin",
      explorerUrl: "https://goerli.arbiscan.io/address/0xCcF73F4Dcbbb573296BFA656b754Fe94BB957d62",
      prices: {
        minPrice: {
          type: "bigint",
          hex: "0x050eb9f19258bd72da095f10000000",
        },
        maxPrice: {
          type: "bigint",
          hex: "0x050eb9f19258bd72da095f10000000",
        },
      },
      balance: {
        type: "bigint",
        hex: "0x04b571c0",
      },
    },
    shortToken: {
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      address: "0x04FC936a15352a1b15b3B9c56EA002051e3DB3e5",
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
      coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
      explorerUrl: "https://goerli.arbiscan.io/address/0x04FC936a15352a1b15b3B9c56EA002051e3DB3e5",
      prices: {
        minPrice: {
          type: "bigint",
          hex: "0x0c9f2c9cd04674edea40000000",
        },
        maxPrice: {
          type: "bigint",
          hex: "0x0c9f456d8f88b0f1c31e000000",
        },
      },
      balance: {
        type: "bigint",
        hex: "0x03312adc93",
      },
    },
    indexToken: {
      name: "Bitcoin",
      symbol: "BTC",
      decimals: 8,
      address: "0xCcF73F4Dcbbb573296BFA656b754Fe94BB957d62",
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/7598/thumb/wrapped_bitcoin_wbtc.png?1548822744",
      coingeckoUrl: "https://www.coingecko.com/en/coins/bitcoin",
      explorerUrl: "https://goerli.arbiscan.io/address/0xCcF73F4Dcbbb573296BFA656b754Fe94BB957d62",
      prices: {
        minPrice: {
          type: "bigint",
          hex: "0x050eb9f19258bd72da095f10000000",
        },
        maxPrice: {
          type: "bigint",
          hex: "0x050eb9f19258bd72da095f10000000",
        },
      },
      balance: {
        type: "bigint",
        hex: "0x04b571c0",
      },
    },
    longInterestUsd: {
      type: "bigint",
      hex: "0x8d151dda39e2f3d6ca7318000000",
    },
    shortInterestUsd: {
      type: "bigint",
      hex: "0xdbe32f323e0c4c6831d2dc900000",
    },
    longInterestInTokens: {
      type: "bigint",
      hex: "0xa3ea16",
    },
    shortInterestInTokens: {
      type: "bigint",
      hex: "0x0107657e",
    },
    longPoolAmount: {
      type: "bigint",
      hex: "0x02b24068",
    },
    shortPoolAmount: {
      type: "bigint",
      hex: "0x06102f5c1c",
    },
    maxLongPoolAmount: {
      type: "bigint",
      hex: "0x033b2e3c9fd0803ce8000000",
    },
    maxShortPoolAmount: {
      type: "bigint",
      hex: "0x033b2e3c9fd0803ce8000000",
    },
    longPoolAmountAdjustment: {
      type: "bigint",
      hex: "0x00",
    },
    shortPoolAmountAdjustment: {
      type: "bigint",
      hex: "0x00",
    },
    poolValueMin: {
      type: "bigint",
      hex: "0x0751fc2e8a47ee2e70f4be2b1035da",
    },
    poolValueMax: {
      type: "bigint",
      hex: "0x0752060add1a4b3f34cbb18b3035da",
    },
    reserveFactorLong: {
      type: "bigint",
      hex: "0x0b5c0e8d21d902d61fa0000000",
    },
    reserveFactorShort: {
      type: "bigint",
      hex: "0x0b5c0e8d21d902d61fa0000000",
    },
    openInterestReserveFactorLong: {
      type: "bigint",
      hex: "0x0a18f07d736b90be5500000000",
    },
    openInterestReserveFactorShort: {
      type: "bigint",
      hex: "0x0a18f07d736b90be5500000000",
    },
    maxOpenInterestLong: {
      type: "bigint",
      hex: "0x02f050fe938943acc45f65568000000000",
    },
    maxOpenInterestShort: {
      type: "bigint",
      hex: "0x02f050fe938943acc45f65568000000000",
    },
    totalBorrowingFees: {
      type: "bigint",
      hex: "0x2b394ddfa1af6530444f10967f",
    },
    positionImpactPoolAmount: {
      type: "bigint",
      hex: "0x0197ea",
    },
    swapImpactPoolAmountLong: {
      type: "bigint",
      hex: "0x49",
    },
    swapImpactPoolAmountShort: {
      type: "bigint",
      hex: "0x04b76bc737",
    },
    borrowingFactorLong: {
      type: "bigint",
      hex: "0x0152d02c7e14af680000",
    },
    borrowingFactorShort: {
      type: "bigint",
      hex: "0x0152d02c7e14af680000",
    },
    borrowingExponentFactorLong: {
      type: "bigint",
      hex: "0x0c9f2c9cd04674edea40000000",
    },
    borrowingExponentFactorShort: {
      type: "bigint",
      hex: "0x0c9f2c9cd04674edea40000000",
    },
    fundingFactor: {
      type: "bigint",
      hex: "0x043c33c1937564800000",
    },
    fundingExponentFactor: {
      type: "bigint",
      hex: "0x0c9f2c9cd04674edea40000000",
    },
    maxPnlFactorForTradersLong: {
      type: "bigint",
      hex: "0x0a18f07d736b90be5500000000",
    },
    maxPnlFactorForTradersShort: {
      type: "bigint",
      hex: "0x0a18f07d736b90be5500000000",
    },
    minCollateralFactor: {
      type: "bigint",
      hex: "0x204fce5e3e25026110000000",
    },
    minCollateralFactorForOpenInterestLong: {
      type: "bigint",
      hex: "0x00",
    },
    minCollateralFactorForOpenInterestShort: {
      type: "bigint",
      hex: "0x00",
    },
    claimableFundingAmountLong: {
      type: "bigint",
      hex: "0x00",
    },
    claimableFundingAmountShort: {
      type: "bigint",
      hex: "0x0bbc20",
    },
    positionFeeFactorForPositiveImpact: {
      type: "bigint",
      hex: "0x019d971e4fe8401e74000000",
    },
    positionFeeFactorForNegativeImpact: {
      type: "bigint",
      hex: "0x024306c4097859c43c000000",
    },
    positionImpactFactorPositive: {
      type: "bigint",
      hex: "0x0a968163f0a57b400000",
    },
    positionImpactFactorNegative: {
      type: "bigint",
      hex: "0x152d02c7e14af6800000",
    },
    maxPositionImpactFactorPositive: {
      type: "bigint",
      hex: "0x204fce5e3e25026110000000",
    },
    maxPositionImpactFactorNegative: {
      type: "bigint",
      hex: "0x204fce5e3e25026110000000",
    },
    maxPositionImpactFactorForLiquidations: {
      type: "bigint",
      hex: "0x204fce5e3e25026110000000",
    },
    positionImpactExponentFactor: {
      type: "bigint",
      hex: "0x193e5939a08ce9dbd480000000",
    },
    swapFeeFactorForPositiveImpact: {
      type: "bigint",
      hex: "0x019d971e4fe8401e74000000",
    },
    swapFeeFactorForNegativeImpact: {
      type: "bigint",
      hex: "0x024306c4097859c43c000000",
    },
    swapImpactFactorPositive: {
      type: "bigint",
      hex: "0x0422ca8b0a00a425000000",
    },
    swapImpactFactorNegative: {
      type: "bigint",
      hex: "0x084595161401484a000000",
    },
    swapImpactExponentFactor: {
      type: "bigint",
      hex: "0x193e5939a08ce9dbd480000000",
    },
    borrowingFactorPerSecondForLongs: {
      type: "bigint",
      hex: "0x00",
    },
    borrowingFactorPerSecondForShorts: {
      type: "bigint",
      hex: "0x3a06759dd7f012b91a",
    },
    fundingFactorPerSecond: {
      type: "bigint",
      hex: "0xecb26eec42fc7658e0",
    },
    longsPayShorts: false,
    virtualPoolAmountForLongToken: {
      type: "bigint",
      hex: "0x02b24068",
    },
    virtualPoolAmountForShortToken: {
      type: "bigint",
      hex: "0x06102f5c1c",
    },
    virtualInventoryForPositions: {
      type: "bigint",
      hex: "-0x3885f95a824cd6d349eb2ab00000",
    },
    virtualMarketId: "0x11111137e2e8ae1c70c421e7a0dd36e023e0d6217198f889f9eb9c2a6727481f",
    virtualLongTokenId: "0x04533137e2e8ae1c11111111a0dd36e023e0d6217198f889f9eb9c2a6727481d",
    virtualShortTokenId: "0x0000000000000000000000000000000000000000000000000000000000000000",
  },
  indexToken: {
    name: "Bitcoin",
    symbol: "BTC",
    decimals: 8,
    address: "0xCcF73F4Dcbbb573296BFA656b754Fe94BB957d62",
    isShortable: true,
    imageUrl: "https://assets.coingecko.com/coins/images/7598/thumb/wrapped_bitcoin_wbtc.png?1548822744",
    coingeckoUrl: "https://www.coingecko.com/en/coins/bitcoin",
    explorerUrl: "https://goerli.arbiscan.io/address/0xCcF73F4Dcbbb573296BFA656b754Fe94BB957d62",
    prices: {
      minPrice: {
        type: "bigint",
        hex: "0x050eb9f19258bd72da095f10000000",
      },
      maxPrice: {
        type: "bigint",
        hex: "0x050eb9f19258bd72da095f10000000",
      },
    },
    balance: {
      type: "bigint",
      hex: "0x04b571c0",
    },
  },
  swapPath: ["0x1529876A9348D61C6c4a3EEe1fe6CbF1117Ca315"],
  initialCollateralTokenAddress: "0xe39Ab88f8A4777030A534146A9Ca3B52bd5D43A3",
  initialCollateralToken: {
    name: "Wrapped Ethereum",
    symbol: "WETH",
    decimals: 18,
    address: "0xe39Ab88f8A4777030A534146A9Ca3B52bd5D43A3",
    isWrapped: true,
    baseSymbol: "ETH",
    imageUrl: "https://assets.coingecko.com/coins/images/2518/thumb/weth.png?1628852295",
    coingeckoUrl: "https://www.coingecko.com/en/coins/ethereum",
    explorerUrl: "https://goerli.arbiscan.io/address/0xe39Ab88f8A4777030A534146A9Ca3B52bd5D43A3",
    prices: {
      minPrice: {
        type: "bigint",
        hex: "0x4f995515b0834ce9b4c7e8000000",
      },
      maxPrice: {
        type: "bigint",
        hex: "0x4f995515b0834ce9b4c7e8000000",
      },
    },
    balance: {
      type: "bigint",
      hex: "0x00",
    },
  },
  targetCollateralToken: {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    address: "0x04FC936a15352a1b15b3B9c56EA002051e3DB3e5",
    isStable: true,
    imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
    coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
    explorerUrl: "https://goerli.arbiscan.io/address/0x04FC936a15352a1b15b3B9c56EA002051e3DB3e5",
    prices: {
      minPrice: {
        type: "bigint",
        hex: "0x0c9f2c9cd04674edea40000000",
      },
      maxPrice: {
        type: "bigint",
        hex: "0x0c9f456d8f88b0f1c31e000000",
      },
    },
    balance: {
      type: "bigint",
      hex: "0x03312adc93",
    },
  },
  initialCollateralDeltaAmount: {
    type: "bigint",
    hex: "0x2386f26fc10000",
  },
  sizeDeltaUsd: {
    type: "bigint",
    hex: "0x21560c7b28514e1cfcec600000",
  },
  triggerPrice: {
    type: "bigint",
    hex: "0x0c9f2c9cd04674edea40000000",
  },
  acceptablePrice: {
    type: "bigint",
    hex: "0x0cbf7c6b2e8499f04b50000000",
  },
  minOutputAmount: {
    type: "bigint",
    hex: "0x00",
  },
  orderType: 3,
  orderKey: "0x6d4547ccb020d31fbc45ab4475f5d3a129d216c2219281a703dc289c2fdc5ab4",
  isLong: true,
  reason: null,
  timestamp: 1694775244,
  transaction: {
    hash: "0x1290b5858dc8efa0e2eec75a241fa95bdb5f9a58950a57bf540f269edff18751",
    __typename: "Transaction",
  },
});

export const executeOrderDecreaseShort = prepare({
  id: "0x6e9697b809b21bfb9d9411e25ba56c4261b5c3ec0e7fef0b2ea0bbda7fbead08:21",
  eventName: "OrderExecuted",
  account: "0x20437fb99dee29c9a4786b02bf1a3afc445fd86b",
  marketAddress: "0xc7Abb2C5f3BF3CEB389dF0Eecd6120D451170B50",
  marketInfo: {
    marketTokenAddress: "0xc7Abb2C5f3BF3CEB389dF0Eecd6120D451170B50",
    indexTokenAddress: "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",
    longTokenAddress: "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",
    shortTokenAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    isSameCollaterals: false,
    isSpotOnly: false,
    name: "UNI/USD [UNI-USDC]",
    data: "",
    isDisabled: false,
    longToken: {
      name: "Uniswap",
      symbol: "UNI",
      decimals: 18,
      priceDecimals: 3,
      address: "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",
      isStable: false,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/12504/thumb/uniswap-uni.png?1600306604",
      coingeckoUrl: "https://www.coingecko.com/en/coins/uniswap",
      explorerUrl: "https://arbiscan.io/token/0xfa7f8980b0f1e64a2062791cc3b0871572f1f7f0",
      isV1Available: true,
      prices: {
        minPrice: {
          type: "bigint",
          hex: "0x37fa420444a91d9f2738000000",
        },
        maxPrice: {
          type: "bigint",
          hex: "0x37fa420444a91d9f2738000000",
        },
      },
      balance: {
        type: "bigint",
        hex: "0x00",
      },
    },
    shortToken: {
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      isStable: true,
      isV1Available: true,
      imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
      coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
      explorerUrl: "https://arbiscan.io/address/0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      prices: {
        minPrice: {
          type: "bigint",
          hex: "0x0c9ed9e4fd69ace1175c000000",
        },
        maxPrice: {
          type: "bigint",
          hex: "0x0c9f2c9cd04674edea40000000",
        },
      },
      balance: {
        type: "bigint",
        hex: "0x00",
      },
    },
    indexToken: {
      name: "Uniswap",
      symbol: "UNI",
      decimals: 18,
      priceDecimals: 3,
      address: "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",
      isStable: false,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/12504/thumb/uniswap-uni.png?1600306604",
      coingeckoUrl: "https://www.coingecko.com/en/coins/uniswap",
      explorerUrl: "https://arbiscan.io/token/0xfa7f8980b0f1e64a2062791cc3b0871572f1f7f0",
      isV1Available: true,
      prices: {
        minPrice: {
          type: "bigint",
          hex: "0x37fa420444a91d9f2738000000",
        },
        maxPrice: {
          type: "bigint",
          hex: "0x37fa420444a91d9f2738000000",
        },
      },
      balance: {
        type: "bigint",
        hex: "0x00",
      },
    },
    longInterestUsd: {
      type: "bigint",
      hex: "0x1017b29a87aef2c2dfdbd6250e8900",
    },
    shortInterestUsd: {
      type: "bigint",
      hex: "0x147ca563e6e0f32e0ce8450633fe00",
    },
    longInterestInTokens: {
      type: "bigint",
      hex: "0x041736afe154b9225b4e",
    },
    shortInterestInTokens: {
      type: "bigint",
      hex: "0x0530d46f460dd236bac5",
    },
    longPoolAmount: {
      type: "bigint",
      hex: "0x0b88871494a7f6e0f503",
    },
    shortPoolAmount: {
      type: "bigint",
      hex: "0x37d03302ad",
    },
    maxLongPoolAmount: {
      type: "bigint",
      hex: "0x2a5a058fc295ed000000",
    },
    maxShortPoolAmount: {
      type: "bigint",
      hex: "0xe8d4a51000",
    },
    longPoolAmountAdjustment: {
      type: "bigint",
      hex: "0x00",
    },
    shortPoolAmountAdjustment: {
      type: "bigint",
      hex: "0x00",
    },
    poolValueMin: {
      type: "bigint",
      hex: "0x5b00b68a9d61dbcca6c2e6daa5c67b",
    },
    poolValueMax: {
      type: "bigint",
      hex: "0x5b01e51b19215a1d157e88ec75c67b",
    },
    reserveFactorLong: {
      type: "bigint",
      hex: "0x0b5c0e8d21d902d61fa0000000",
    },
    reserveFactorShort: {
      type: "bigint",
      hex: "0x0b5c0e8d21d902d61fa0000000",
    },
    openInterestReserveFactorLong: {
      type: "bigint",
      hex: "0x0a18f07d736b90be5500000000",
    },
    openInterestReserveFactorShort: {
      type: "bigint",
      hex: "0x0a18f07d736b90be5500000000",
    },
    maxOpenInterestLong: {
      type: "bigint",
      hex: "0x02f050fe938943acc45f65568000000000",
    },
    maxOpenInterestShort: {
      type: "bigint",
      hex: "0x02f050fe938943acc45f65568000000000",
    },
    totalBorrowingFees: {
      type: "bigint",
      hex: "0x03c3d50e11d11c240f986ac62c22",
    },
    positionImpactPoolAmount: {
      type: "bigint",
      hex: "0x6e0193264483494926",
    },
    swapImpactPoolAmountLong: {
      type: "bigint",
      hex: "0x019e1440a0cfa14930",
    },
    swapImpactPoolAmountShort: {
      type: "bigint",
      hex: "0x03d40b91",
    },
    borrowingFactorLong: {
      type: "bigint",
      hex: "0x01fd933494aa5fe00000",
    },
    borrowingFactorShort: {
      type: "bigint",
      hex: "0x01fd933494aa5fe00000",
    },
    borrowingExponentFactorLong: {
      type: "bigint",
      hex: "0x0c9f2c9cd04674edea40000000",
    },
    borrowingExponentFactorShort: {
      type: "bigint",
      hex: "0x0c9f2c9cd04674edea40000000",
    },
    fundingFactor: {
      type: "bigint",
      hex: "0x043c33c1937564800000",
    },
    fundingExponentFactor: {
      type: "bigint",
      hex: "0x0c9f2c9cd04674edea40000000",
    },
    maxPnlFactorForTradersLong: {
      type: "bigint",
      hex: "0x0a18f07d736b90be5500000000",
    },
    maxPnlFactorForTradersShort: {
      type: "bigint",
      hex: "0x0a18f07d736b90be5500000000",
    },
    minCollateralFactor: {
      type: "bigint",
      hex: "0x204fce5e3e25026110000000",
    },
    minCollateralFactorForOpenInterestLong: {
      type: "bigint",
      hex: "0x0878678326eac9000000",
    },
    minCollateralFactorForOpenInterestShort: {
      type: "bigint",
      hex: "0x0878678326eac9000000",
    },
    claimableFundingAmountLong: {
      type: "bigint",
      hex: "0x00",
    },
    claimableFundingAmountShort: {
      type: "bigint",
      hex: "0x00",
    },
    positionFeeFactorForPositiveImpact: {
      type: "bigint",
      hex: "0x019d971e4fe8401e74000000",
    },
    positionFeeFactorForNegativeImpact: {
      type: "bigint",
      hex: "0x024306c4097859c43c000000",
    },
    positionImpactFactorPositive: {
      type: "bigint",
      hex: "0x032d26d12e980b600000",
    },
    positionImpactFactorNegative: {
      type: "bigint",
      hex: "0x065a4da25d3016c00000",
    },
    maxPositionImpactFactorPositive: {
      type: "bigint",
      hex: "0x204fce5e3e25026110000000",
    },
    maxPositionImpactFactorNegative: {
      type: "bigint",
      hex: "0x204fce5e3e25026110000000",
    },
    maxPositionImpactFactorForLiquidations: {
      type: "bigint",
      hex: "0x204fce5e3e25026110000000",
    },
    positionImpactExponentFactor: {
      type: "bigint",
      hex: "0x193e5939a08ce9dbd480000000",
    },
    swapFeeFactorForPositiveImpact: {
      type: "bigint",
      hex: "0x019d971e4fe8401e74000000",
    },
    swapFeeFactorForNegativeImpact: {
      type: "bigint",
      hex: "0x024306c4097859c43c000000",
    },
    swapImpactFactorPositive: {
      type: "bigint",
      hex: "0x032d26d12e980b600000",
    },
    swapImpactFactorNegative: {
      type: "bigint",
      hex: "0x065a4da25d3016c00000",
    },
    swapImpactExponentFactor: {
      type: "bigint",
      hex: "0x193e5939a08ce9dbd480000000",
    },
    borrowingFactorPerSecondForLongs: {
      type: "bigint",
      hex: "0x00",
    },
    borrowingFactorPerSecondForShorts: {
      type: "bigint",
      hex: "0xe225821848d7e4b086",
    },
    fundingFactorPerSecond: {
      type: "bigint",
      hex: "0x823f100ae82f0c04c2",
    },
    longsPayShorts: false,
    virtualPoolAmountForLongToken: {
      type: "bigint",
      hex: "0x0b88871494a7f6e0f503",
    },
    virtualPoolAmountForShortToken: {
      type: "bigint",
      hex: "0x37d03302ad",
    },
    virtualInventoryForPositions: {
      type: "bigint",
      hex: "0x0464f2c95f32006b2d0c6ee1257500",
    },
    virtualMarketId: "0xac74a8ce840f9f11faaa15bd01a21a95ded2d6d1e2f3de883ef04c6f7e604ef4",
    virtualLongTokenId: "0xd6f594c665cfd695fe0f7241434c3e44f7d3b0e20145e97654d944d26203ddb8",
    virtualShortTokenId: "0x0000000000000000000000000000000000000000000000000000000000000000",
  },
  indexToken: {
    name: "Uniswap",
    symbol: "UNI",
    decimals: 18,
    priceDecimals: 3,
    address: "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",
    isStable: false,
    isShortable: true,
    imageUrl: "https://assets.coingecko.com/coins/images/12504/thumb/uniswap-uni.png?1600306604",
    coingeckoUrl: "https://www.coingecko.com/en/coins/uniswap",
    explorerUrl: "https://arbiscan.io/token/0xfa7f8980b0f1e64a2062791cc3b0871572f1f7f0",
    isV1Available: true,
    prices: {
      minPrice: {
        type: "bigint",
        hex: "0x37fa420444a91d9f2738000000",
      },
      maxPrice: {
        type: "bigint",
        hex: "0x37fa420444a91d9f2738000000",
      },
    },
    balance: {
      type: "bigint",
      hex: "0x00",
    },
  },
  swapPath: [],
  initialCollateralTokenAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  initialCollateralToken: {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    isStable: true,
    isV1Available: true,
    imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
    coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
    explorerUrl: "https://arbiscan.io/address/0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    prices: {
      minPrice: {
        type: "bigint",
        hex: "0x0c9ed9e4fd69ace1175c000000",
      },
      maxPrice: {
        type: "bigint",
        hex: "0x0c9f2c9cd04674edea40000000",
      },
    },
    balance: {
      type: "bigint",
      hex: "0x00",
    },
  },
  targetCollateralToken: {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    isStable: true,
    isV1Available: true,
    imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
    coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
    explorerUrl: "https://arbiscan.io/address/0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    prices: {
      minPrice: {
        type: "bigint",
        hex: "0x0c9ed9e4fd69ace1175c000000",
      },
      maxPrice: {
        type: "bigint",
        hex: "0x0c9f2c9cd04674edea40000000",
      },
    },
    balance: {
      type: "bigint",
      hex: "0x00",
    },
  },
  initialCollateralDeltaAmount: {
    type: "bigint",
    hex: "0x114bdee8",
  },
  sizeDeltaUsd: {
    type: "bigint",
    hex: "0x01ad2b2f4644d50d6f2fcc16800000",
  },
  triggerPrice: {
    type: "bigint",
    hex: "0x38681e2851e2cea73e08000000",
  },
  acceptablePrice: {
    type: "bigint",
    hex: "0x38f884dbec4e090a31da000000",
  },
  executionPrice: {
    type: "bigint",
    hex: "0x3889a30e650b6e74c4f1780000",
  },
  minOutputAmount: {
    type: "bigint",
    hex: "0x00",
  },
  indexTokenPriceMin: {
    type: "bigint",
    hex: "0x3857628d95c4c587fc90000000",
  },
  indexTokenPriceMax: {
    type: "bigint",
    hex: "0x3865679947fa383c96ba400000",
  },
  orderType: 3,
  orderKey: "0x848a25a2920b3bdc669c37c01f05aa58a5a3a3c078e0d9185897d5dec24d3768",
  isLong: true,
  reason: null,
  timestamp: 1693500686,
  transaction: {
    hash: "0x6e9697b809b21bfb9d9411e25ba56c4261b5c3ec0e7fef0b2ea0bbda7fbead08",
    __typename: "Transaction",
  },
});

export const executeOrderIncreaseLong = prepare({
  id: "0xf57f245966c3313a01526c6b86406e3af5d61eedcf380e4595fabfab1c5d0d7e:24",
  eventName: "OrderExecuted",
  account: "0x20437fb99dee29c9a4786b02bf1a3afc445fd86b",
  marketAddress: "0xC25cEf6061Cf5dE5eb761b50E4743c1F5D7E5407",
  marketInfo: {
    marketTokenAddress: "0xC25cEf6061Cf5dE5eb761b50E4743c1F5D7E5407",
    indexTokenAddress: "0x912CE59144191C1204E64559FE8253a0e49E6548",
    longTokenAddress: "0x912CE59144191C1204E64559FE8253a0e49E6548",
    shortTokenAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    isSameCollaterals: false,
    isSpotOnly: false,
    name: "ARB/USD [ARB-USDC]",
    data: "",
    isDisabled: false,
    longToken: {
      name: "Arbitrum",
      symbol: "ARB",
      decimals: 18,
      priceDecimals: 3,
      address: "0x912CE59144191C1204E64559FE8253a0e49E6548",
      imageUrl: "https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg?1680097630",
      coingeckoUrl: "https://www.coingecko.com/en/coins/arbitrum",
      explorerUrl: "https://arbiscan.io/token/0x912ce59144191c1204e64559fe8253a0e49e6548",
      prices: {
        minPrice: {
          type: "bigint",
          hex: "0x0a88559fd740bfe4a081800000",
        },
        maxPrice: {
          type: "bigint",
          hex: "0x0a88559fd740bfe4a081800000",
        },
      },
      balance: {
        type: "bigint",
        hex: "0x00",
      },
    },
    shortToken: {
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      isStable: true,
      isV1Available: true,
      imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
      coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
      explorerUrl: "https://arbiscan.io/address/0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      prices: {
        minPrice: {
          type: "bigint",
          hex: "0x0c9f2c9cd04674edea40000000",
        },
        maxPrice: {
          type: "bigint",
          hex: "0x0c9f2c9cd04674edea40000000",
        },
      },
      balance: {
        type: "bigint",
        hex: "0x00",
      },
    },
    indexToken: {
      name: "Arbitrum",
      symbol: "ARB",
      decimals: 18,
      priceDecimals: 3,
      address: "0x912CE59144191C1204E64559FE8253a0e49E6548",
      imageUrl: "https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg?1680097630",
      coingeckoUrl: "https://www.coingecko.com/en/coins/arbitrum",
      explorerUrl: "https://arbiscan.io/token/0x912ce59144191c1204e64559fe8253a0e49e6548",
      prices: {
        minPrice: {
          type: "bigint",
          hex: "0x0a88559fd740bfe4a081800000",
        },
        maxPrice: {
          type: "bigint",
          hex: "0x0a88559fd740bfe4a081800000",
        },
      },
      balance: {
        type: "bigint",
        hex: "0x00",
      },
    },
    longInterestUsd: {
      type: "bigint",
      hex: "0x4adfb06ea425e6260bbb7731161856",
    },
    shortInterestUsd: {
      type: "bigint",
      hex: "0x34e357263d19fb9ff443a3663cafa8",
    },
    longInterestInTokens: {
      type: "bigint",
      hex: "0x64ffb9f7cba391496a48",
    },
    shortInterestInTokens: {
      type: "bigint",
      hex: "0x4024f916f4c21c76b67a",
    },
    longPoolAmount: {
      type: "bigint",
      hex: "0xb8d3436c32a8893763ab",
    },
    shortPoolAmount: {
      type: "bigint",
      hex: "0x93ade4de1f",
    },
    maxLongPoolAmount: {
      type: "bigint",
      hex: "0xd3c21bcecceda1000000",
    },
    maxShortPoolAmount: {
      type: "bigint",
      hex: "0xe8d4a51000",
    },
    longPoolAmountAdjustment: {
      type: "bigint",
      hex: "0x00",
    },
    shortPoolAmountAdjustment: {
      type: "bigint",
      hex: "0x00",
    },
    poolValueMin: {
      type: "bigint",
      hex: "0xfdafb5ebe27c6ab88ea4d2ead354cb",
    },
    poolValueMax: {
      type: "bigint",
      hex: "0xfdafb5ebe27c6ab88ea4d2ead354cb",
    },
    reserveFactorLong: {
      type: "bigint",
      hex: "0x0b5c0e8d21d902d61fa0000000",
    },
    reserveFactorShort: {
      type: "bigint",
      hex: "0x0b5c0e8d21d902d61fa0000000",
    },
    openInterestReserveFactorLong: {
      type: "bigint",
      hex: "0x0a18f07d736b90be5500000000",
    },
    openInterestReserveFactorShort: {
      type: "bigint",
      hex: "0x0a18f07d736b90be5500000000",
    },
    maxOpenInterestLong: {
      type: "bigint",
      hex: "0x02f050fe938943acc45f65568000000000",
    },
    maxOpenInterestShort: {
      type: "bigint",
      hex: "0x02f050fe938943acc45f65568000000000",
    },
    totalBorrowingFees: {
      type: "bigint",
      hex: "0x289e543927407e0ac1af2da10586",
    },
    positionImpactPoolAmount: {
      type: "bigint",
      hex: "0x03c472ef2e9c9ca50188",
    },
    swapImpactPoolAmountLong: {
      type: "bigint",
      hex: "0x6cf1a9f39a2e8f3731",
    },
    swapImpactPoolAmountShort: {
      type: "bigint",
      hex: "0x5d95ff",
    },
    borrowingFactorLong: {
      type: "bigint",
      hex: "0x01fd933494aa5fe00000",
    },
    borrowingFactorShort: {
      type: "bigint",
      hex: "0x01fd933494aa5fe00000",
    },
    borrowingExponentFactorLong: {
      type: "bigint",
      hex: "0x0c9f2c9cd04674edea40000000",
    },
    borrowingExponentFactorShort: {
      type: "bigint",
      hex: "0x0c9f2c9cd04674edea40000000",
    },
    fundingFactor: {
      type: "bigint",
      hex: "0x043c33c1937564800000",
    },
    fundingExponentFactor: {
      type: "bigint",
      hex: "0x0c9f2c9cd04674edea40000000",
    },
    netPnlMin: {
      type: "bigint",
      hex: "0x05fc29ee41bb6ad1f713b0bb7da692",
    },
    maxPnlFactorForTradersLong: {
      type: "bigint",
      hex: "0x0a18f07d736b90be5500000000",
    },
    maxPnlFactorForTradersShort: {
      type: "bigint",
      hex: "0x0a18f07d736b90be5500000000",
    },
    minCollateralFactor: {
      type: "bigint",
      hex: "0x204fce5e3e25026110000000",
    },
    minCollateralFactorForOpenInterestLong: {
      type: "bigint",
      hex: "0x021e19e0c9bab2400000",
    },
    minCollateralFactorForOpenInterestShort: {
      type: "bigint",
      hex: "0x021e19e0c9bab2400000",
    },
    claimableFundingAmountLong: {
      type: "bigint",
      hex: "0x00",
    },
    claimableFundingAmountShort: {
      type: "bigint",
      hex: "0x00",
    },
    positionFeeFactorForPositiveImpact: {
      type: "bigint",
      hex: "0x019d971e4fe8401e74000000",
    },
    positionFeeFactorForNegativeImpact: {
      type: "bigint",
      hex: "0x024306c4097859c43c000000",
    },
    positionImpactFactorPositive: {
      type: "bigint",
      hex: "0xd8d726b7177a800000",
    },
    positionImpactFactorNegative: {
      type: "bigint",
      hex: "0x01b1ae4d6e2ef5000000",
    },
    maxPositionImpactFactorPositive: {
      type: "bigint",
      hex: "0x204fce5e3e25026110000000",
    },
    maxPositionImpactFactorNegative: {
      type: "bigint",
      hex: "0x204fce5e3e25026110000000",
    },
    maxPositionImpactFactorForLiquidations: {
      type: "bigint",
      hex: "0x204fce5e3e25026110000000",
    },
    positionImpactExponentFactor: {
      type: "bigint",
      hex: "0x193e5939a08ce9dbd480000000",
    },
    swapFeeFactorForPositiveImpact: {
      type: "bigint",
      hex: "0x019d971e4fe8401e74000000",
    },
    swapFeeFactorForNegativeImpact: {
      type: "bigint",
      hex: "0x024306c4097859c43c000000",
    },
    swapImpactFactorPositive: {
      type: "bigint",
      hex: "0xd8d726b7177a800000",
    },
    swapImpactFactorNegative: {
      type: "bigint",
      hex: "0x01b1ae4d6e2ef5000000",
    },
    swapImpactExponentFactor: {
      type: "bigint",
      hex: "0x193e5939a08ce9dbd480000000",
    },
    borrowingFactorPerSecondForLongs: {
      type: "bigint",
      hex: "0x011675e3f2fc2ab3f2a8",
    },
    borrowingFactorPerSecondForShorts: {
      type: "bigint",
      hex: "0x00",
    },
    fundingFactorPerSecond: {
      type: "bigint",
      hex: "0xba92d6d5e631f90af4",
    },
    longsPayShorts: true,
    virtualPoolAmountForLongToken: {
      type: "bigint",
      hex: "0xb8d3436c32a8893763ab",
    },
    virtualPoolAmountForShortToken: {
      type: "bigint",
      hex: "0x93ade4de1f",
    },
    virtualInventoryForPositions: {
      type: "bigint",
      hex: "-0x15fc5948670bea861777d3cad968ae",
    },
    virtualMarketId: "0x85248fe8b259d5a671c8ca8540127a7b9cb2534b1175b95d1df6391360841c7b",
    virtualLongTokenId: "0xab14694c1d031aa28aedaf394a1c4f0054ad43be42448259b8bc064efa1af97c",
    virtualShortTokenId: "0x0000000000000000000000000000000000000000000000000000000000000000",
  },
  indexToken: {
    name: "Arbitrum",
    symbol: "ARB",
    decimals: 18,
    priceDecimals: 3,
    address: "0x912CE59144191C1204E64559FE8253a0e49E6548",
    imageUrl: "https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg?1680097630",
    coingeckoUrl: "https://www.coingecko.com/en/coins/arbitrum",
    explorerUrl: "https://arbiscan.io/token/0x912ce59144191c1204e64559fe8253a0e49e6548",
    prices: {
      minPrice: {
        type: "bigint",
        hex: "0x0a88559fd740bfe4a081800000",
      },
      maxPrice: {
        type: "bigint",
        hex: "0x0a88559fd740bfe4a081800000",
      },
    },
    balance: {
      type: "bigint",
      hex: "0x00",
    },
  },
  swapPath: [],
  initialCollateralTokenAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  initialCollateralToken: {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    isStable: true,
    isV1Available: true,
    imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
    coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
    explorerUrl: "https://arbiscan.io/address/0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    prices: {
      minPrice: {
        type: "bigint",
        hex: "0x0c9f2c9cd04674edea40000000",
      },
      maxPrice: {
        type: "bigint",
        hex: "0x0c9f2c9cd04674edea40000000",
      },
    },
    balance: {
      type: "bigint",
      hex: "0x00",
    },
  },
  targetCollateralToken: {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    isStable: true,
    isV1Available: true,
    imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
    coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
    explorerUrl: "https://arbiscan.io/address/0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    prices: {
      minPrice: {
        type: "bigint",
        hex: "0x0c9f2c9cd04674edea40000000",
      },
      maxPrice: {
        type: "bigint",
        hex: "0x0c9f2c9cd04674edea40000000",
      },
    },
    balance: {
      type: "bigint",
      hex: "0x00",
    },
  },
  initialCollateralDeltaAmount: {
    type: "bigint",
    hex: "0x0c13bc90",
  },
  priceImpactUsd: {
    type: "bigint",
    hex: "-0xd44fc1b1b9374c28a82ccd8f80",
  },
  sizeDeltaUsd: {
    type: "bigint",
    hex: "0x661171efc3f661f9e69990000000",
  },
  triggerPrice: {
    type: "bigint",
    hex: "0x0a8d42fdf9e4e2c6e5a0000000",
  },
  acceptablePrice: {
    type: "bigint",
    hex: "0x0a723fc31dcb8e96d3f8000000",
  },
  executionPrice: {
    type: "bigint",
    hex: "0x0a90da455f096c14553e780000",
  },
  minOutputAmount: {
    type: "bigint",
    hex: "0x00",
  },
  indexTokenPriceMin: {
    type: "bigint",
    hex: "0xc2b9bf2fd0",
  },
  indexTokenPriceMax: {
    type: "bigint",
    hex: "0xc2b9bf2fd0",
  },
  orderType: 3,
  orderKey: "0x407ad8ff489c228d56ff0764956ce61ae0a3e1f238de6d4cf7cfaa508b7676d7",
  isLong: false,
  reason: null,
  timestamp: 1695040998,
  transaction: {
    hash: "0xf57f245966c3313a01526c6b86406e3af5d61eedcf380e4595fabfab1c5d0d7e",
    __typename: "Transaction",
  },
});

export const frozenOrderIncreaseShort = prepare({
  id: "0xba090183c17bcc5dbfcb4b19c59aa420df42e72ae8c8bce6be8fe07f3769c3b1:4",
  eventName: "OrderFrozen",
  account: "0x54e761835a59080b4de36fbe0b1396e7b3b7353e",
  marketAddress: "0x47c031236e19d024b42f8AE6780E44A573170703",
  marketInfo: {
    marketTokenAddress: "0x47c031236e19d024b42f8AE6780E44A573170703",
    indexTokenAddress: "0x47904963fc8b2340414262125aF798B9655E58Cd",
    longTokenAddress: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
    shortTokenAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    isSameCollaterals: false,
    isSpotOnly: false,
    name: "BTC/USD [BTC-USDC]",
    data: "",
    isDisabled: false,
    longToken: {
      name: "Bitcoin (WBTC)",
      symbol: "BTC",
      decimals: 8,
      address: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/26115/thumb/btcb.png?1655921693",
      coingeckoUrl: "https://www.coingecko.com/en/coins/wrapped-bitcoin",
      explorerUrl: "https://arbiscan.io/address/0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f",
      isV1Available: true,
      prices: {
        minPrice: {
          type: "bigint",
          hex: "0x054351f8192ce28e4e687b20000000",
        },
        maxPrice: {
          type: "bigint",
          hex: "0x054351f8192ce28e4e687b20000000",
        },
      },
      balance: {
        type: "bigint",
        hex: "0x00",
      },
    },
    shortToken: {
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      isStable: true,
      isV1Available: true,
      imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
      coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
      explorerUrl: "https://arbiscan.io/address/0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      prices: {
        minPrice: {
          type: "bigint",
          hex: "0x0c9f2c9cd04674edea40000000",
        },
        maxPrice: {
          type: "bigint",
          hex: "0x0c9f2c9cd04674edea40000000",
        },
      },
      balance: {
        type: "bigint",
        hex: "0x00",
      },
    },
    indexToken: {
      name: "Bitcoin",
      symbol: "BTC",
      address: "0x47904963fc8b2340414262125aF798B9655E58Cd",
      isSynthetic: true,
      decimals: 8,
      imageUrl: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png?1547033579",
      explorerUrl: "https://arbiscan.io/address/0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f",
      coingeckoUrl: "https://www.coingecko.com/en/coins/bitcoin",
      prices: {
        minPrice: {
          type: "bigint",
          hex: "0x054351f8192ce28e4e687b20000000",
        },
        maxPrice: {
          type: "bigint",
          hex: "0x054351f8192ce28e4e687b20000000",
        },
      },
    },
    priceImpactUsd: {
      type: "bigint",
      hex: "-0xd44fc1b1b9374c28a82ccd8f80",
    },
    longInterestUsd: {
      type: "bigint",
      hex: "0x0274ee6de80ffd23e60ec80022fd4000",
    },
    shortInterestUsd: {
      type: "bigint",
      hex: "0x01b65b3690559bad99db88e709953000",
    },
    longInterestInTokens: {
      type: "bigint",
      hex: "0x02d6c4a617",
    },
    shortInterestInTokens: {
      type: "bigint",
      hex: "0x01f5707299",
    },
    longPoolAmount: {
      type: "bigint",
      hex: "0x049192b278",
    },
    shortPoolAmount: {
      type: "bigint",
      hex: "0x03e3bf919543",
    },
    maxLongPoolAmount: {
      type: "bigint",
      hex: "0x0826299e00",
    },
    maxShortPoolAmount: {
      type: "bigint",
      hex: "0x09184e72a000",
    },
    longPoolAmountAdjustment: {
      type: "bigint",
      hex: "0x00",
    },
    shortPoolAmountAdjustment: {
      type: "bigint",
      hex: "0x00",
    },
    poolValueMin: {
      type: "bigint",
      hex: "0x0738fb12f5ec0f84e24c4d140d1ba86c",
    },
    poolValueMax: {
      type: "bigint",
      hex: "0x0738fb12f5ec0f84e24c4d140d1ba86c",
    },
    reserveFactorLong: {
      type: "bigint",
      hex: "0x0b5c0e8d21d902d61fa0000000",
    },
    reserveFactorShort: {
      type: "bigint",
      hex: "0x0b5c0e8d21d902d61fa0000000",
    },
    openInterestReserveFactorLong: {
      type: "bigint",
      hex: "0x0a18f07d736b90be5500000000",
    },
    openInterestReserveFactorShort: {
      type: "bigint",
      hex: "0x0a18f07d736b90be5500000000",
    },
    maxOpenInterestLong: {
      type: "bigint",
      hex: "0x02f050fe938943acc45f65568000000000",
    },
    maxOpenInterestShort: {
      type: "bigint",
      hex: "0x02f050fe938943acc45f65568000000000",
    },
    totalBorrowingFees: {
      type: "bigint",
      hex: "0x019dc9ef3df233d4d9fe733fb163b8",
    },
    positionImpactPoolAmount: {
      type: "bigint",
      hex: "0x072e37",
    },
    swapImpactPoolAmountLong: {
      type: "bigint",
      hex: "0x1a44a2",
    },
    swapImpactPoolAmountShort: {
      type: "bigint",
      hex: "0x1f621a",
    },
    borrowingFactorLong: {
      type: "bigint",
      hex: "0x0152d02c7e14af680000",
    },
    borrowingFactorShort: {
      type: "bigint",
      hex: "0x0152d02c7e14af680000",
    },
    borrowingExponentFactorLong: {
      type: "bigint",
      hex: "0x0c9f2c9cd04674edea40000000",
    },
    borrowingExponentFactorShort: {
      type: "bigint",
      hex: "0x0c9f2c9cd04674edea40000000",
    },
    fundingFactor: {
      type: "bigint",
      hex: "0x043c33c1937564800000",
    },
    fundingExponentFactor: {
      type: "bigint",
      hex: "0x0c9f2c9cd04674edea40000000",
    },
    maxPnlFactorForTradersLong: {
      type: "bigint",
      hex: "0x0a18f07d736b90be5500000000",
    },
    maxPnlFactorForTradersShort: {
      type: "bigint",
      hex: "0x0a18f07d736b90be5500000000",
    },
    minCollateralFactor: {
      type: "bigint",
      hex: "0x204fce5e3e25026110000000",
    },
    minCollateralFactorForOpenInterestLong: {
      type: "bigint",
      hex: "0x0ad78ebc5ac6200000",
    },
    minCollateralFactorForOpenInterestShort: {
      type: "bigint",
      hex: "0x0ad78ebc5ac6200000",
    },
    claimableFundingAmountLong: {
      type: "bigint",
      hex: "0x00",
    },
    claimableFundingAmountShort: {
      type: "bigint",
      hex: "0x00",
    },
    positionFeeFactorForPositiveImpact: {
      type: "bigint",
      hex: "0x019d971e4fe8401e74000000",
    },
    positionFeeFactorForNegativeImpact: {
      type: "bigint",
      hex: "0x024306c4097859c43c000000",
    },
    positionImpactFactorPositive: {
      type: "bigint",
      hex: "0x068155a43676e00000",
    },
    positionImpactFactorNegative: {
      type: "bigint",
      hex: "0x068155a43676e00000",
    },
    maxPositionImpactFactorPositive: {
      type: "bigint",
      hex: "0x204fce5e3e25026110000000",
    },
    maxPositionImpactFactorNegative: {
      type: "bigint",
      hex: "0x204fce5e3e25026110000000",
    },
    maxPositionImpactFactorForLiquidations: {
      type: "bigint",
      hex: "0x204fce5e3e25026110000000",
    },
    positionImpactExponentFactor: {
      type: "bigint",
      hex: "0x193e5939a08ce9dbd480000000",
    },
    swapFeeFactorForPositiveImpact: {
      type: "bigint",
      hex: "0x019d971e4fe8401e74000000",
    },
    swapFeeFactorForNegativeImpact: {
      type: "bigint",
      hex: "0x024306c4097859c43c000000",
    },
    swapImpactFactorPositive: {
      type: "bigint",
      hex: "0x0ad78ebc5ac6200000",
    },
    swapImpactFactorNegative: {
      type: "bigint",
      hex: "0x0ad78ebc5ac6200000",
    },
    swapImpactExponentFactor: {
      type: "bigint",
      hex: "0x193e5939a08ce9dbd480000000",
    },
    borrowingFactorPerSecondForLongs: {
      type: "bigint",
      hex: "0xd28985d75b681ced46",
    },
    borrowingFactorPerSecondForShorts: {
      type: "bigint",
      hex: "0x00",
    },
    fundingFactorPerSecond: {
      type: "bigint",
      hex: "0xc19866e9be22c6899b",
    },
    longsPayShorts: true,
    virtualPoolAmountForLongToken: {
      type: "bigint",
      hex: "0x049192b278",
    },
    virtualPoolAmountForShortToken: {
      type: "bigint",
      hex: "0x03e3bf919543",
    },
    virtualInventoryForPositions: {
      type: "bigint",
      hex: "-0xbe933757ba61764c333f1919681000",
    },
    virtualMarketId: "0xba1ff14bf93fbb00b6f43d3ad403cc4c6496c1bb88489075c8b1bc709bde9ebb",
    virtualLongTokenId: "0x0000000000000000000000000000000000000000000000000000000000000000",
    virtualShortTokenId: "0x0000000000000000000000000000000000000000000000000000000000000000",
  },
  indexToken: {
    name: "Bitcoin",
    symbol: "BTC",
    address: "0x47904963fc8b2340414262125aF798B9655E58Cd",
    isSynthetic: true,
    decimals: 8,
    imageUrl: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png?1547033579",
    explorerUrl: "https://arbiscan.io/address/0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f",
    coingeckoUrl: "https://www.coingecko.com/en/coins/bitcoin",
    prices: {
      minPrice: {
        type: "bigint",
        hex: "0x054351f8192ce28e4e687b20000000",
      },
      maxPrice: {
        type: "bigint",
        hex: "0x054351f8192ce28e4e687b20000000",
      },
    },
  },
  swapPath: ["0x9C2433dFD71096C435Be9465220BB2B189375eA7"],
  initialCollateralTokenAddress: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
  initialCollateralToken: {
    name: "Bridged USDC (USDC.e)",
    symbol: "USDC.e",
    decimals: 6,
    address: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
    isStable: true,
    imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
    coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
    explorerUrl: "https://arbiscan.io/token/0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
    isV1Available: true,
    prices: {
      minPrice: {
        type: "bigint",
        hex: "0x0c9f2c9cd04674edea40000000",
      },
      maxPrice: {
        type: "bigint",
        hex: "0x0c9f2c9cd04674edea40000000",
      },
    },
    balance: {
      type: "bigint",
      hex: "0x00",
    },
  },
  targetCollateralToken: {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    isStable: true,
    isV1Available: true,
    imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
    coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
    explorerUrl: "https://arbiscan.io/address/0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    prices: {
      minPrice: {
        type: "bigint",
        hex: "0x0c9f2c9cd04674edea40000000",
      },
      maxPrice: {
        type: "bigint",
        hex: "0x0c9f2c9cd04674edea40000000",
      },
    },
    balance: {
      type: "bigint",
      hex: "0x00",
    },
  },
  initialCollateralDeltaAmount: {
    type: "bigint",
    hex: "0x01ac2237",
  },
  sizeDeltaUsd: {
    type: "bigint",
    hex: "0x428098a6d7b79147095d81580000",
  },
  priceImpactUsd: {
    type: "bigint",
    hex: "-0x1d3d7d6c5d7c5c8b9c6a7b8c00000",
  },
  triggerPrice: {
    type: "bigint",
    hex: "0x053d8e7bd39160c84fc43680000000",
  },
  acceptablePrice: {
    type: "bigint",
    hex: "0x053024194ee4677ea0e387e0000000",
  },
  minOutputAmount: {
    type: "bigint",
    hex: "0x01abe67e",
  },
  orderType: 3,
  orderKey: "0xc9ccd8ea9fd33f462eec2ecfb1e0a1aab0e64cbfc7c281dbcee0754002b2ac61",
  isLong: false,
  reason: "",
  timestamp: 1695035649,
  transaction: {
    hash: "0xba090183c17bcc5dbfcb4b19c59aa420df42e72ae8c8bce6be8fe07f3769c3b1",
    __typename: "Transaction",
  },
});

export const undefinedOrder = prepare({
  id: "0xe07dc5d9c3ba6e04b68af869b2aaeeb5716ccc54d60c3d3628b7b38ff92b669a:3",
  eventName: "OrderCreated",
  account: "0x2c3c6d708d54e378f1e1e136a3882976f7855819",
  marketAddress: "0x0CCB4fAa6f1F1B30911619f1184082aB4E25813c",
  marketInfo: {
    marketTokenAddress: "0x0CCB4fAa6f1F1B30911619f1184082aB4E25813c",
    indexTokenAddress: "0xc14e065b0067dE91534e032868f5Ac6ecf2c6868",
    longTokenAddress: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    shortTokenAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    isSameCollaterals: false,
    isSpotOnly: false,
    name: "XRP/USD [WETH-USDC]",
    data: "",
    isDisabled: false,
    longToken: {
      name: "Wrapped Ethereum",
      symbol: "WETH",
      decimals: 18,
      address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
      isWrapped: true,
      baseSymbol: "ETH",
      imageUrl: "https://assets.coingecko.com/coins/images/2518/thumb/weth.png?1628852295",
      coingeckoUrl: "https://www.coingecko.com/en/coins/ethereum",
      isV1Available: true,
      prices: {
        minPrice: {
          type: "bigint",
          hex: "0x51b4a3fdc660c8259db5b8000000",
        },
        maxPrice: {
          type: "bigint",
          hex: "0x51b4a3fdc660c8259db5b8000000",
        },
      },
      balance: {
        type: "bigint",
        hex: "0x00",
      },
    },
    shortToken: {
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      isStable: true,
      isV1Available: true,
      imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
      coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
      explorerUrl: "https://arbiscan.io/address/0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      prices: {
        minPrice: {
          type: "bigint",
          hex: "0x0c9f2c9cd04674edea40000000",
        },
        maxPrice: {
          type: "bigint",
          hex: "0x0c9f2c9cd04674edea40000000",
        },
      },
      balance: {
        type: "bigint",
        hex: "0x00",
      },
    },
    indexToken: {
      name: "XRP",
      symbol: "XRP",
      decimals: 6,
      priceDecimals: 4,
      address: "0xc14e065b0067dE91534e032868f5Ac6ecf2c6868",
      imageUrl: "https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png?1605778731",
      coingeckoUrl: "https://www.coingecko.com/en/coins/xrp",
      isSynthetic: true,
      prices: {
        minPrice: {
          type: "bigint",
          hex: "0x0659c4ab6f66def68ad8800000",
        },
        maxPrice: {
          type: "bigint",
          hex: "0x0659c4ab6f66def68ad8800000",
        },
      },
    },
    longInterestUsd: {
      type: "bigint",
      hex: "0x086bbde568f90f250a07ed89db3900",
    },
    shortInterestUsd: {
      type: "bigint",
      hex: "0x029ad80eb02845992d0f722667b62c",
    },
    longInterestInTokens: {
      type: "bigint",
      hex: "0x14ffbd41ef",
    },
    shortInterestInTokens: {
      type: "bigint",
      hex: "0x06392f706c",
    },
    longPoolAmount: {
      type: "bigint",
      hex: "0x03d8bf488263d07652",
    },
    shortPoolAmount: {
      type: "bigint",
      hex: "0x0d64950b21",
    },
    maxLongPoolAmount: {
      type: "bigint",
      hex: "0x1b1ae4d6e2ef500000",
    },
    maxShortPoolAmount: {
      type: "bigint",
      hex: "0xe8d4a51000",
    },
    longPoolAmountAdjustment: {
      type: "bigint",
      hex: "0x00",
    },
    shortPoolAmountAdjustment: {
      type: "bigint",
      hex: "0x00",
    },
    poolValueMin: {
      type: "bigint",
      hex: "0x2155d4f1887110678316d6b09d5304",
    },
    poolValueMax: {
      type: "bigint",
      hex: "0x2155d4f1887110678316d6b09d5304",
    },
    reserveFactorLong: {
      type: "bigint",
      hex: "0x08d5d26dc4fe1ea68a60000000",
    },
    reserveFactorShort: {
      type: "bigint",
      hex: "0x08d5d26dc4fe1ea68a60000000",
    },
    openInterestReserveFactorLong: {
      type: "bigint",
      hex: "0x064f964e68233a76f520000000",
    },
    openInterestReserveFactorShort: {
      type: "bigint",
      hex: "0x064f964e68233a76f520000000",
    },
    totalBorrowingFees: {
      type: "bigint",
      hex: "0x04c3239be5da8c48fae025d66b39",
    },
    positionImpactPoolAmount: {
      type: "bigint",
      hex: "0x2a28bab3",
    },
    swapImpactPoolAmountLong: {
      type: "bigint",
      hex: "0x3111f82c33a4a9",
    },
    swapImpactPoolAmountShort: {
      type: "bigint",
      hex: "0x3bce34",
    },
    borrowingFactorLong: {
      type: "bigint",
      hex: "0x032d26d12e980b600000",
    },
    borrowingFactorShort: {
      type: "bigint",
      hex: "0x032d26d12e980b600000",
    },
    borrowingExponentFactorLong: {
      type: "bigint",
      hex: "0x0c9f2c9cd04674edea40000000",
    },
    borrowingExponentFactorShort: {
      type: "bigint",
      hex: "0x0c9f2c9cd04674edea40000000",
    },
    fundingFactor: {
      type: "bigint",
      hex: "0x043c33c1937564800000",
    },
    fundingExponentFactor: {
      type: "bigint",
      hex: "0x0c9f2c9cd04674edea40000000",
    },
    maxPnlFactorForTradersLong: {
      type: "bigint",
      hex: "0x064f964e68233a76f520000000",
    },
    maxPnlFactorForTradersShort: {
      type: "bigint",
      hex: "0x064f964e68233a76f520000000",
    },
    minCollateralFactor: {
      type: "bigint",
      hex: "0x204fce5e3e25026110000000",
    },
    minCollateralFactorForOpenInterestLong: {
      type: "bigint",
      hex: "0x6c6b935b8bbd400000",
    },
    minCollateralFactorForOpenInterestShort: {
      type: "bigint",
      hex: "0x6c6b935b8bbd400000",
    },
    claimableFundingAmountLong: {
      type: "bigint",
      hex: "0x00",
    },
    claimableFundingAmountShort: {
      type: "bigint",
      hex: "0x00",
    },
    positionFeeFactorForPositiveImpact: {
      type: "bigint",
      hex: "0x019d971e4fe8401e74000000",
    },
    positionFeeFactorForNegativeImpact: {
      type: "bigint",
      hex: "0x024306c4097859c43c000000",
    },
    positionImpactFactorPositive: {
      type: "bigint",
      hex: "0xd8d726b7177a800000",
    },
    positionImpactFactorNegative: {
      type: "bigint",
      hex: "0x01b1ae4d6e2ef5000000",
    },
    maxPositionImpactFactorPositive: {
      type: "bigint",
      hex: "0x204fce5e3e25026110000000",
    },
    maxPositionImpactFactorNegative: {
      type: "bigint",
      hex: "0x204fce5e3e25026110000000",
    },
    maxPositionImpactFactorForLiquidations: {
      type: "bigint",
      hex: "0x204fce5e3e25026110000000",
    },
    positionImpactExponentFactor: {
      type: "bigint",
      hex: "0x193e5939a08ce9dbd480000000",
    },
    swapFeeFactorForPositiveImpact: {
      type: "bigint",
      hex: "0x019d971e4fe8401e74000000",
    },
    swapFeeFactorForNegativeImpact: {
      type: "bigint",
      hex: "0x024306c4097859c43c000000",
    },
    swapImpactFactorPositive: {
      type: "bigint",
      hex: "0x010f0cf064dd59200000",
    },
    swapImpactFactorNegative: {
      type: "bigint",
      hex: "0x010f0cf064dd59200000",
    },
    swapImpactExponentFactor: {
      type: "bigint",
      hex: "0x193e5939a08ce9dbd480000000",
    },
    borrowingFactorPerSecondForLongs: {
      type: "bigint",
      hex: "0x0139cc9973549c6b9a30",
    },
    borrowingFactorPerSecondForShorts: {
      type: "bigint",
      hex: "0x00",
    },
    fundingFactorPerSecond: {
      type: "bigint",
      hex: "0x023be9120a4b0820aeeb",
    },
    longsPayShorts: true,
    virtualPoolAmountForLongToken: {
      type: "bigint",
      hex: "0x03d8bf488263d07652",
    },
    virtualPoolAmountForShortToken: {
      type: "bigint",
      hex: "0x0d64950b21",
    },
    virtualInventoryForPositions: {
      type: "bigint",
      hex: "-0x05d0e5d6b8d0c98bdcf87b637382d4",
    },
    virtualMarketId: "0x4cdf047af6bcf090983ce57032e6e50a0ce1adc3cc5c3a51621361a4591267e5",
    virtualLongTokenId: "0x3c48977e4fc47fa4616e13af7ceb68b0d545dce7b1fb9ec7b85bb6e00870a051",
    virtualShortTokenId: "0x0000000000000000000000000000000000000000000000000000000000000000",
  },
  indexToken: {
    name: "XRP",
    symbol: "XRP",
    decimals: 6,
    priceDecimals: 4,
    address: "0xc14e065b0067dE91534e032868f5Ac6ecf2c6868",
    imageUrl: "https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png?1605778731",
    coingeckoUrl: "https://www.coingecko.com/en/coins/xrp",
    isSynthetic: true,
    prices: {
      minPrice: {
        type: "bigint",
        hex: "0x0659c4ab6f66def68ad8800000",
      },
      maxPrice: {
        type: "bigint",
        hex: "0x0659c4ab6f66def68ad8800000",
      },
    },
  },
  swapPath: [],
  initialCollateralTokenAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  initialCollateralToken: {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    isStable: true,
    isV1Available: true,
    imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
    coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
    explorerUrl: "https://arbiscan.io/address/0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    prices: {
      minPrice: {
        type: "bigint",
        hex: "0x0c9f2c9cd04674edea40000000",
      },
      maxPrice: {
        type: "bigint",
        hex: "0x0c9f2c9cd04674edea40000000",
      },
    },
    balance: {
      type: "bigint",
      hex: "0x00",
    },
  },
  targetCollateralToken: {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    isStable: true,
    isV1Available: true,
    imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
    coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
    explorerUrl: "https://arbiscan.io/address/0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    prices: {
      minPrice: {
        type: "bigint",
        hex: "0x0c9f2c9cd04674edea40000000",
      },
      maxPrice: {
        type: "bigint",
        hex: "0x0c9f2c9cd04674edea40000000",
      },
    },
    balance: {
      type: "bigint",
      hex: "0x00",
    },
  },
  initialCollateralDeltaAmount: {
    type: "bigint",
    hex: "0x00",
  },
  sizeDeltaUsd: {
    type: "bigint",
    hex: "0xf443562cc22c48e5b417d4000000",
  },
  triggerPrice: {
    type: "bigint",
    hex: "0x00",
  },
  acceptablePrice: {
    type: "bigint",
    hex: "0x00",
  },
  minOutputAmount: {
    type: "bigint",
    hex: "0x00",
  },
  orderType: 7,
  orderKey: "0x1be85ec1e321b4c907be1728eebe5e74ad2e1bfa830d51946f11f357827fde83",
  isLong: true,
  reason: null,
  timestamp: 1695023559,
  transaction: {
    hash: "0xe07dc5d9c3ba6e04b68af869b2aaeeb5716ccc54d60c3d3628b7b38ff92b669a",
    __typename: "Transaction",
  },
});

export const liquidated = prepare({
  id: "0x4575cc71b681542e739d67475f344d107d41d3fe19eb4169fb7ab6f4e109ab60:26",
  eventName: "OrderExecuted",
  account: "0x20437fb99dee29c9a4786b02bf1a3afc445fd86b",
  marketAddress: "0x7f1fa204bb700853D36994DA19F830b6Ad18455C",
  marketInfo: {
    marketTokenAddress: "0x7f1fa204bb700853D36994DA19F830b6Ad18455C",
    indexTokenAddress: "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4",
    longTokenAddress: "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4",
    shortTokenAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    isSameCollaterals: false,
    isSpotOnly: false,
    name: "LINK/USD [LINK-USDC]",
    data: "",
    isDisabled: false,
    longToken: {
      name: "Chainlink",
      symbol: "LINK",
      decimals: 18,
      priceDecimals: 3,
      address: "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4",
      isStable: false,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/877/thumb/chainlink-new-logo.png?1547034700",
      coingeckoUrl: "https://www.coingecko.com/en/coins/chainlink",
      explorerUrl: "https://arbiscan.io/token/0xf97f4df75117a78c1a5a0dbb814af92458539fb4",
      isV1Available: true,
      prices: {
        minPrice: {
          type: "bigint",
          hex: "0x556090e6d276a8f758a2c00000",
        },
        maxPrice: {
          type: "bigint",
          hex: "0x556090e6d276a8f758a2c00000",
        },
      },
      balance: {
        type: "bigint",
        hex: "0x00",
      },
    },
    shortToken: {
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      isStable: true,
      isV1Available: true,
      imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
      coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
      explorerUrl: "https://arbiscan.io/address/0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      prices: {
        minPrice: {
          type: "bigint",
          hex: "0x0c9ed9e4fd69ace1175c000000",
        },
        maxPrice: {
          type: "bigint",
          hex: "0x0c9f2c9cd04674edea40000000",
        },
      },
      balance: {
        type: "bigint",
        hex: "0x00",
      },
    },
    indexToken: {
      name: "Chainlink",
      symbol: "LINK",
      decimals: 18,
      priceDecimals: 3,
      address: "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4",
      isStable: false,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/877/thumb/chainlink-new-logo.png?1547034700",
      coingeckoUrl: "https://www.coingecko.com/en/coins/chainlink",
      explorerUrl: "https://arbiscan.io/token/0xf97f4df75117a78c1a5a0dbb814af92458539fb4",
      isV1Available: true,
      prices: {
        minPrice: {
          type: "bigint",
          hex: "0x556090e6d276a8f758a2c00000",
        },
        maxPrice: {
          type: "bigint",
          hex: "0x556090e6d276a8f758a2c00000",
        },
      },
      balance: {
        type: "bigint",
        hex: "0x00",
      },
    },
    longInterestUsd: {
      type: "bigint",
      hex: "0x29cf834a41cb949cdf3f427c08b362",
    },
    shortInterestUsd: {
      type: "bigint",
      hex: "0x25baaa7ec200d5089e428f60419720",
    },
    longInterestInTokens: {
      type: "bigint",
      hex: "0x069f91dd048de9ca3cc9",
    },
    shortInterestInTokens: {
      type: "bigint",
      hex: "0x0688daeb985818453687",
    },
    longPoolAmount: {
      type: "bigint",
      hex: "0x0932f2cfbf20708d31a8",
    },
    shortPoolAmount: {
      type: "bigint",
      hex: "0x39f1b6b292",
    },
    maxLongPoolAmount: {
      type: "bigint",
      hex: "0x3011b1d5167467e00000",
    },
    maxShortPoolAmount: {
      type: "bigint",
      hex: "0x015d3ef79800",
    },
    longPoolAmountAdjustment: {
      type: "bigint",
      hex: "0x00",
    },
    shortPoolAmountAdjustment: {
      type: "bigint",
      hex: "0x00",
    },
    poolValueMin: {
      type: "bigint",
      hex: "0x68e440fd24bc8f5e140dab3feb5f03",
    },
    poolValueMax: {
      type: "bigint",
      hex: "0x68e57b1addcc183259cfcedf0b5f03",
    },
    reserveFactorLong: {
      type: "bigint",
      hex: "0x0b5c0e8d21d902d61fa0000000",
    },
    reserveFactorShort: {
      type: "bigint",
      hex: "0x0b5c0e8d21d902d61fa0000000",
    },
    openInterestReserveFactorLong: {
      type: "bigint",
      hex: "0x0a18f07d736b90be5500000000",
    },
    openInterestReserveFactorShort: {
      type: "bigint",
      hex: "0x0a18f07d736b90be5500000000",
    },
    maxOpenInterestLong: {
      type: "bigint",
      hex: "0x02f050fe938943acc45f65568000000000",
    },
    maxOpenInterestShort: {
      type: "bigint",
      hex: "0x02f050fe938943acc45f65568000000000",
    },
    totalBorrowingFees: {
      type: "bigint",
      hex: "0x4959b5647baa949d1f4102e6db02",
    },
    positionImpactPoolAmount: {
      type: "bigint",
      hex: "0x8b1c456c98410b0fdb",
    },
    swapImpactPoolAmountLong: {
      type: "bigint",
      hex: "0x0b93140efdcea00f6c",
    },
    swapImpactPoolAmountShort: {
      type: "bigint",
      hex: "0x09dc25ce",
    },
    borrowingFactorLong: {
      type: "bigint",
      hex: "0x01fd933494aa5fe00000",
    },
    borrowingFactorShort: {
      type: "bigint",
      hex: "0x01fd933494aa5fe00000",
    },
    borrowingExponentFactorLong: {
      type: "bigint",
      hex: "0x0c9f2c9cd04674edea40000000",
    },
    borrowingExponentFactorShort: {
      type: "bigint",
      hex: "0x0c9f2c9cd04674edea40000000",
    },
    fundingFactor: {
      type: "bigint",
      hex: "0x043c33c1937564800000",
    },
    fundingExponentFactor: {
      type: "bigint",
      hex: "0x0c9f2c9cd04674edea40000000",
    },
    maxPnlFactorForTradersLong: {
      type: "bigint",
      hex: "0x0a18f07d736b90be5500000000",
    },
    maxPnlFactorForTradersShort: {
      type: "bigint",
      hex: "0x0a18f07d736b90be5500000000",
    },
    minCollateralFactor: {
      type: "bigint",
      hex: "0x204fce5e3e25026110000000",
    },
    minCollateralFactorForOpenInterestLong: {
      type: "bigint",
      hex: "0x021e19e0c9bab2400000",
    },
    minCollateralFactorForOpenInterestShort: {
      type: "bigint",
      hex: "0x021e19e0c9bab2400000",
    },
    claimableFundingAmountLong: {
      type: "bigint",
      hex: "0x00",
    },
    claimableFundingAmountShort: {
      type: "bigint",
      hex: "0x00",
    },
    positionFeeFactorForPositiveImpact: {
      type: "bigint",
      hex: "0x019d971e4fe8401e74000000",
    },
    positionFeeFactorForNegativeImpact: {
      type: "bigint",
      hex: "0x024306c4097859c43c000000",
    },
    positionImpactFactorPositive: {
      type: "bigint",
      hex: "0xd8d726b7177a800000",
    },
    positionImpactFactorNegative: {
      type: "bigint",
      hex: "0x01b1ae4d6e2ef5000000",
    },
    maxPositionImpactFactorPositive: {
      type: "bigint",
      hex: "0x204fce5e3e25026110000000",
    },
    maxPositionImpactFactorNegative: {
      type: "bigint",
      hex: "0x204fce5e3e25026110000000",
    },
    maxPositionImpactFactorForLiquidations: {
      type: "bigint",
      hex: "0x204fce5e3e25026110000000",
    },
    positionImpactExponentFactor: {
      type: "bigint",
      hex: "0x193e5939a08ce9dbd480000000",
    },
    swapFeeFactorForPositiveImpact: {
      type: "bigint",
      hex: "0x019d971e4fe8401e74000000",
    },
    swapFeeFactorForNegativeImpact: {
      type: "bigint",
      hex: "0x024306c4097859c43c000000",
    },
    swapImpactFactorPositive: {
      type: "bigint",
      hex: "0xd8d726b7177a800000",
    },
    swapImpactFactorNegative: {
      type: "bigint",
      hex: "0x01b1ae4d6e2ef5000000",
    },
    swapImpactExponentFactor: {
      type: "bigint",
      hex: "0x193e5939a08ce9dbd480000000",
    },
    borrowingFactorPerSecondForLongs: {
      type: "bigint",
      hex: "0x016ee53f9eddc666e9cd",
    },
    borrowingFactorPerSecondForShorts: {
      type: "bigint",
      hex: "0x00",
    },
    fundingFactorPerSecond: {
      type: "bigint",
      hex: "0x37a240378011ba1353",
    },
    longsPayShorts: true,
    virtualPoolAmountForLongToken: {
      type: "bigint",
      hex: "0x0932f2cfbf20708d31a8",
    },
    virtualPoolAmountForShortToken: {
      type: "bigint",
      hex: "0x39f1b6b292",
    },
    virtualInventoryForPositions: {
      type: "bigint",
      hex: "-0x0414d8cb7fcabf9440fcb31bc71c42",
    },
    virtualMarketId: "0xeed81816403077d40644cf5d67e0684a662b9e79f29112103f52bebee3ca78e2",
    virtualLongTokenId: "0xc31eff1feab296b571fe8131f0a4addc859c36445b90ea23edd116081d5eb0e8",
    virtualShortTokenId: "0x0000000000000000000000000000000000000000000000000000000000000000",
  },
  indexToken: {
    name: "Chainlink",
    symbol: "LINK",
    decimals: 18,
    priceDecimals: 3,
    address: "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4",
    isStable: false,
    isShortable: true,
    imageUrl: "https://assets.coingecko.com/coins/images/877/thumb/chainlink-new-logo.png?1547034700",
    coingeckoUrl: "https://www.coingecko.com/en/coins/chainlink",
    explorerUrl: "https://arbiscan.io/token/0xf97f4df75117a78c1a5a0dbb814af92458539fb4",
    isV1Available: true,
    prices: {
      minPrice: {
        type: "bigint",
        hex: "0x556090e6d276a8f758a2c00000",
      },
      maxPrice: {
        type: "bigint",
        hex: "0x556090e6d276a8f758a2c00000",
      },
    },
    balance: {
      type: "bigint",
      hex: "0x00",
    },
  },
  swapPath: [],
  initialCollateralTokenAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  initialCollateralToken: {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    isStable: true,
    isV1Available: true,
    imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
    coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
    explorerUrl: "https://arbiscan.io/address/0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    prices: {
      minPrice: {
        type: "bigint",
        hex: "0x0c9ed9e4fd69ace1175c000000",
      },
      maxPrice: {
        type: "bigint",
        hex: "0x0c9f2c9cd04674edea40000000",
      },
    },
    balance: {
      type: "bigint",
      hex: "0x00",
    },
  },
  targetCollateralToken: {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    isStable: true,
    isV1Available: true,
    imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
    coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
    explorerUrl: "https://arbiscan.io/address/0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    prices: {
      minPrice: {
        type: "bigint",
        hex: "0x0c9ed9e4fd69ace1175c000000",
      },
      maxPrice: {
        type: "bigint",
        hex: "0x0c9f2c9cd04674edea40000000",
      },
    },
    balance: {
      type: "bigint",
      hex: "0x00",
    },
  },
  initialCollateralDeltaAmount: {
    type: "bigint",
    hex: "0x0ccd44aa",
  },
  sizeDeltaUsd: {
    type: "bigint",
    hex: "0x013d9c3584015e8cf8d0e3e0000000",
  },
  triggerPrice: {
    type: "bigint",
    hex: "0x00",
  },
  acceptablePrice: {
    type: "bigint",
    hex: "0x0de0b6b3a763fffffffffffffffffffffffffffffffffffffffffffffffffffff21f494c589c0000",
  },
  executionPrice: {
    type: "bigint",
    hex: "0x4d12677a43b19e33de0c800000",
  },
  minOutputAmount: {
    type: "bigint",
    hex: "0x00",
  },
  collateralTokenPriceMax: {
    type: "bigint",
    hex: "0x0c9fb3f29425b17ab43c400000",
  },
  collateralTokenPriceMin: {
    type: "bigint",
    hex: "0x0c9f2c9cd04674edea40000000",
  },
  indexTokenPriceMin: {
    type: "bigint",
    hex: "0x4ce01924c145b7bd784ec00000",
  },
  indexTokenPriceMax: {
    type: "bigint",
    hex: "0x4ce01924c145b7bd784ec00000",
  },
  orderType: 7,
  orderKey: "0x71591b0e0dd3e50a177e106c662f4fad919ae33b591fe4be30bf709aef3728c1",
  isLong: false,
  pnlUsd: {
    type: "bigint",
    hex: "-0x063a58761b08e374686d824c44f0",
  },
  basePnlUsd: {
    type: "bigint",
    hex: "-0x063a58761b08e374686d824c44f0",
  },
  priceImpactDiffUsd: {
    type: "bigint",
    hex: "0x00",
  },
  priceImpactUsd: {
    type: "bigint",
    hex: "-0xd44fc1b1b9374c28a82ccd8f80",
  },
  positionFeeAmount: {
    type: "bigint",
    hex: "0x44ce92",
  },
  borrowingFeeAmount: {
    type: "bigint",
    hex: "0x00",
  },
  fundingFeeAmount: {
    type: "bigint",
    hex: "0x00",
  },
  liquidationFeeAmount: {
    type: "bigint",
    hex: "0x100000",
  },
  reason: null,
  timestamp: 1693795129,
  transaction: {
    hash: "0x4575cc71b681542e739d67475f344d107d41d3fe19eb4169fb7ab6f4e109ab60",
    __typename: "Transaction",
  },
});

export const increaseLongETH = prepare({
  id: "0x26e3097fe0acab25b178836cbf3672336eed2d90aa8efa4387a8521ee10e3de6:25",
  eventName: "OrderExecuted",
  account: "0x196a492f60696930d6ee0551d3f4ed56b668aa00",
  marketAddress: "0x1529876A9348D61C6c4a3EEe1fe6CbF1117Ca315",
  indexTokenPriceMin: {
    type: "bigint",
    hex: "0x3857628d95c4c587fc90000000",
  },
  indexTokenPriceMax: {
    type: "bigint",
    hex: "0x3865679947fa383c96ba400000",
  },
  marketInfo: {
    marketTokenAddress: "0x1529876A9348D61C6c4a3EEe1fe6CbF1117Ca315",
    indexTokenAddress: "0xe39Ab88f8A4777030A534146A9Ca3B52bd5D43A3",
    longTokenAddress: "0xe39Ab88f8A4777030A534146A9Ca3B52bd5D43A3",
    shortTokenAddress: "0x04FC936a15352a1b15b3B9c56EA002051e3DB3e5",
    isSameCollaterals: false,
    isSpotOnly: false,
    name: "ETH/USD [WETH-USDC]",
    data: "",
    isDisabled: false,
    longToken: {
      name: "Wrapped Ethereum",
      symbol: "WETH",
      decimals: 18,
      address: "0xe39Ab88f8A4777030A534146A9Ca3B52bd5D43A3",
      isWrapped: true,
      baseSymbol: "ETH",
      imageUrl: "https://assets.coingecko.com/coins/images/2518/thumb/weth.png?1628852295",
      coingeckoUrl: "https://www.coingecko.com/en/coins/ethereum",
      explorerUrl: "https://goerli.arbiscan.io/address/0xe39Ab88f8A4777030A534146A9Ca3B52bd5D43A3",
      prices: {
        minPrice: {
          type: "bigint",
          hex: "0x4da5c2e2539b9feedf47a4000000",
        },
        maxPrice: {
          type: "bigint",
          hex: "0x4da5c2e2539b9feedf47a4000000",
        },
      },
      balance: {
        type: "bigint",
        hex: "0x00",
      },
    },
    shortToken: {
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      address: "0x04FC936a15352a1b15b3B9c56EA002051e3DB3e5",
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
      coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
      explorerUrl: "https://goerli.arbiscan.io/address/0x04FC936a15352a1b15b3B9c56EA002051e3DB3e5",
      prices: {
        minPrice: {
          type: "bigint",
          hex: "0x0c9f2c9cd04674edea40000000",
        },
        maxPrice: {
          type: "bigint",
          hex: "0x0c9f5e3e4ecaecf59bfc000000",
        },
      },
      balance: {
        type: "bigint",
        hex: "0x032b34fb93",
      },
    },
    indexToken: {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
      address: "0x0000000000000000000000000000000000000000",
      isNative: true,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880",
      wrappedAddress: "0xe39Ab88f8A4777030A534146A9Ca3B52bd5D43A3",
      prices: {
        minPrice: {
          type: "bigint",
          hex: "0x4da5c2e2539b9feedf47a4000000",
        },
        maxPrice: {
          type: "bigint",
          hex: "0x4da5c2e2539b9feedf47a4000000",
        },
      },
      balance: {
        type: "bigint",
        hex: "0x0d502d031e418d80",
      },
    },
    longInterestUsd: {
      type: "bigint",
      hex: "0x022046a8414f9de69d0cf155cf0000",
    },
    shortInterestUsd: {
      type: "bigint",
      hex: "0x4e26dfa7d78123e9626ca58a8000",
    },
    longInterestInTokens: {
      type: "bigint",
      hex: "0x58406568ffa2072f",
    },
    shortInterestInTokens: {
      type: "bigint",
      hex: "0x0c7cdf059ca99f12",
    },
    longPoolAmount: {
      type: "bigint",
      hex: "0x010d0f44067cb75aec",
    },
    shortPoolAmount: {
      type: "bigint",
      hex: "0x0516f73c18",
    },
    maxLongPoolAmount: {
      type: "bigint",
      hex: "0x033b2e3c9fd0803ce8000000",
    },
    maxShortPoolAmount: {
      type: "bigint",
      hex: "0x033b2e3c9fd0803ce8000000",
    },
    longPoolAmountAdjustment: {
      type: "bigint",
      hex: "0x00",
    },
    shortPoolAmountAdjustment: {
      type: "bigint",
      hex: "0x00",
    },
    poolValueMin: {
      type: "bigint",
      hex: "0x0a41795af315e559f22c3d8bd5a2df",
    },
    poolValueMax: {
      type: "bigint",
      hex: "0x0a4189e8fc06c2abc639c95e55a2df",
    },
    reserveFactorLong: {
      type: "bigint",
      hex: "0x0b5c0e8d21d902d61fa0000000",
    },
    reserveFactorShort: {
      type: "bigint",
      hex: "0x0b5c0e8d21d902d61fa0000000",
    },
    openInterestReserveFactorLong: {
      type: "bigint",
      hex: "0x0a18f07d736b90be5500000000",
    },
    openInterestReserveFactorShort: {
      type: "bigint",
      hex: "0x0a18f07d736b90be5500000000",
    },
    maxOpenInterestLong: {
      type: "bigint",
      hex: "0x02f050fe938943acc45f65568000000000",
    },
    maxOpenInterestShort: {
      type: "bigint",
      hex: "0x02f050fe938943acc45f65568000000000",
    },
    totalBorrowingFees: {
      type: "bigint",
      hex: "0x039938fe034c3882e849df93144f",
    },
    positionImpactPoolAmount: {
      type: "bigint",
      hex: "0x6545e69b0c9527",
    },
    swapImpactPoolAmountLong: {
      type: "bigint",
      hex: "0xc421dbd3e6354c84",
    },
    swapImpactPoolAmountShort: {
      type: "bigint",
      hex: "0x1109d7",
    },
    borrowingFactorLong: {
      type: "bigint",
      hex: "0x0152d02c7e14af680000",
    },
    borrowingFactorShort: {
      type: "bigint",
      hex: "0x0152d02c7e14af680000",
    },
    borrowingExponentFactorLong: {
      type: "bigint",
      hex: "0x0c9f2c9cd04674edea40000000",
    },
    borrowingExponentFactorShort: {
      type: "bigint",
      hex: "0x0c9f2c9cd04674edea40000000",
    },
    fundingFactor: {
      type: "bigint",
      hex: "0x043c33c1937564800000",
    },
    fundingExponentFactor: {
      type: "bigint",
      hex: "0x0c9f2c9cd04674edea40000000",
    },

    maxPnlFactorForTradersLong: {
      type: "bigint",
      hex: "0x0a18f07d736b90be5500000000",
    },
    maxPnlFactorForTradersShort: {
      type: "bigint",
      hex: "0x0a18f07d736b90be5500000000",
    },
    minCollateralFactor: {
      type: "bigint",
      hex: "0x204fce5e3e25026110000000",
    },
    minCollateralFactorForOpenInterestLong: {
      type: "bigint",
      hex: "0x00",
    },
    minCollateralFactorForOpenInterestShort: {
      type: "bigint",
      hex: "0x00",
    },
    claimableFundingAmountLong: {
      type: "bigint",
      hex: "0x00",
    },
    claimableFundingAmountShort: {
      type: "bigint",
      hex: "0x00",
    },
    positionFeeFactorForPositiveImpact: {
      type: "bigint",
      hex: "0x019d971e4fe8401e74000000",
    },
    positionFeeFactorForNegativeImpact: {
      type: "bigint",
      hex: "0x024306c4097859c43c000000",
    },
    positionImpactFactorPositive: {
      type: "bigint",
      hex: "0x0a968163f0a57b400000",
    },
    positionImpactFactorNegative: {
      type: "bigint",
      hex: "0x152d02c7e14af6800000",
    },
    maxPositionImpactFactorPositive: {
      type: "bigint",
      hex: "0x204fce5e3e25026110000000",
    },
    maxPositionImpactFactorNegative: {
      type: "bigint",
      hex: "0x204fce5e3e25026110000000",
    },
    maxPositionImpactFactorForLiquidations: {
      type: "bigint",
      hex: "0x204fce5e3e25026110000000",
    },
    positionImpactExponentFactor: {
      type: "bigint",
      hex: "0x193e5939a08ce9dbd480000000",
    },
    swapFeeFactorForPositiveImpact: {
      type: "bigint",
      hex: "0x019d971e4fe8401e74000000",
    },
    swapFeeFactorForNegativeImpact: {
      type: "bigint",
      hex: "0x024306c4097859c43c000000",
    },
    swapImpactFactorPositive: {
      type: "bigint",
      hex: "0x0422ca8b0a00a425000000",
    },
    swapImpactFactorNegative: {
      type: "bigint",
      hex: "0x084595161401484a000000",
    },
    swapImpactExponentFactor: {
      type: "bigint",
      hex: "0x193e5939a08ce9dbd480000000",
    },
    borrowingFactorPerSecondForLongs: {
      type: "bigint",
      hex: "0x6f21761111e36370fb",
    },
    borrowingFactorPerSecondForShorts: {
      type: "bigint",
      hex: "0x00",
    },
    fundingFactorPerSecond: {
      type: "bigint",
      hex: "0x032bf02010abf18d9165",
    },
    longsPayShorts: true,
    virtualPoolAmountForLongToken: {
      type: "bigint",
      hex: "0x011ac7d4466b853839",
    },
    virtualPoolAmountForShortToken: {
      type: "bigint",
      hex: "0x011f58e1616e72e2d5",
    },
    virtualInventoryForPositions: {
      type: "bigint",
      hex: "0x00",
    },
    virtualMarketId: "0x04533437e2e8ae1c70c421e7a0dd36e023e0d6217198f889f9eb9c2a6727481d",
    virtualLongTokenId: "0x0000000000000000000000000000000000000000000000000000000000000000",
    virtualShortTokenId: "0x0000000000000000000000000000000000000000000000000000000000000000",
  },
  indexToken: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
    address: "0x0000000000000000000000000000000000000000",
    isNative: true,
    isShortable: true,
    imageUrl: "https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880",
    wrappedAddress: "0xe39Ab88f8A4777030A534146A9Ca3B52bd5D43A3",
    prices: {
      minPrice: {
        type: "bigint",
        hex: "0x4da5c2e2539b9feedf47a4000000",
      },
      maxPrice: {
        type: "bigint",
        hex: "0x4da5c2e2539b9feedf47a4000000",
      },
    },
    balance: {
      type: "bigint",
      hex: "0x0d502d031e418d80",
    },
  },
  swapPath: [],
  initialCollateralTokenAddress: "0x04FC936a15352a1b15b3B9c56EA002051e3DB3e5",
  initialCollateralToken: {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    address: "0x04FC936a15352a1b15b3B9c56EA002051e3DB3e5",
    isStable: true,
    imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
    coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
    explorerUrl: "https://goerli.arbiscan.io/address/0x04FC936a15352a1b15b3B9c56EA002051e3DB3e5",
    prices: {
      minPrice: {
        type: "bigint",
        hex: "0x0c9f2c9cd04674edea40000000",
      },
      maxPrice: {
        type: "bigint",
        hex: "0x0c9f5e3e4ecaecf59bfc000000",
      },
    },
    balance: {
      type: "bigint",
      hex: "0x032b34fb93",
    },
  },
  targetCollateralToken: {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    address: "0x04FC936a15352a1b15b3B9c56EA002051e3DB3e5",
    isStable: true,
    imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
    coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
    explorerUrl: "https://goerli.arbiscan.io/address/0x04FC936a15352a1b15b3B9c56EA002051e3DB3e5",
    prices: {
      minPrice: {
        type: "bigint",
        hex: "0x0c9f2c9cd04674edea40000000",
      },
      maxPrice: {
        type: "bigint",
        hex: "0x0c9f5e3e4ecaecf59bfc000000",
      },
    },
    balance: {
      type: "bigint",
      hex: "0x032b34fb93",
    },
  },
  initialCollateralDeltaAmount: {
    type: "bigint",
    hex: "0x56d34e",
  },
  sizeDeltaUsd: {
    type: "bigint",
    hex: "0x0274fd87d9cef9af3032d6000000",
  },
  triggerPrice: {
    type: "bigint",
    hex: "0x00",
  },
  acceptablePrice: {
    type: "bigint",
    hex: "0x4e5def46246d68ec7afe002c0000",
  },
  executionPrice: {
    type: "bigint",
    hex: "0x4e223e3936a0882035b8a9240000",
  },
  minOutputAmount: {
    type: "bigint",
    hex: "0x00",
  },
  orderType: 2,
  orderKey: "0x2f4bdbd274d9b706a05dceaf39fb926f0374e5018c8891ce53063fad64c1a080",
  isLong: true,
  priceImpactUsd: {
    type: "bigint",
    hex: "-0x011b2bb11d33b875a35ffdd2a0",
  },
  reason: null,
  reasonBytes: null,
  timestamp: 1695310360,
  transaction: {
    hash: "0x26e3097fe0acab25b178836cbf3672336eed2d90aa8efa4387a8521ee10e3de6",
    __typename: "Transaction",
  },
});

export const requestSwap = prepareSwap({
  id: "0x3fc3171b610c81a9866092f21dff8746e8f2dcb0e221e59c553a5aedb3d45236:2",
  eventName: "OrderCreated",
  account: "0x90c5814240ae5cf09730536e76c117fa00eb7d8e",
  swapPath: ["0x72349b00768601D9598084220224948CE5b6Ebdd", "0x22B9076BBCD93E491999AA748fDD6623fa019532"],
  orderType: 0,
  orderKey: "0x084356b07d4a6e14a9141e42d731bbbae47a9dc05cf41b0e7c35c8b0d5a3f6ff",
  initialCollateralTokenAddress: "0xe39ab88f8a4777030a534146a9ca3b52bd5d43a3",
  initialCollateralDeltaAmount: {
    type: "bigint",
    hex: "0x2a941ee0ca93b6",
  },
  minOutputAmount: {
    type: "bigint",
    hex: "0x02608540",
  },
  shouldUnwrapNativeToken: false,
  targetCollateralToken: {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    address: "0x04FC936a15352a1b15b3B9c56EA002051e3DB3e5",
    isStable: true,
    imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
    coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
    explorerUrl: "https://goerli.arbiscan.io/address/0x04FC936a15352a1b15b3B9c56EA002051e3DB3e5",
    prices: {
      minPrice: {
        type: "bigint",
        hex: "0x0c9ea874333866f92ba3c00000",
      },
      maxPrice: {
        type: "bigint",
        hex: "0x0c9fcb59381ec6bed809800000",
      },
    },
    balance: {
      type: "bigint",
      hex: "0x02780d5814",
    },
  },
  initialCollateralToken: {
    name: "Wrapped Ethereum",
    symbol: "WETH",
    decimals: 18,
    address: "0xe39Ab88f8A4777030A534146A9Ca3B52bd5D43A3",
    isWrapped: true,
    baseSymbol: "ETH",
    imageUrl: "https://assets.coingecko.com/coins/images/2518/thumb/weth.png?1628852295",
    coingeckoUrl: "https://www.coingecko.com/en/coins/ethereum",
    explorerUrl: "https://goerli.arbiscan.io/address/0xe39Ab88f8A4777030A534146A9Ca3B52bd5D43A3",
    prices: {
      minPrice: {
        type: "bigint",
        hex: "0x5414f40165fe6a9c296b63c00000",
      },
      maxPrice: {
        type: "bigint",
        hex: "0x5415433252453aeb1638a7400000",
      },
    },
    balance: {
      type: "bigint",
      hex: "0x00",
    },
  },
  timestamp: 1696257316,
  transaction: {
    hash: "0x3fc3171b610c81a9866092f21dff8746e8f2dcb0e221e59c553a5aedb3d45236",
    __typename: "Transaction",
  },
});

export const executeSwap = prepareSwap({
  id: "0xd268078948c6450ab35469254c9e8ece9a5fb30c9e75b61be99e2393a770f91b:16",
  eventName: "OrderExecuted",
  account: "0xc21341949e8a9e65525a7275090718fea73db94c",
  swapPath: ["0x1529876A9348D61C6c4a3EEe1fe6CbF1117Ca315"],
  orderType: 0,
  orderKey: "0xd62a7fc4a0387e9c40206327804e4b68e77655d7b30dcc19103f2c1c29c10bd7",
  initialCollateralTokenAddress: "0x04fc936a15352a1b15b3b9c56ea002051e3db3e5",
  initialCollateralDeltaAmount: {
    type: "bigint",
    hex: "0x406924f3",
  },
  minOutputAmount: {
    type: "bigint",
    hex: "0x0f7dea0694ae55f8",
  },
  executionAmountOut: {
    type: "bigint",
    hex: "0x0f89a97544b41524",
  },
  shouldUnwrapNativeToken: true,
  targetCollateralToken: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
    address: "0x0000000000000000000000000000000000000000",
    isNative: true,
    isShortable: true,
    imageUrl: "https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880",
    wrappedAddress: "0xe39Ab88f8A4777030A534146A9Ca3B52bd5D43A3",
    prices: {
      minPrice: {
        type: "bigint",
        hex: "0x5414f40165fe6a9c296b63c00000",
      },
      maxPrice: {
        type: "bigint",
        hex: "0x5415433252453aeb1638a7400000",
      },
    },
    balance: {
      type: "bigint",
      hex: "0x0d4b4b7a1a4c8c80",
    },
  },
  initialCollateralToken: {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    address: "0x04FC936a15352a1b15b3B9c56EA002051e3DB3e5",
    isStable: true,
    imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
    coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
    explorerUrl: "https://goerli.arbiscan.io/address/0x04FC936a15352a1b15b3B9c56EA002051e3DB3e5",
    prices: {
      minPrice: {
        type: "bigint",
        hex: "0x0c9ea874333866f92ba3c00000",
      },
      maxPrice: {
        type: "bigint",
        hex: "0x0c9fcb59381ec6bed809800000",
      },
    },
    balance: {
      type: "bigint",
      hex: "0x02780d5814",
    },
  },
  timestamp: 1696212520,
  transaction: {
    hash: "0xd268078948c6450ab35469254c9e8ece9a5fb30c9e75b61be99e2393a770f91b",
    __typename: "Transaction",
  },
});

export const executeOrderSwap = prepareSwap({
  id: "0x7805d7f25e04c62736e6109c13c2906f0a5690c7e6f9360da0d254ed147bb88c:33",
  eventName: "OrderExecuted",
  account: "0xd0fa2ebeac5e1b5876ce2754100e9009fc0bd4fc",
  swapPath: ["0x1529876A9348D61C6c4a3EEe1fe6CbF1117Ca315", "0x339eF6aAcF8F4B2AD15BdcECBEED1842Ec4dBcBf"],
  orderType: 1,
  orderKey: "0x0c9cef614c72abac6d78e4bad1310225bca88436b69a6396e54b76d5a3297b5f",
  initialCollateralTokenAddress: "0xe39ab88f8a4777030a534146a9ca3b52bd5d43a3",
  initialCollateralDeltaAmount: {
    type: "bigint",
    hex: "0x0429d069189e0000",
  },
  minOutputAmount: {
    type: "bigint",
    hex: "0xca6ece",
  },
  executionAmountOut: {
    type: "bigint",
    hex: "0x0234614c",
  },
  shouldUnwrapNativeToken: false,
  targetCollateralToken: {
    name: "Bitcoin",
    symbol: "BTC",
    decimals: 8,
    address: "0xCcF73F4Dcbbb573296BFA656b754Fe94BB957d62",
    isShortable: true,
    imageUrl: "https://assets.coingecko.com/coins/images/7598/thumb/wrapped_bitcoin_wbtc.png?1548822744",
    coingeckoUrl: "https://www.coingecko.com/en/coins/bitcoin",
    explorerUrl: "https://goerli.arbiscan.io/address/0xCcF73F4Dcbbb573296BFA656b754Fe94BB957d62",
    prices: {
      minPrice: {
        type: "bigint",
        hex: "0x056a5ca059157e7ea7ff60d2c00000",
      },
      maxPrice: {
        type: "bigint",
        hex: "0x056a73fcfb84ba487580064b000000",
      },
    },
    balance: {
      type: "bigint",
      hex: "0x04b6ac44",
    },
  },
  initialCollateralToken: {
    name: "Wrapped Ethereum",
    symbol: "WETH",
    decimals: 18,
    address: "0xe39Ab88f8A4777030A534146A9Ca3B52bd5D43A3",
    isWrapped: true,
    baseSymbol: "ETH",
    imageUrl: "https://assets.coingecko.com/coins/images/2518/thumb/weth.png?1628852295",
    coingeckoUrl: "https://www.coingecko.com/en/coins/ethereum",
    explorerUrl: "https://goerli.arbiscan.io/address/0xe39Ab88f8A4777030A534146A9Ca3B52bd5D43A3",
    prices: {
      minPrice: {
        type: "bigint",
        hex: "0x538ed4f5fc330a6a53d645800000",
      },
      maxPrice: {
        type: "bigint",
        hex: "0x5393ab3da897ec3e9716a6c00000",
      },
    },
    balance: {
      type: "bigint",
      hex: "0x00",
    },
  },
  timestamp: 1695969999,
  transaction: {
    hash: "0x7805d7f25e04c62736e6109c13c2906f0a5690c7e6f9360da0d254ed147bb88c",
    __typename: "Transaction",
  },
});

export const failedSwap = prepareSwap({
  id: "0xa099b53637fa6b5e50a877cbe638c11d1063e56b631df16aa7a6739d585dd310:2",
  eventName: "OrderFrozen",
  account: "0x414da6c7c50eadfbd4c67c902c7daf59f58d32c7",
  swapPath: ["0xbf338a6C595f06B7Cfff2FA8c958d49201466374"],
  orderType: 1,
  orderKey: "0x93f2aea553e314c682d539fd06ea21ffb636d84fab63e8235d69f33442a1fd92",
  initialCollateralTokenAddress: "0x3ebdeaa0db3ffde96e7a0dbbafec961fc50f725f",
  initialCollateralDeltaAmount: {
    type: "bigint",
    hex: "0x0f4240",
  },
  minOutputAmount: {
    type: "bigint",
    hex: "0x01baaa97524bc9",
  },
  shouldUnwrapNativeToken: false,
  targetCollateralToken: {
    name: "Ethereum (WETH.e)",
    symbol: "ETH",
    assetSymbol: "WETH.e",
    address: "0x82F0b3695Ed2324e55bbD9A9554cB4192EC3a514",
    decimals: 18,
    isShortable: true,
    imageUrl: "https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880",
    coingeckoUrl: "https://www.coingecko.com/en/coins/weth",
    coingeckoSymbol: "WETH",
    explorerUrl: "https://testnet.snowtrace.io/address/0x82F0b3695Ed2324e55bbD9A9554cB4192EC3a514",
    prices: {
      minPrice: {
        type: "bigint",
        hex: "0xa78605e37704c320258d40000000",
      },
      maxPrice: {
        type: "bigint",
        hex: "0xa78605e37704c320258d40000000",
      },
    },
    balance: {
      type: "bigint",
      hex: "0x11431e0210d745",
    },
  },
  initialCollateralToken: {
    name: "USD Coin",
    symbol: "USDC",
    address: "0x3eBDeaA0DB3FfDe96E7a0DBBAFEC961FC50F725F",
    decimals: 6,
    isStable: true,
    imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
    coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
    explorerUrl: "https://testnet.snowtrace.io/address/0x3eBDeaA0DB3FfDe96E7a0DBBAFEC961FC50F725F",
    prices: {
      minPrice: {
        type: "bigint",
        hex: "0x0c9f2c9cd04674edea40000000",
      },
      maxPrice: {
        type: "bigint",
        hex: "0x0ca03d95081f09183bca000000",
      },
    },
    balance: {
      type: "bigint",
      hex: "0x154e10cc",
    },
  },
  timestamp: 1707903199,
  transaction: {
    hash: "0xa099b53637fa6b5e50a877cbe638c11d1063e56b631df16aa7a6739d585dd310",
    __typename: "Transaction",
  },
  reason: "",
  reasonBytes:
    "0xa7aebadc0000000000000000000000000000000000000000000000000001ba552327845f0000000000000000000000000000000000000000000000000001baaa97524bc9",
});

export const createOrderStopMarketLong = prepare({
  id: "0xdbbc158a679f0ead3ef31c84f348ebf86534d2de4deed255de0ee98f997d7bf3:4",
  eventName: "OrderCreated",
  account: "0x414da6c7c50eadfbd4c67c902c7daf59f58d32c7",
  marketAddress: "0x47c031236e19d024b42f8AE6780E44A573170703",
  marketInfo: {
    longInterestUsd: { type: "bigint", value: "35161498070003551568751084656764834665" },
    shortInterestUsd: { type: "bigint", value: "25130901911552440056119179520327322961" },
    longInterestInTokens: { type: "bigint", value: "36377738893" },
    shortInterestInTokens: { type: "bigint", value: "27739357261" },
    longPoolAmount: { type: "bigint", value: "51268342896" },
    shortPoolAmount: { type: "bigint", value: "48207195115902" },
    poolValueMin: { type: "bigint", value: "95150788362339377687591280073019726719" },
    poolValueMax: { type: "bigint", value: "95150788362339377687591280073019726719" },
    totalBorrowingFees: { type: "bigint", value: "170513330959216351746467536638436532" },
    positionImpactPoolAmount: { type: "bigint", value: "4168108956" },
    swapImpactPoolAmountLong: { type: "bigint", value: "339497444" },
    swapImpactPoolAmountShort: { type: "bigint", value: "5671994840" },
    borrowingFactorPerSecondForLongs: { type: "bigint", value: "4821398552806963384219" },
    borrowingFactorPerSecondForShorts: { type: "bigint", value: "0" },
    fundingFactorPerSecond: { type: "bigint", value: "4026832733969745147374" },
    longsPayShorts: false,
    virtualPoolAmountForLongToken: { type: "bigint", value: "53344644343" },
    virtualPoolAmountForShortToken: { type: "bigint", value: "50160148540804" },
    virtualInventoryForPositions: { type: "bigint", value: "-9964932665251764549550043701788947898" },
    isDisabled: false,
    maxLongPoolUsdForDeposit: { type: "bigint", value: "60000000000000000000000000000000000000" },
    maxShortPoolUsdForDeposit: { type: "bigint", value: "60000000000000000000000000000000000000" },
    maxLongPoolAmount: { type: "bigint", value: "220000000000" },
    maxShortPoolAmount: { type: "bigint", value: "110000000000000" },
    longPoolAmountAdjustment: { type: "bigint", value: "0" },
    shortPoolAmountAdjustment: { type: "bigint", value: "0" },
    reserveFactorLong: { type: "bigint", value: "2150000000000000000000000000000" },
    reserveFactorShort: { type: "bigint", value: "2150000000000000000000000000000" },
    openInterestReserveFactorLong: { type: "bigint", value: "2100000000000000000000000000000" },
    openInterestReserveFactorShort: { type: "bigint", value: "2100000000000000000000000000000" },
    maxOpenInterestLong: { type: "bigint", value: "90251000000000000000000000000000000000" },
    maxOpenInterestShort: { type: "bigint", value: "90251000000000000000000000000000000000" },
    minPositionImpactPoolAmount: { type: "bigint", value: "95000000" },
    positionImpactPoolDistributionRate: { type: "bigint", value: "0" },
    borrowingFactorLong: { type: "bigint", value: "6250000000000000000000" },
    borrowingFactorShort: { type: "bigint", value: "6250000000000000000000" },
    borrowingExponentFactorLong: { type: "bigint", value: "1000000000000000000000000000000" },
    borrowingExponentFactorShort: { type: "bigint", value: "1000000000000000000000000000000" },
    fundingFactor: { type: "bigint", value: "20000000000000000000000" },
    fundingExponentFactor: { type: "bigint", value: "1000000000000000000000000000000" },
    fundingIncreaseFactorPerSecond: { type: "bigint", value: "2048553493366975277" },
    fundingDecreaseFactorPerSecond: { type: "bigint", value: "128034593335435961" },
    thresholdForDecreaseFunding: { type: "bigint", value: "0" },
    thresholdForStableFunding: { type: "bigint", value: "40000000000000000000000000000" },
    minFundingFactorPerSecond: { type: "bigint", value: "317097919837645865043" },
    maxFundingFactorPerSecond: { type: "bigint", value: "22124377728363333333333" },
    maxPnlFactorForTradersLong: { type: "bigint", value: "900000000000000000000000000000" },
    maxPnlFactorForTradersShort: { type: "bigint", value: "900000000000000000000000000000" },
    minCollateralFactor: { type: "bigint", value: "5000000000000000000000000000" },
    minCollateralFactorForOpenInterestLong: { type: "bigint", value: "60000000000000000000" },
    minCollateralFactorForOpenInterestShort: { type: "bigint", value: "60000000000000000000" },
    positionFeeFactorForPositiveImpact: { type: "bigint", value: "400000000000000000000000000" },
    positionFeeFactorForNegativeImpact: { type: "bigint", value: "600000000000000000000000000" },
    positionImpactFactorPositive: { type: "bigint", value: "3360664378949365000000" },
    positionImpactFactorNegative: { type: "bigint", value: "4032797254739238000000" },
    maxPositionImpactFactorPositive: { type: "bigint", value: "5000000000000000000000000000" },
    maxPositionImpactFactorNegative: { type: "bigint", value: "5000000000000000000000000000" },
    maxPositionImpactFactorForLiquidations: { type: "bigint", value: "0" },
    positionImpactExponentFactor: { type: "bigint", value: "1739944843614544000000000000000" },
    swapFeeFactorForPositiveImpact: { type: "bigint", value: "500000000000000000000000000" },
    swapFeeFactorForNegativeImpact: { type: "bigint", value: "700000000000000000000000000" },
    swapImpactFactorPositive: { type: "bigint", value: "200000000000000000000" },
    swapImpactFactorNegative: { type: "bigint", value: "400000000000000000000" },
    swapImpactExponentFactor: { type: "bigint", value: "2000000000000000000000000000000" },
    virtualMarketId: "0xba1ff14bf93fbb00b6f43d3ad403cc4c6496c1bb88489075c8b1bc709bde9ebb",
    virtualLongTokenId: "0x0000000000000000000000000000000000000000000000000000000000000000",
    virtualShortTokenId: "0x0000000000000000000000000000000000000000000000000000000000000000",
    claimableFundingAmountLong: { type: "bigint", value: "119" },
    claimableFundingAmountShort: { type: "bigint", value: "337105" },
    marketTokenAddress: "0x47c031236e19d024b42f8AE6780E44A573170703",
    indexTokenAddress: "0x47904963fc8b2340414262125aF798B9655E58Cd",
    longTokenAddress: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
    shortTokenAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    enabled: true,
    listingDate: {},
    isSameCollaterals: false,
    isSpotOnly: false,
    name: "BTC/USD [BTC-USDC]",
    data: "",
    longToken: {
      name: "Bitcoin (WBTC)",
      symbol: "BTC",
      assetSymbol: "WBTC",
      baseSymbol: "BTC",
      decimals: 8,
      address: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
      isShortable: true,
      categories: ["layer1"],
      imageUrl: "https://assets.coingecko.com/coins/images/26115/thumb/btcb.png?1655921693",
      coingeckoUrl: "https://www.coingecko.com/en/coins/wrapped-bitcoin",
      explorerUrl: "https://arbiscan.io/address/0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f",
      isV1Available: true,
      prices: {
        minPrice: { type: "bigint", value: "95699884797904795000000000000000000" },
        maxPrice: { type: "bigint", value: "95699884797904795000000000000000000" },
      },
      balance: { type: "bigint", value: "1" },
    },
    shortToken: {
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      isStable: true,
      isV1Available: true,
      imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
      coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
      explorerUrl: "https://arbiscan.io/address/0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      prices: {
        minPrice: { type: "bigint", value: "999892396085279625000000000000" },
        maxPrice: { type: "bigint", value: "999892396085279625000000000000" },
      },
      balance: { type: "bigint", value: "0" },
    },
    indexToken: {
      name: "Bitcoin",
      symbol: "BTC",
      address: "0x47904963fc8b2340414262125aF798B9655E58Cd",
      isSynthetic: true,
      decimals: 8,
      categories: ["layer1"],
      imageUrl: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png?1547033579",
      coingeckoUrl: "https://www.coingecko.com/en/coins/bitcoin",
      prices: {
        minPrice: { type: "bigint", value: "95699884797904795000000000000000000" },
        maxPrice: { type: "bigint", value: "95699884797904795000000000000000000" },
      },
    },
  },
  indexToken: {
    name: "Bitcoin",
    symbol: "BTC",
    address: "0x47904963fc8b2340414262125aF798B9655E58Cd",
    isSynthetic: true,
    decimals: 8,
    categories: ["layer1"],
    imageUrl: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png?1547033579",
    coingeckoUrl: "https://www.coingecko.com/en/coins/bitcoin",
    prices: {
      minPrice: { type: "bigint", value: "95699884797904795000000000000000000" },
      maxPrice: { type: "bigint", value: "95699884797904795000000000000000000" },
    },
  },
  swapPath: ["0x55391D178Ce46e7AC8eaAEa50A72D1A5a8A622Da"],
  initialCollateralTokenAddress: "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a",
  initialCollateralToken: {
    name: "GMX",
    symbol: "GMX",
    address: "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a",
    decimals: 18,
    isPlatformToken: true,
    isPlatformTradingToken: true,
    categories: ["defi"],
    imageUrl: "https://assets.coingecko.com/coins/images/18323/small/arbit.png?1631532468",
    coingeckoUrl: "https://www.coingecko.com/en/coins/gmx",
    explorerUrl: "https://arbiscan.io/address/0xfc5a1a6eb076a2c7ad06ed22c90d7e710e35ad0a",
    prices: {
      minPrice: { type: "bigint", value: "19092370152335000000000000000000" },
      maxPrice: { type: "bigint", value: "19099725996588000000000000000000" },
    },
    balance: { type: "bigint", value: "0" },
  },
  targetCollateralToken: {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    isStable: true,
    isV1Available: true,
    imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
    coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
    explorerUrl: "https://arbiscan.io/address/0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    prices: {
      minPrice: { type: "bigint", value: "999892396085279625000000000000" },
      maxPrice: { type: "bigint", value: "999892396085279625000000000000" },
    },
    balance: { type: "bigint", value: "0" },
  },
  initialCollateralDeltaAmount: { type: "bigint", value: "158102627054385468" },
  sizeDeltaUsd: { type: "bigint", value: "3620480542408546814906705815200" },
  triggerPrice: { type: "bigint", value: "95600000000000000000000000000000000" },
  acceptablePrice: {
    type: "bigint",
    value: "115792089237316195423570985008687907853269984665640564039457584007913100000000",
  },
  minOutputAmount: { type: "bigint", value: "0" },
  orderType: 8,
  orderKey: "0xc13be16db934c3106c7389f92dfad08039e4e5c1ec018a3b7e6a83e70e399d2b",
  isLong: true,
  reason: null,
  reasonBytes: null,
  timestamp: 1695040998,
  transaction: {
    hash: "0xdbbc158a679f0ead3ef31c84f348ebf86534d2de4deed255de0ee98f997d7bf3",
    __typename: "Transaction",
  },
  shouldUnwrapNativeToken: false,
});

export const executeOrderStopMarketLong = prepare({
  id: "0x0d9c78f3d219c709c0e3f076d3060e27a156bc621b469098931565282f6796d7:35",
  eventName: "OrderExecuted",
  account: "0x414da6c7c50eadfbd4c67c902c7daf59f58d32c7",
  marketAddress: "0x47c031236e19d024b42f8AE6780E44A573170703",
  marketInfo: {
    longInterestUsd: { type: "bigint", value: "35161517174703575900620584656764834665" },
    shortInterestUsd: { type: "bigint", value: "25130901911552440056119179520327322961" },
    longInterestInTokens: { type: "bigint", value: "36377758864" },
    shortInterestInTokens: { type: "bigint", value: "27739357261" },
    longPoolAmount: { type: "bigint", value: "51268332446" },
    shortPoolAmount: { type: "bigint", value: "48207205114052" },
    poolValueMin: { type: "bigint", value: "95040005572282782452861211217389766382" },
    poolValueMax: { type: "bigint", value: "95040005572282782452861211217389766382" },
    totalBorrowingFees: { type: "bigint", value: "170571986380919035104568382463896315" },
    positionImpactPoolAmount: { type: "bigint", value: "4168108978" },
    swapImpactPoolAmountLong: { type: "bigint", value: "339497438" },
    swapImpactPoolAmountShort: { type: "bigint", value: "5671994840" },
    borrowingFactorPerSecondForLongs: { type: "bigint", value: "4821402182448513894058" },
    borrowingFactorPerSecondForShorts: { type: "bigint", value: "0" },
    fundingFactorPerSecond: { type: "bigint", value: "3908912585221617287518" },
    longsPayShorts: false,
    virtualPoolAmountForLongToken: { type: "bigint", value: "53344633893" },
    virtualPoolAmountForShortToken: { type: "bigint", value: "50160158578315" },
    virtualInventoryForPositions: { type: "bigint", value: "-9964951769951788881419543701788947898" },
    isDisabled: false,
    maxLongPoolUsdForDeposit: { type: "bigint", value: "60000000000000000000000000000000000000" },
    maxShortPoolUsdForDeposit: { type: "bigint", value: "60000000000000000000000000000000000000" },
    maxLongPoolAmount: { type: "bigint", value: "220000000000" },
    maxShortPoolAmount: { type: "bigint", value: "110000000000000" },
    longPoolAmountAdjustment: { type: "bigint", value: "0" },
    shortPoolAmountAdjustment: { type: "bigint", value: "0" },
    reserveFactorLong: { type: "bigint", value: "2150000000000000000000000000000" },
    reserveFactorShort: { type: "bigint", value: "2150000000000000000000000000000" },
    openInterestReserveFactorLong: { type: "bigint", value: "2100000000000000000000000000000" },
    openInterestReserveFactorShort: { type: "bigint", value: "2100000000000000000000000000000" },
    maxOpenInterestLong: { type: "bigint", value: "90251000000000000000000000000000000000" },
    maxOpenInterestShort: { type: "bigint", value: "90251000000000000000000000000000000000" },
    minPositionImpactPoolAmount: { type: "bigint", value: "95000000" },
    positionImpactPoolDistributionRate: { type: "bigint", value: "0" },
    borrowingFactorLong: { type: "bigint", value: "6250000000000000000000" },
    borrowingFactorShort: { type: "bigint", value: "6250000000000000000000" },
    borrowingExponentFactorLong: { type: "bigint", value: "1000000000000000000000000000000" },
    borrowingExponentFactorShort: { type: "bigint", value: "1000000000000000000000000000000" },
    fundingFactor: { type: "bigint", value: "20000000000000000000000" },
    fundingExponentFactor: { type: "bigint", value: "1000000000000000000000000000000" },
    fundingIncreaseFactorPerSecond: { type: "bigint", value: "2048553493366975277" },
    fundingDecreaseFactorPerSecond: { type: "bigint", value: "128034593335435961" },
    thresholdForDecreaseFunding: { type: "bigint", value: "0" },
    thresholdForStableFunding: { type: "bigint", value: "40000000000000000000000000000" },
    minFundingFactorPerSecond: { type: "bigint", value: "317097919837645865043" },
    maxFundingFactorPerSecond: { type: "bigint", value: "22124377728363333333333" },
    maxPnlFactorForTradersLong: { type: "bigint", value: "900000000000000000000000000000" },
    maxPnlFactorForTradersShort: { type: "bigint", value: "900000000000000000000000000000" },
    minCollateralFactor: { type: "bigint", value: "5000000000000000000000000000" },
    minCollateralFactorForOpenInterestLong: { type: "bigint", value: "60000000000000000000" },
    minCollateralFactorForOpenInterestShort: { type: "bigint", value: "60000000000000000000" },
    positionFeeFactorForPositiveImpact: { type: "bigint", value: "400000000000000000000000000" },
    positionFeeFactorForNegativeImpact: { type: "bigint", value: "600000000000000000000000000" },
    positionImpactFactorPositive: { type: "bigint", value: "3360664378949365000000" },
    positionImpactFactorNegative: { type: "bigint", value: "4032797254739238000000" },
    maxPositionImpactFactorPositive: { type: "bigint", value: "5000000000000000000000000000" },
    maxPositionImpactFactorNegative: { type: "bigint", value: "5000000000000000000000000000" },
    maxPositionImpactFactorForLiquidations: { type: "bigint", value: "0" },
    positionImpactExponentFactor: { type: "bigint", value: "1739944843614544000000000000000" },
    swapFeeFactorForPositiveImpact: { type: "bigint", value: "500000000000000000000000000" },
    swapFeeFactorForNegativeImpact: { type: "bigint", value: "700000000000000000000000000" },
    swapImpactFactorPositive: { type: "bigint", value: "200000000000000000000" },
    swapImpactFactorNegative: { type: "bigint", value: "400000000000000000000" },
    swapImpactExponentFactor: { type: "bigint", value: "2000000000000000000000000000000" },
    virtualMarketId: "0xba1ff14bf93fbb00b6f43d3ad403cc4c6496c1bb88489075c8b1bc709bde9ebb",
    virtualLongTokenId: "0x0000000000000000000000000000000000000000000000000000000000000000",
    virtualShortTokenId: "0x0000000000000000000000000000000000000000000000000000000000000000",
    claimableFundingAmountLong: { type: "bigint", value: "119" },
    claimableFundingAmountShort: { type: "bigint", value: "337105" },
    marketTokenAddress: "0x47c031236e19d024b42f8AE6780E44A573170703",
    indexTokenAddress: "0x47904963fc8b2340414262125aF798B9655E58Cd",
    longTokenAddress: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
    shortTokenAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    enabled: true,
    listingDate: {},
    isSameCollaterals: false,
    isSpotOnly: false,
    name: "BTC/USD [BTC-USDC]",
    data: "",
    longToken: {
      name: "Bitcoin (WBTC)",
      symbol: "BTC",
      assetSymbol: "WBTC",
      baseSymbol: "BTC",
      decimals: 8,
      address: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
      isShortable: true,
      categories: ["layer1"],
      imageUrl: "https://assets.coingecko.com/coins/images/26115/thumb/btcb.png?1655921693",
      coingeckoUrl: "https://www.coingecko.com/en/coins/wrapped-bitcoin",
      explorerUrl: "https://arbiscan.io/address/0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f",
      isV1Available: true,
      prices: {
        minPrice: { type: "bigint", value: "95424505866460967500000000000000000" },
        maxPrice: { type: "bigint", value: "95424505866460967500000000000000000" },
      },
      balance: { type: "bigint", value: "1" },
    },
    shortToken: {
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      isStable: true,
      isV1Available: true,
      imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
      coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
      explorerUrl: "https://arbiscan.io/address/0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      prices: {
        minPrice: { type: "bigint", value: "999880000000000000000000000000" },
        maxPrice: { type: "bigint", value: "999880000000000000000000000000" },
      },
      balance: { type: "bigint", value: "0" },
    },
    indexToken: {
      name: "Bitcoin",
      symbol: "BTC",
      address: "0x47904963fc8b2340414262125aF798B9655E58Cd",
      isSynthetic: true,
      decimals: 8,
      categories: ["layer1"],
      imageUrl: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png?1547033579",
      coingeckoUrl: "https://www.coingecko.com/en/coins/bitcoin",
      prices: {
        minPrice: { type: "bigint", value: "95424505866460967500000000000000000" },
        maxPrice: { type: "bigint", value: "95424505866460967500000000000000000" },
      },
    },
  },
  indexToken: {
    name: "Bitcoin",
    symbol: "BTC",
    address: "0x47904963fc8b2340414262125aF798B9655E58Cd",
    isSynthetic: true,
    decimals: 8,
    categories: ["layer1"],
    imageUrl: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png?1547033579",
    coingeckoUrl: "https://www.coingecko.com/en/coins/bitcoin",
    prices: {
      minPrice: { type: "bigint", value: "95424505866460967500000000000000000" },
      maxPrice: { type: "bigint", value: "95424505866460967500000000000000000" },
    },
  },
  swapPath: ["0x55391D178Ce46e7AC8eaAEa50A72D1A5a8A622Da"],
  initialCollateralTokenAddress: "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a",
  initialCollateralToken: {
    name: "GMX",
    symbol: "GMX",
    address: "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a",
    decimals: 18,
    isPlatformToken: true,
    isPlatformTradingToken: true,
    categories: ["defi"],
    imageUrl: "https://assets.coingecko.com/coins/images/18323/small/arbit.png?1631532468",
    coingeckoUrl: "https://www.coingecko.com/en/coins/gmx",
    explorerUrl: "https://arbiscan.io/address/0xfc5a1a6eb076a2c7ad06ed22c90d7e710e35ad0a",
    prices: {
      minPrice: { type: "bigint", value: "19035080492977000000000000000000" },
      maxPrice: { type: "bigint", value: "19042873962395000000000000000000" },
    },
    balance: { type: "bigint", value: "0" },
  },
  targetCollateralToken: {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    isStable: true,
    isV1Available: true,
    imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
    coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
    explorerUrl: "https://arbiscan.io/address/0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    prices: {
      minPrice: { type: "bigint", value: "999880000000000000000000000000" },
      maxPrice: { type: "bigint", value: "999880000000000000000000000000" },
    },
    balance: { type: "bigint", value: "0" },
  },
  initialCollateralDeltaAmount: { type: "bigint", value: "3017349" },
  sizeDeltaUsd: { type: "bigint", value: "3620480542408546814906705815200" },
  triggerPrice: { type: "bigint", value: "95600000000000000000000000000000000" },
  acceptablePrice: {
    type: "bigint",
    value: "115792089237316195423570985008687907853269984665640564039457584007913100000000",
  },
  executionPrice: { type: "bigint", value: "95754576630747072597373864400000000" },
  minOutputAmount: { type: "bigint", value: "0" },
  collateralTokenPriceMax: { type: "bigint", value: "999847351362023550000000000000000000000000" },
  collateralTokenPriceMin: { type: "bigint", value: "999847351362023550000000000000000000000000" },
  indexTokenPriceMin: { type: "bigint", value: "95754203574061710000000000000000000" },
  indexTokenPriceMax: { type: "bigint", value: "95754203574061710000000000000000000" },
  orderType: 8,
  orderKey: "0xc13be16db934c3106c7389f92dfad08039e4e5c1ec018a3b7e6a83e70e399d2b",
  isLong: true,
  priceImpactUsd: { type: "bigint", value: "34697932793167540627148628" },
  positionFeeAmount: { type: "bigint", value: "1448" },
  borrowingFeeAmount: { type: "bigint", value: "1078" },
  fundingFeeAmount: { type: "bigint", value: "824" },
  reason: null,
  reasonBytes: null,
  timestamp: 1695040998,
  transaction: {
    hash: "0x0d9c78f3d219c709c0e3f076d3060e27a156bc621b469098931565282f6796d7",
    __typename: "Transaction",
  },
  shouldUnwrapNativeToken: false,
});
