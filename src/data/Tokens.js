import { ethers } from 'ethers'
import { getContract } from '../Addresses'

const TOKENS = {
  56: [
    {
      name: "Bitcoin (BTCB)",
      symbol: "BTC",
      decimals: 18,
      address: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
      coingeckoUrl: "https://www.coingecko.com/en/coins/binance-bitcoin",
      imageUrl: "https://assets.coingecko.com/coins/images/14108/small/Binance-bitcoin.png"
    },
    {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
      address: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8",
      coingeckoUrl: "https://www.coingecko.com/en/coins/ethereum",
      imageUrl: "https://assets.coingecko.com/coins/images/279/small/ethereum.png"
    },
    {
      name: "Binance Coin",
      symbol: "BNB",
      decimals: 18,
      address: ethers.constants.AddressZero,
      coingeckoUrl: "https://www.coingecko.com/en/coins/binance-coin",
      imageUrl: "https://assets.coingecko.com/coins/images/825/small/binance-coin-logo.png",
      isNative: true
    },
    {
      name: "Wrapped Binance Coin",
      symbol: "WBNB",
      decimals: 18,
      address: getContract(56, "NATIVE_TOKEN"),
      isWrapped: true,
      coingeckoUrl: "https://www.coingecko.com/en/coins/binance-coin",
      imageUrl: "https://assets.coingecko.com/coins/images/825/small/binance-coin-logo.png",
      baseSymbol: "BNB"
    },
    {
      name: "USD Gambit",
      symbol: "USDG",
      decimals: 18,
      address: getContract(56, "USDG"),
      isUsdg: true,
      coingeckoUrl: "https://www.coingecko.com/en/coins/usd-gambit",
      imageUrl: "https://assets.coingecko.com/coins/images/15886/small/usdg-02.png"
    },
    {
      name: "Binance USD",
      symbol: "BUSD",
      decimals: 18,
      address: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
      isStable: true,
      coingeckoUrl: "https://www.coingecko.com/en/coins/binance-usd",
      imageUrl: "https://assets.coingecko.com/coins/images/9576/small/BUSD.png"
    },
    {
      name: "USD Coin",
      symbol: "USDC",
      decimals: 18,
      address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
      isStable: true,
      coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
      imageUrl: "https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png"
    },
    {
      name: "Tether",
      symbol: "USDT",
      decimals: 18,
      address: "0x55d398326f99059fF775485246999027B3197955",
      isStable: true,
      coingeckoUrl: "https://www.coingecko.com/en/coins/tether",
      imageUrl: "https://assets.coingecko.com/coins/images/325/small/Tether-logo.png"
    }
  ],
  97: [
    {
      name: "Bitcoin (BTCB)",
      symbol: "BTC",
      decimals: 8,
      address: "0xb19C12715134bee7c4b1Ca593ee9E430dABe7b56",
    },
    {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
      address: "0x1958f7C067226c7C8Ac310Dc994D0cebAbfb2B02",
    },
    {
      name: "Binance Coin",
      symbol: "BNB",
      decimals: 18,
      address: ethers.constants.AddressZero,
      isNative: true
    },
    {
      name: "Wrapped Binance Coin",
      symbol: "WBNB",
      decimals: 18,
      address: "0x612777Eea37a44F7a95E3B101C39e1E2695fa6C2",
      isWrapped: true,
      baseSymbol: "BNB"
    },
    {
      name: "USD Gambit",
      symbol: "USDG",
      decimals: 18,
      address: getContract(97, "USDG"),
      isUsdg: true
    },
    {
      name: "Binance USD",
      symbol: "BUSD",
      decimals: 18,
      address: "0x3F223C4E5ac67099CB695834b20cCd5E5D5AA9Ef",
      isStable: true
    }
  ],
  421611: [
    {
      name: "Bitcoin (BTCB)",
      symbol: "BTC",
      decimals: 18,
      address: "0xab952e6801daB7920B65b8aC918FF0F66a8a0F44",
    },
    {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
      address: ethers.constants.AddressZero,
      isNative: true
    },
    // https://github.com/OffchainLabs/arbitrum/blob/950c2f91b2e951cd3764394e0a73eac3797aecf3/packages/arb-ts/src/lib/networks.ts#L65
    {
      name: "Wrapped Ethereum",
      symbol: "WETH",
      decimals: 18,
      address: "0xB47e6A5f8b33b3F17603C83a0535A9dcD7E32681",
      isWrapped: true,
      baseSymbol: "ETH"
    },
    {
      name: "USD Coin",
      symbol: "USDC",
      decimals: 18,
      address: "0xb93cb5F5c6a56e060A5e5A9691229D2a7e2D234A",
      isStable: true
    },
    {
      name: "Tether",
      symbol: "USDT",
      decimals: 18,
      address: "0xaB7ee1A7D5bc677e3A7ac694f2c156b3fFCaABC1",
      isStable: true
    }
  ],
  42161: [
    {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
      address: ethers.constants.AddressZero,
      isNative: true,
      isShortable: true
    },
    {
      name: "Wrapped Ethereum",
      symbol: "WETH",
      decimals: 18,
      address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
      isWrapped: true,
      baseSymbol: "ETH"
    },
    {
      name: "Wrapped Bitcoin",
      symbol: "BTC",
      decimals: 8,
      address: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
      isShortable: true
    },
    {
      name: "Chainlink",
      symbol: "LINK",
      decimals: 18,
      address: "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4",
      isStable: false
    },
    {
      name: "Uniswap",
      symbol: "UNI",
      decimals: 18,
      address: "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",
      isStable: false
    },
    {
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      address: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
      isStable: true
    },
    {
      name: "Tether",
      symbol: "USDT",
      decimals: 6,
      address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
      isStable: true
    },
    {
      name: "Magic Internet Money",
      symbol: "MIM",
      decimals: 18,
      address: "0xFEa7a6a0B346362BF88A9e4A88416B77a57D6c2A",
      isStable: true
    }
  ]
}

const CHAIN_IDS = [56, 97, 42161, 421611]

const TOKENS_MAP = {}
const TOKENS_BY_SYMBOL_MAP = {}

for (let j = 0; j < CHAIN_IDS.length; j++) {
  const chainId = CHAIN_IDS[j]
  TOKENS_MAP[chainId] = {}
  TOKENS_BY_SYMBOL_MAP[chainId] = {}
  for (let i = 0; i < TOKENS[chainId].length; i++) {
    const token = TOKENS[chainId][i]
    TOKENS_MAP[chainId][token.address] = token
    TOKENS_BY_SYMBOL_MAP[chainId][token.symbol] = token
  }
}

export function getTokens(chainId) {
  return TOKENS[chainId]
}

export function isValidToken(chainId, address) {
  if (!TOKENS_MAP[chainId]) {
    throw new Error(`Incorrect chainId ${chainId}`);
  }
  return address in TOKENS_MAP[chainId]
}

export function getToken(chainId, address) {
  if (!TOKENS_MAP[chainId]) {
    throw new Error(`Incorrect chainId ${chainId}`);
  }
  if (!TOKENS_MAP[chainId][address]) {
    throw new Error(`Incorrect address "${address}" for chainId ${chainId}`);
  }
  return TOKENS_MAP[chainId][address]
}

export function getTokenBySymbol(chainId, symbol) {
  const token = TOKENS_BY_SYMBOL_MAP[chainId][symbol];
  if (!token) {
    throw new Error(`Incorrect symbol "${symbol}" for chainId ${chainId}`);
  }
  return token;
}

export function getWhitelistedTokens(chainId) {
  return TOKENS[chainId].filter(token => token.symbol !== "USDG")
}
