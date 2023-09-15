import { PositionTradeAction } from "domain/synthetics/tradeHistory";
import { BigNumber } from "ethers";
import { bigNumberify } from "lib/numbers";

const big = (hex: string) => bigNumberify(hex) as BigNumber;
const mapValues = <T, U>(obj: Record<string, T>, fn: (value: T) => U) => {
  return Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, fn(value)])) as Record<string, U>;
};

const prepare = (action: any): PositionTradeAction => {
  const prepareHelper = (value: any) => {
    if (typeof value === "object" && value && value.type === "BigNumber") {
      return big(value.hex);
    }

    if (typeof value === "object" && value) {
      return mapValues(value, prepareHelper);
    } else {
      return value;
    }
  };
  return prepareHelper(action) as PositionTradeAction;
};

export const requestIncreasePosition = prepare({
  id: "0xde5c5f634b81dd10eb96a2cc1b08a9d15d09a35a8d07f8252498855b68b4f3df:19",
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
          type: "BigNumber",
          hex: "0x0516af396904d1b6510b3ce0000000",
        },
        maxPrice: {
          type: "BigNumber",
          hex: "0x0516af396904d1b6510b3ce0000000",
        },
      },
      balance: {
        type: "BigNumber",
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
          type: "BigNumber",
          hex: "0x0c9f2c9cd04674edea40000000",
        },
        maxPrice: {
          type: "BigNumber",
          hex: "0x0c9f456d8f88b0f1c31e000000",
        },
      },
      balance: {
        type: "BigNumber",
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
          type: "BigNumber",
          hex: "0x0516af396904d1b6510b3ce0000000",
        },
        maxPrice: {
          type: "BigNumber",
          hex: "0x0516af396904d1b6510b3ce0000000",
        },
      },
      balance: {
        type: "BigNumber",
        hex: "0x04b571c0",
      },
    },
    longInterestUsd: {
      type: "BigNumber",
      hex: "0x8d151dda39e2f3d6ca7318000000",
    },
    shortInterestUsd: {
      type: "BigNumber",
      hex: "0xdbe32f323e0c4c6831d2dc900000",
    },
    longInterestInTokens: {
      type: "BigNumber",
      hex: "0xa3ea16",
    },
    shortInterestInTokens: {
      type: "BigNumber",
      hex: "0x0107657e",
    },
    longPoolAmount: {
      type: "BigNumber",
      hex: "0x02b24068",
    },
    shortPoolAmount: {
      type: "BigNumber",
      hex: "0x06102f5c1c",
    },
    maxLongPoolAmount: {
      type: "BigNumber",
      hex: "0x033b2e3c9fd0803ce8000000",
    },
    maxShortPoolAmount: {
      type: "BigNumber",
      hex: "0x033b2e3c9fd0803ce8000000",
    },
    longPoolAmountAdjustment: {
      type: "BigNumber",
      hex: "0x00",
    },
    shortPoolAmountAdjustment: {
      type: "BigNumber",
      hex: "0x00",
    },
    poolValueMin: {
      type: "BigNumber",
      hex: "0x0756183d9182a41c17e70e0d050c2e",
    },
    poolValueMax: {
      type: "BigNumber",
      hex: "0x07562219e455012cdbbe016d250c2e",
    },
    reserveFactorLong: {
      type: "BigNumber",
      hex: "0x0b5c0e8d21d902d61fa0000000",
    },
    reserveFactorShort: {
      type: "BigNumber",
      hex: "0x0b5c0e8d21d902d61fa0000000",
    },
    openInterestReserveFactorLong: {
      type: "BigNumber",
      hex: "0x0a18f07d736b90be5500000000",
    },
    openInterestReserveFactorShort: {
      type: "BigNumber",
      hex: "0x0a18f07d736b90be5500000000",
    },
    totalBorrowingFees: {
      type: "BigNumber",
      hex: "0x2adc767eea32cd45c3bd39ca32",
    },
    positionImpactPoolAmount: {
      type: "BigNumber",
      hex: "0x0197ea",
    },
    swapImpactPoolAmountLong: {
      type: "BigNumber",
      hex: "0x49",
    },
    swapImpactPoolAmountShort: {
      type: "BigNumber",
      hex: "0x04b76bc737",
    },
    borrowingFactorLong: {
      type: "BigNumber",
      hex: "0x0152d02c7e14af680000",
    },
    borrowingFactorShort: {
      type: "BigNumber",
      hex: "0x0152d02c7e14af680000",
    },
    borrowingExponentFactorLong: {
      type: "BigNumber",
      hex: "0x0c9f2c9cd04674edea40000000",
    },
    borrowingExponentFactorShort: {
      type: "BigNumber",
      hex: "0x0c9f2c9cd04674edea40000000",
    },
    fundingFactor: {
      type: "BigNumber",
      hex: "0x043c33c1937564800000",
    },
    fundingExponentFactor: {
      type: "BigNumber",
      hex: "0x0c9f2c9cd04674edea40000000",
    },
    pnlLongMax: {
      type: "BigNumber",
      hex: "-0x0124f0436c81ae646eba34c00000",
    },
    pnlLongMin: {
      type: "BigNumber",
      hex: "-0x0124f0436c81ae646eba34c00000",
    },
    pnlShortMax: {
      type: "BigNumber",
      hex: "-0x04fb36ab0d2e7114ad5bc1b00000",
    },
    pnlShortMin: {
      type: "BigNumber",
      hex: "-0x04fb36ab0d2e7114ad5bc1b00000",
    },
    netPnlMax: {
      type: "BigNumber",
      hex: "-0x062026ee79b01f791c15f6700000",
    },
    netPnlMin: {
      type: "BigNumber",
      hex: "-0x062026ee79b01f791c15f6700000",
    },
    maxPnlFactorForTradersLong: {
      type: "BigNumber",
      hex: "0x0a18f07d736b90be5500000000",
    },
    maxPnlFactorForTradersShort: {
      type: "BigNumber",
      hex: "0x0a18f07d736b90be5500000000",
    },
    minCollateralFactor: {
      type: "BigNumber",
      hex: "0x204fce5e3e25026110000000",
    },
    minCollateralFactorForOpenInterestLong: {
      type: "BigNumber",
      hex: "0x00",
    },
    minCollateralFactorForOpenInterestShort: {
      type: "BigNumber",
      hex: "0x00",
    },
    claimableFundingAmountLong: {
      type: "BigNumber",
      hex: "0x00",
    },
    claimableFundingAmountShort: {
      type: "BigNumber",
      hex: "0x0bbc20",
    },
    positionFeeFactorForPositiveImpact: {
      type: "BigNumber",
      hex: "0x019d971e4fe8401e74000000",
    },
    positionFeeFactorForNegativeImpact: {
      type: "BigNumber",
      hex: "0x024306c4097859c43c000000",
    },
    positionImpactFactorPositive: {
      type: "BigNumber",
      hex: "0x0a968163f0a57b400000",
    },
    positionImpactFactorNegative: {
      type: "BigNumber",
      hex: "0x152d02c7e14af6800000",
    },
    maxPositionImpactFactorPositive: {
      type: "BigNumber",
      hex: "0x204fce5e3e25026110000000",
    },
    maxPositionImpactFactorNegative: {
      type: "BigNumber",
      hex: "0x204fce5e3e25026110000000",
    },
    maxPositionImpactFactorForLiquidations: {
      type: "BigNumber",
      hex: "0x204fce5e3e25026110000000",
    },
    positionImpactExponentFactor: {
      type: "BigNumber",
      hex: "0x193e5939a08ce9dbd480000000",
    },
    swapFeeFactorForPositiveImpact: {
      type: "BigNumber",
      hex: "0x019d971e4fe8401e74000000",
    },
    swapFeeFactorForNegativeImpact: {
      type: "BigNumber",
      hex: "0x024306c4097859c43c000000",
    },
    swapImpactFactorPositive: {
      type: "BigNumber",
      hex: "0x0422ca8b0a00a425000000",
    },
    swapImpactFactorNegative: {
      type: "BigNumber",
      hex: "0x084595161401484a000000",
    },
    swapImpactExponentFactor: {
      type: "BigNumber",
      hex: "0x193e5939a08ce9dbd480000000",
    },
    borrowingFactorPerSecondForLongs: {
      type: "BigNumber",
      hex: "0x00",
    },
    borrowingFactorPerSecondForShorts: {
      type: "BigNumber",
      hex: "0x3a06759dd7f012b91a",
    },
    fundingFactorPerSecond: {
      type: "BigNumber",
      hex: "0xecb26eec42fc7658e0",
    },
    longsPayShorts: false,
    virtualPoolAmountForLongToken: {
      type: "BigNumber",
      hex: "0x02b24068",
    },
    virtualPoolAmountForShortToken: {
      type: "BigNumber",
      hex: "0x06102f5c1c",
    },
    virtualInventoryForPositions: {
      type: "BigNumber",
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
        type: "BigNumber",
        hex: "0x0516af396904d1b6510b3ce0000000",
      },
      maxPrice: {
        type: "BigNumber",
        hex: "0x0516af396904d1b6510b3ce0000000",
      },
    },
    balance: {
      type: "BigNumber",
      hex: "0x04b571c0",
    },
  },
  swapPath: ["0x339eF6aAcF8F4B2AD15BdcECBEED1842Ec4dBcBf"],
  initialCollateralTokenAddress: "0xCcF73F4Dcbbb573296BFA656b754Fe94BB957d62",
  initialCollateralToken: {
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
        type: "BigNumber",
        hex: "0x0516af396904d1b6510b3ce0000000",
      },
      maxPrice: {
        type: "BigNumber",
        hex: "0x0516af396904d1b6510b3ce0000000",
      },
    },
    balance: {
      type: "BigNumber",
      hex: "0x04b571c0",
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
        type: "BigNumber",
        hex: "0x0c9f2c9cd04674edea40000000",
      },
      maxPrice: {
        type: "BigNumber",
        hex: "0x0c9f456d8f88b0f1c31e000000",
      },
    },
    balance: {
      type: "BigNumber",
      hex: "0x03312adc93",
    },
  },
  initialCollateralDeltaAmount: {
    type: "BigNumber",
    hex: "0x0f4240",
  },
  sizeDeltaUsd: {
    type: "BigNumber",
    hex: "0xb82beb3e1d7ddda8e3d6f3400000",
  },
  triggerPrice: {
    type: "BigNumber",
    hex: "0x00",
  },
  acceptablePrice: {
    type: "BigNumber",
    hex: "0x04f8c47b7d14785de1d2f9796d9d00",
  },
  minOutputAmount: {
    type: "BigNumber",
    hex: "0x00",
  },
  orderType: 2,
  orderKey: "0xf8e636c761363279c51f48a5d584964c4b1ce1a4003c8baa03f0dacef7e1f651",
  isLong: true,
  reason: null,
  transaction: {
    timestamp: 1694168065,
    hash: "0xde5c5f634b81dd10eb96a2cc1b08a9d15d09a35a8d07f8252498855b68b4f3df",
    __typename: "Transaction",
  },
});

export const withdraw1Usd = prepare({
  id: "0x99776b15021a80a63b477ae7ebbdeabc472354c415a49b89137d8a27bbc48bb5:2",
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
          type: "BigNumber",
          hex: "0x0515d0732f350f4127a40990000000",
        },
        maxPrice: {
          type: "BigNumber",
          hex: "0x0515d0732f350f4127a40990000000",
        },
      },
      balance: {
        type: "BigNumber",
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
          type: "BigNumber",
          hex: "0x0c9f2c9cd04674edea40000000",
        },
        maxPrice: {
          type: "BigNumber",
          hex: "0x0c9f456d8f88b0f1c31e000000",
        },
      },
      balance: {
        type: "BigNumber",
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
          type: "BigNumber",
          hex: "0x0515d0732f350f4127a40990000000",
        },
        maxPrice: {
          type: "BigNumber",
          hex: "0x0515d0732f350f4127a40990000000",
        },
      },
      balance: {
        type: "BigNumber",
        hex: "0x04b571c0",
      },
    },
    longInterestUsd: {
      type: "BigNumber",
      hex: "0x8d151dda39e2f3d6ca7318000000",
    },
    shortInterestUsd: {
      type: "BigNumber",
      hex: "0xdbe32f323e0c4c6831d2dc900000",
    },
    longInterestInTokens: {
      type: "BigNumber",
      hex: "0xa3ea16",
    },
    shortInterestInTokens: {
      type: "BigNumber",
      hex: "0x0107657e",
    },
    longPoolAmount: {
      type: "BigNumber",
      hex: "0x02b24068",
    },
    shortPoolAmount: {
      type: "BigNumber",
      hex: "0x06102f5c1c",
    },
    maxLongPoolAmount: {
      type: "BigNumber",
      hex: "0x033b2e3c9fd0803ce8000000",
    },
    maxShortPoolAmount: {
      type: "BigNumber",
      hex: "0x033b2e3c9fd0803ce8000000",
    },
    longPoolAmountAdjustment: {
      type: "BigNumber",
      hex: "0x00",
    },
    shortPoolAmountAdjustment: {
      type: "BigNumber",
      hex: "0x00",
    },
    poolValueMin: {
      type: "BigNumber",
      hex: "0x0755a5289305f59bb14033003391fe",
    },
    poolValueMax: {
      type: "BigNumber",
      hex: "0x0755af04e5d852ac751726605391fe",
    },
    reserveFactorLong: {
      type: "BigNumber",
      hex: "0x0b5c0e8d21d902d61fa0000000",
    },
    reserveFactorShort: {
      type: "BigNumber",
      hex: "0x0b5c0e8d21d902d61fa0000000",
    },
    openInterestReserveFactorLong: {
      type: "BigNumber",
      hex: "0x0a18f07d736b90be5500000000",
    },
    openInterestReserveFactorShort: {
      type: "BigNumber",
      hex: "0x0a18f07d736b90be5500000000",
    },
    totalBorrowingFees: {
      type: "BigNumber",
      hex: "0x2ad61f91d4709979147d61187f",
    },
    positionImpactPoolAmount: {
      type: "BigNumber",
      hex: "0x0197ea",
    },
    swapImpactPoolAmountLong: {
      type: "BigNumber",
      hex: "0x49",
    },
    swapImpactPoolAmountShort: {
      type: "BigNumber",
      hex: "0x04b76bc737",
    },
    borrowingFactorLong: {
      type: "BigNumber",
      hex: "0x0152d02c7e14af680000",
    },
    borrowingFactorShort: {
      type: "BigNumber",
      hex: "0x0152d02c7e14af680000",
    },
    borrowingExponentFactorLong: {
      type: "BigNumber",
      hex: "0x0c9f2c9cd04674edea40000000",
    },
    borrowingExponentFactorShort: {
      type: "BigNumber",
      hex: "0x0c9f2c9cd04674edea40000000",
    },
    fundingFactor: {
      type: "BigNumber",
      hex: "0x043c33c1937564800000",
    },
    fundingExponentFactor: {
      type: "BigNumber",
      hex: "0x0c9f2c9cd04674edea40000000",
    },
    pnlLongMax: {
      type: "BigNumber",
      hex: "-0x013cde9e2ecc08d9367d19a00000",
    },
    pnlLongMin: {
      type: "BigNumber",
      hex: "-0x013cde9e2ecc08d9367d19a00000",
    },
    pnlShortMax: {
      type: "BigNumber",
      hex: "-0x04d4c2239c3e66717d1484500000",
    },
    pnlShortMin: {
      type: "BigNumber",
      hex: "-0x04d4c2239c3e66717d1484500000",
    },
    netPnlMax: {
      type: "BigNumber",
      hex: "-0x0611a0c1cb0a6f4ab3919df00000",
    },
    netPnlMin: {
      type: "BigNumber",
      hex: "-0x0611a0c1cb0a6f4ab3919df00000",
    },
    maxPnlFactorForTradersLong: {
      type: "BigNumber",
      hex: "0x0a18f07d736b90be5500000000",
    },
    maxPnlFactorForTradersShort: {
      type: "BigNumber",
      hex: "0x0a18f07d736b90be5500000000",
    },
    minCollateralFactor: {
      type: "BigNumber",
      hex: "0x204fce5e3e25026110000000",
    },
    minCollateralFactorForOpenInterestLong: {
      type: "BigNumber",
      hex: "0x00",
    },
    minCollateralFactorForOpenInterestShort: {
      type: "BigNumber",
      hex: "0x00",
    },
    claimableFundingAmountLong: {
      type: "BigNumber",
      hex: "0x00",
    },
    claimableFundingAmountShort: {
      type: "BigNumber",
      hex: "0x0bbc20",
    },
    positionFeeFactorForPositiveImpact: {
      type: "BigNumber",
      hex: "0x019d971e4fe8401e74000000",
    },
    positionFeeFactorForNegativeImpact: {
      type: "BigNumber",
      hex: "0x024306c4097859c43c000000",
    },
    positionImpactFactorPositive: {
      type: "BigNumber",
      hex: "0x0a968163f0a57b400000",
    },
    positionImpactFactorNegative: {
      type: "BigNumber",
      hex: "0x152d02c7e14af6800000",
    },
    maxPositionImpactFactorPositive: {
      type: "BigNumber",
      hex: "0x204fce5e3e25026110000000",
    },
    maxPositionImpactFactorNegative: {
      type: "BigNumber",
      hex: "0x204fce5e3e25026110000000",
    },
    maxPositionImpactFactorForLiquidations: {
      type: "BigNumber",
      hex: "0x204fce5e3e25026110000000",
    },
    positionImpactExponentFactor: {
      type: "BigNumber",
      hex: "0x193e5939a08ce9dbd480000000",
    },
    swapFeeFactorForPositiveImpact: {
      type: "BigNumber",
      hex: "0x019d971e4fe8401e74000000",
    },
    swapFeeFactorForNegativeImpact: {
      type: "BigNumber",
      hex: "0x024306c4097859c43c000000",
    },
    swapImpactFactorPositive: {
      type: "BigNumber",
      hex: "0x0422ca8b0a00a425000000",
    },
    swapImpactFactorNegative: {
      type: "BigNumber",
      hex: "0x084595161401484a000000",
    },
    swapImpactExponentFactor: {
      type: "BigNumber",
      hex: "0x193e5939a08ce9dbd480000000",
    },
    borrowingFactorPerSecondForLongs: {
      type: "BigNumber",
      hex: "0x00",
    },
    borrowingFactorPerSecondForShorts: {
      type: "BigNumber",
      hex: "0x3a06759dd7f012b91a",
    },
    fundingFactorPerSecond: {
      type: "BigNumber",
      hex: "0xecb26eec42fc7658e0",
    },
    longsPayShorts: false,
    virtualPoolAmountForLongToken: {
      type: "BigNumber",
      hex: "0x02b24068",
    },
    virtualPoolAmountForShortToken: {
      type: "BigNumber",
      hex: "0x06102f5c1c",
    },
    virtualInventoryForPositions: {
      type: "BigNumber",
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
        type: "BigNumber",
        hex: "0x0515d0732f350f4127a40990000000",
      },
      maxPrice: {
        type: "BigNumber",
        hex: "0x0515d0732f350f4127a40990000000",
      },
    },
    balance: {
      type: "BigNumber",
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
        type: "BigNumber",
        hex: "0x0c9f2c9cd04674edea40000000",
      },
      maxPrice: {
        type: "BigNumber",
        hex: "0x0c9f456d8f88b0f1c31e000000",
      },
    },
    balance: {
      type: "BigNumber",
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
        type: "BigNumber",
        hex: "0x0c9f2c9cd04674edea40000000",
      },
      maxPrice: {
        type: "BigNumber",
        hex: "0x0c9f456d8f88b0f1c31e000000",
      },
    },
    balance: {
      type: "BigNumber",
      hex: "0x03312adc93",
    },
  },
  initialCollateralDeltaAmount: {
    type: "BigNumber",
    hex: "0x0f4240",
  },
  sizeDeltaUsd: {
    type: "BigNumber",
    hex: "0x00",
  },
  triggerPrice: {
    type: "BigNumber",
    hex: "0x00",
  },
  acceptablePrice: {
    type: "BigNumber",
    hex: "0x05053c5e0696d43545b589da000000",
  },
  minOutputAmount: {
    type: "BigNumber",
    hex: "0x0c957b121a67036d3388000000",
  },
  orderType: 4,
  orderKey: "0x0e3ec97a0bcaf2ac18f02d24804e7ee90bead927c9cf5ab9f86fe1f73d4396fb",
  isLong: false,
  reason: null,
  transaction: {
    timestamp: 1694590697,
    hash: "0x99776b15021a80a63b477ae7ebbdeabc472354c415a49b89137d8a27bbc48bb5",
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
          type: "BigNumber",
          hex: "0x0516893b936002a4cd3f1d10000000",
        },
        maxPrice: {
          type: "BigNumber",
          hex: "0x0516893b936002a4cd3f1d10000000",
        },
      },
      balance: {
        type: "BigNumber",
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
          type: "BigNumber",
          hex: "0x0c9f2c9cd04674edea40000000",
        },
        maxPrice: {
          type: "BigNumber",
          hex: "0x0c9f456d8f88b0f1c31e000000",
        },
      },
      balance: {
        type: "BigNumber",
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
          type: "BigNumber",
          hex: "0x0516893b936002a4cd3f1d10000000",
        },
        maxPrice: {
          type: "BigNumber",
          hex: "0x0516893b936002a4cd3f1d10000000",
        },
      },
      balance: {
        type: "BigNumber",
        hex: "0x04b571c0",
      },
    },
    longInterestUsd: {
      type: "BigNumber",
      hex: "0x8d151dda39e2f3d6ca7318000000",
    },
    shortInterestUsd: {
      type: "BigNumber",
      hex: "0xdbe32f323e0c4c6831d2dc900000",
    },
    longInterestInTokens: {
      type: "BigNumber",
      hex: "0xa3ea16",
    },
    shortInterestInTokens: {
      type: "BigNumber",
      hex: "0x0107657e",
    },
    longPoolAmount: {
      type: "BigNumber",
      hex: "0x02b24068",
    },
    shortPoolAmount: {
      type: "BigNumber",
      hex: "0x06102f5c1c",
    },
    maxLongPoolAmount: {
      type: "BigNumber",
      hex: "0x033b2e3c9fd0803ce8000000",
    },
    maxShortPoolAmount: {
      type: "BigNumber",
      hex: "0x033b2e3c9fd0803ce8000000",
    },
    longPoolAmountAdjustment: {
      type: "BigNumber",
      hex: "0x00",
    },
    shortPoolAmountAdjustment: {
      type: "BigNumber",
      hex: "0x00",
    },
    poolValueMin: {
      type: "BigNumber",
      hex: "0x075604a051118873263d1c8933c137",
    },
    poolValueMax: {
      type: "BigNumber",
      hex: "0x07560e7ca3e3e583ea140fe953c137",
    },
    reserveFactorLong: {
      type: "BigNumber",
      hex: "0x0b5c0e8d21d902d61fa0000000",
    },
    reserveFactorShort: {
      type: "BigNumber",
      hex: "0x0b5c0e8d21d902d61fa0000000",
    },
    openInterestReserveFactorLong: {
      type: "BigNumber",
      hex: "0x0a18f07d736b90be5500000000",
    },
    openInterestReserveFactorShort: {
      type: "BigNumber",
      hex: "0x0a18f07d736b90be5500000000",
    },
    totalBorrowingFees: {
      type: "BigNumber",
      hex: "0x2ae01a651ad1a71f94202c9027",
    },
    positionImpactPoolAmount: {
      type: "BigNumber",
      hex: "0x0197ea",
    },
    swapImpactPoolAmountLong: {
      type: "BigNumber",
      hex: "0x49",
    },
    swapImpactPoolAmountShort: {
      type: "BigNumber",
      hex: "0x04b76bc737",
    },
    borrowingFactorLong: {
      type: "BigNumber",
      hex: "0x0152d02c7e14af680000",
    },
    borrowingFactorShort: {
      type: "BigNumber",
      hex: "0x0152d02c7e14af680000",
    },
    borrowingExponentFactorLong: {
      type: "BigNumber",
      hex: "0x0c9f2c9cd04674edea40000000",
    },
    borrowingExponentFactorShort: {
      type: "BigNumber",
      hex: "0x0c9f2c9cd04674edea40000000",
    },
    fundingFactor: {
      type: "BigNumber",
      hex: "0x043c33c1937564800000",
    },
    fundingExponentFactor: {
      type: "BigNumber",
      hex: "0x0c9f2c9cd04674edea40000000",
    },
    pnlLongMax: {
      type: "BigNumber",
      hex: "-0x0129050a86888f42898acca00000",
    },
    pnlLongMin: {
      type: "BigNumber",
      hex: "-0x0129050a86888f42898acca00000",
    },
    pnlShortMax: {
      type: "BigNumber",
      hex: "-0x04f4a7ccaa4afb166f9abd500000",
    },
    pnlShortMin: {
      type: "BigNumber",
      hex: "-0x04f4a7ccaa4afb166f9abd500000",
    },
    netPnlMax: {
      type: "BigNumber",
      hex: "-0x061dacd730d38a58f92589f00000",
    },
    netPnlMin: {
      type: "BigNumber",
      hex: "-0x061dacd730d38a58f92589f00000",
    },
    maxPnlFactorForTradersLong: {
      type: "BigNumber",
      hex: "0x0a18f07d736b90be5500000000",
    },
    maxPnlFactorForTradersShort: {
      type: "BigNumber",
      hex: "0x0a18f07d736b90be5500000000",
    },
    minCollateralFactor: {
      type: "BigNumber",
      hex: "0x204fce5e3e25026110000000",
    },
    minCollateralFactorForOpenInterestLong: {
      type: "BigNumber",
      hex: "0x00",
    },
    minCollateralFactorForOpenInterestShort: {
      type: "BigNumber",
      hex: "0x00",
    },
    claimableFundingAmountLong: {
      type: "BigNumber",
      hex: "0x00",
    },
    claimableFundingAmountShort: {
      type: "BigNumber",
      hex: "0x0bbc20",
    },
    positionFeeFactorForPositiveImpact: {
      type: "BigNumber",
      hex: "0x019d971e4fe8401e74000000",
    },
    positionFeeFactorForNegativeImpact: {
      type: "BigNumber",
      hex: "0x024306c4097859c43c000000",
    },
    positionImpactFactorPositive: {
      type: "BigNumber",
      hex: "0x0a968163f0a57b400000",
    },
    positionImpactFactorNegative: {
      type: "BigNumber",
      hex: "0x152d02c7e14af6800000",
    },
    maxPositionImpactFactorPositive: {
      type: "BigNumber",
      hex: "0x204fce5e3e25026110000000",
    },
    maxPositionImpactFactorNegative: {
      type: "BigNumber",
      hex: "0x204fce5e3e25026110000000",
    },
    maxPositionImpactFactorForLiquidations: {
      type: "BigNumber",
      hex: "0x204fce5e3e25026110000000",
    },
    positionImpactExponentFactor: {
      type: "BigNumber",
      hex: "0x193e5939a08ce9dbd480000000",
    },
    swapFeeFactorForPositiveImpact: {
      type: "BigNumber",
      hex: "0x019d971e4fe8401e74000000",
    },
    swapFeeFactorForNegativeImpact: {
      type: "BigNumber",
      hex: "0x024306c4097859c43c000000",
    },
    swapImpactFactorPositive: {
      type: "BigNumber",
      hex: "0x0422ca8b0a00a425000000",
    },
    swapImpactFactorNegative: {
      type: "BigNumber",
      hex: "0x084595161401484a000000",
    },
    swapImpactExponentFactor: {
      type: "BigNumber",
      hex: "0x193e5939a08ce9dbd480000000",
    },
    borrowingFactorPerSecondForLongs: {
      type: "BigNumber",
      hex: "0x00",
    },
    borrowingFactorPerSecondForShorts: {
      type: "BigNumber",
      hex: "0x3a06759dd7f012b91a",
    },
    fundingFactorPerSecond: {
      type: "BigNumber",
      hex: "0xecb26eec42fc7658e0",
    },
    longsPayShorts: false,
    virtualPoolAmountForLongToken: {
      type: "BigNumber",
      hex: "0x02b24068",
    },
    virtualPoolAmountForShortToken: {
      type: "BigNumber",
      hex: "0x06102f5c1c",
    },
    virtualInventoryForPositions: {
      type: "BigNumber",
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
        type: "BigNumber",
        hex: "0x0516893b936002a4cd3f1d10000000",
      },
      maxPrice: {
        type: "BigNumber",
        hex: "0x0516893b936002a4cd3f1d10000000",
      },
    },
    balance: {
      type: "BigNumber",
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
        type: "BigNumber",
        hex: "0x0c9f2c9cd04674edea40000000",
      },
      maxPrice: {
        type: "BigNumber",
        hex: "0x0c9f456d8f88b0f1c31e000000",
      },
    },
    balance: {
      type: "BigNumber",
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
        type: "BigNumber",
        hex: "0x0c9f2c9cd04674edea40000000",
      },
      maxPrice: {
        type: "BigNumber",
        hex: "0x0c9f456d8f88b0f1c31e000000",
      },
    },
    balance: {
      type: "BigNumber",
      hex: "0x03312adc93",
    },
  },
  initialCollateralDeltaAmount: {
    type: "BigNumber",
    hex: "0x019632cc",
  },
  sizeDeltaUsd: {
    type: "BigNumber",
    hex: "0x0d204b867ae0cad26c1ef0000000",
  },
  triggerPrice: {
    type: "BigNumber",
    hex: "0x05c71d3c089740a6a8ab2c00000000",
  },
  acceptablePrice: {
    type: "BigNumber",
    hex: "0x05b852b3c0d32e15a1dca900000000",
  },
  minOutputAmount: {
    type: "BigNumber",
    hex: "0x00",
  },
  orderType: 5,
  orderKey: "0x2cb19912edeb90ae392a715ca4770a8510e7bc05418a3d16c4cbda3fb4438acf",
  isLong: true,
  reason: null,
  transaction: {
    timestamp: 1694770176,
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
          type: "BigNumber",
          hex: "0x4fffe06fdbae5caf74e5d8000000",
        },
        maxPrice: {
          type: "BigNumber",
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
          type: "BigNumber",
          hex: "0x0c9f2c9cd04674edea40000000",
        },
        maxPrice: {
          type: "BigNumber",
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
          type: "BigNumber",
          hex: "0x4fffe06fdbae5caf74e5d8000000",
        },
        maxPrice: {
          type: "BigNumber",
          hex: "0x4fffe06fdbae5caf74e5d8000000",
        },
      },
    },
    longInterestUsd: {
      type: "BigNumber",
      hex: "0x01af50ec949321a889571b153c0000",
    },
    shortInterestUsd: {
      type: "BigNumber",
      hex: "0x77a266f7371cc95bf30190200000",
    },
    longInterestInTokens: {
      type: "BigNumber",
      hex: "0x44cf820531daea33",
    },
    shortInterestInTokens: {
      type: "BigNumber",
      hex: "0x13a39f8e7b584ed3",
    },
    longPoolAmount: {
      type: "BigNumber",
      hex: "0xcdf8585f19fbef21",
    },
    shortPoolAmount: {
      type: "BigNumber",
      hex: "0xa92af2a9",
    },
    maxLongPoolAmount: {
      type: "BigNumber",
      hex: "0x033b2e3c9fd0803ce8000000",
    },
    maxShortPoolAmount: {
      type: "BigNumber",
      hex: "0x033b2e3c9fd0803ce8000000",
    },
    longPoolAmountAdjustment: {
      type: "BigNumber",
      hex: "0x00",
    },
    shortPoolAmountAdjustment: {
      type: "BigNumber",
      hex: "0x00",
    },
    poolValueMin: {
      type: "BigNumber",
      hex: "0x054c4c094100f0e6f4710d1d4be8fd",
    },
    poolValueMax: {
      type: "BigNumber",
      hex: "0x054c4d1c5f3bf1b60002522bc3e8fd",
    },
    reserveFactorLong: {
      type: "BigNumber",
      hex: "0x0b5c0e8d21d902d61fa0000000",
    },
    reserveFactorShort: {
      type: "BigNumber",
      hex: "0x0b5c0e8d21d902d61fa0000000",
    },
    openInterestReserveFactorLong: {
      type: "BigNumber",
      hex: "0x0a18f07d736b90be5500000000",
    },
    openInterestReserveFactorShort: {
      type: "BigNumber",
      hex: "0x0a18f07d736b90be5500000000",
    },
    totalBorrowingFees: {
      type: "BigNumber",
      hex: "0x02a1527b2029038ab8110a2a1b9b",
    },
    positionImpactPoolAmount: {
      type: "BigNumber",
      hex: "0x25cf2e00e8141c",
    },
    swapImpactPoolAmountLong: {
      type: "BigNumber",
      hex: "0xa7dac58934ecfca5",
    },
    swapImpactPoolAmountShort: {
      type: "BigNumber",
      hex: "0x08f62c",
    },
    borrowingFactorLong: {
      type: "BigNumber",
      hex: "0x0152d02c7e14af680000",
    },
    borrowingFactorShort: {
      type: "BigNumber",
      hex: "0x0152d02c7e14af680000",
    },
    borrowingExponentFactorLong: {
      type: "BigNumber",
      hex: "0x0c9f2c9cd04674edea40000000",
    },
    borrowingExponentFactorShort: {
      type: "BigNumber",
      hex: "0x0c9f2c9cd04674edea40000000",
    },
    fundingFactor: {
      type: "BigNumber",
      hex: "0x043c33c1937564800000",
    },
    fundingExponentFactor: {
      type: "BigNumber",
      hex: "0x0c9f2c9cd04674edea40000000",
    },
    pnlLongMax: {
      type: "BigNumber",
      hex: "-0x22a70bd0cc2ed790633ce7fcae00",
    },
    pnlLongMin: {
      type: "BigNumber",
      hex: "-0x22a70bd0cc2ed790633ce7fcae00",
    },
    pnlShortMax: {
      type: "BigNumber",
      hex: "0x066c4d4124589682210623a8ee00",
    },
    pnlShortMin: {
      type: "BigNumber",
      hex: "0x066c4d4124589682210623a8ee00",
    },
    netPnlMax: {
      type: "BigNumber",
      hex: "-0x1c3abe8fa7d6410e4236c453c000",
    },
    netPnlMin: {
      type: "BigNumber",
      hex: "-0x1c3abe8fa7d6410e4236c453c000",
    },
    maxPnlFactorForTradersLong: {
      type: "BigNumber",
      hex: "0x0a18f07d736b90be5500000000",
    },
    maxPnlFactorForTradersShort: {
      type: "BigNumber",
      hex: "0x0a18f07d736b90be5500000000",
    },
    minCollateralFactor: {
      type: "BigNumber",
      hex: "0x204fce5e3e25026110000000",
    },
    minCollateralFactorForOpenInterestLong: {
      type: "BigNumber",
      hex: "0x00",
    },
    minCollateralFactorForOpenInterestShort: {
      type: "BigNumber",
      hex: "0x00",
    },
    claimableFundingAmountLong: {
      type: "BigNumber",
      hex: "0x00",
    },
    claimableFundingAmountShort: {
      type: "BigNumber",
      hex: "0x00",
    },
    positionFeeFactorForPositiveImpact: {
      type: "BigNumber",
      hex: "0x019d971e4fe8401e74000000",
    },
    positionFeeFactorForNegativeImpact: {
      type: "BigNumber",
      hex: "0x024306c4097859c43c000000",
    },
    positionImpactFactorPositive: {
      type: "BigNumber",
      hex: "0x0a968163f0a57b400000",
    },
    positionImpactFactorNegative: {
      type: "BigNumber",
      hex: "0x152d02c7e14af6800000",
    },
    maxPositionImpactFactorPositive: {
      type: "BigNumber",
      hex: "0x204fce5e3e25026110000000",
    },
    maxPositionImpactFactorNegative: {
      type: "BigNumber",
      hex: "0x204fce5e3e25026110000000",
    },
    maxPositionImpactFactorForLiquidations: {
      type: "BigNumber",
      hex: "0x204fce5e3e25026110000000",
    },
    positionImpactExponentFactor: {
      type: "BigNumber",
      hex: "0x193e5939a08ce9dbd480000000",
    },
    swapFeeFactorForPositiveImpact: {
      type: "BigNumber",
      hex: "0x019d971e4fe8401e74000000",
    },
    swapFeeFactorForNegativeImpact: {
      type: "BigNumber",
      hex: "0x024306c4097859c43c000000",
    },
    swapImpactFactorPositive: {
      type: "BigNumber",
      hex: "0x0422ca8b0a00a425000000",
    },
    swapImpactFactorNegative: {
      type: "BigNumber",
      hex: "0x084595161401484a000000",
    },
    swapImpactExponentFactor: {
      type: "BigNumber",
      hex: "0x193e5939a08ce9dbd480000000",
    },
    borrowingFactorPerSecondForLongs: {
      type: "BigNumber",
      hex: "0x7130db903ec145a31e",
    },
    borrowingFactorPerSecondForShorts: {
      type: "BigNumber",
      hex: "0x00",
    },
    fundingFactorPerSecond: {
      type: "BigNumber",
      hex: "0x026559d766a55b1c18d8",
    },
    longsPayShorts: true,
    virtualPoolAmountForLongToken: {
      type: "BigNumber",
      hex: "0xdbb0e89f08c9cc6e",
    },
    virtualPoolAmountForShortToken: {
      type: "BigNumber",
      hex: "0x011f58e15d00a69966",
    },
    virtualInventoryForPositions: {
      type: "BigNumber",
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
        type: "BigNumber",
        hex: "0x4fffe06fdbae5caf74e5d8000000",
      },
      maxPrice: {
        type: "BigNumber",
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
        type: "BigNumber",
        hex: "0x4fffe06fdbae5caf74e5d8000000",
      },
      maxPrice: {
        type: "BigNumber",
        hex: "0x4fffe06fdbae5caf74e5d8000000",
      },
    },
    balance: {
      type: "BigNumber",
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
        type: "BigNumber",
        hex: "0x0c9f2c9cd04674edea40000000",
      },
      maxPrice: {
        type: "BigNumber",
        hex: "0x0c9f456d8f88b0f1c31e000000",
      },
    },
    balance: {
      type: "BigNumber",
      hex: "0x03312adc93",
    },
  },
  initialCollateralDeltaAmount: {
    type: "BigNumber",
    hex: "0x2386f26fc10000",
  },
  sizeDeltaUsd: {
    type: "BigNumber",
    hex: "0x33ef189b49394e91a0c5600000",
  },
  triggerPrice: {
    type: "BigNumber",
    hex: "0x5055eb5a180a0bd64ac3c0000000",
  },
  acceptablePrice: {
    type: "BigNumber",
    hex: "0x5123941afeadfc986f5a30000000",
  },
  minOutputAmount: {
    type: "BigNumber",
    hex: "0x00",
  },
  orderType: 3,
  orderKey: "0x17dc6ec45b31e95185dbe2bf5dccf21eb4c05f731fd2b0d48947f8173959132f",
  isLong: true,
  reason: "USER_INITIATED_CANCEL",
  transaction: {
    timestamp: 1694770633,
    hash: "0xe9444461179ef70b01b080c5fb6e044c3acb01696a1cf7f2e6445363a453aba4",
    __typename: "Transaction",
  },
});
