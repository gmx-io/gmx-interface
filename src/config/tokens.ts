import { ethers } from "ethers";
import { getContract } from "./contracts";
import {
  ARBITRUM,
  ARBITRUM_TESTNET,
  AVALANCHE,
  AVALANCHE_FUJI,
  MAINNET,
  SEPOLIA_TESTNET,
  TESTNET,
  OPTIMISM_GOERLI_TESTNET,
  OPTIMISM_MAINNET,
  BLAST_SEPOLIA_TESTNET,
  MORPH_HOLESKY,
  OPBNB_TESTNET,
  MORPH_MAINNET,
} from "./chains";
import { Token } from "domain/tokens";

export const TOKENS: { [chainId: number]: Token[] } = {
  [MAINNET]: [
    {
      name: "Bitcoin (BTCB)",
      symbol: "BTC",
      decimals: 18,
      address: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
      coingeckoUrl: "https://www.coingecko.com/en/coins/binance-bitcoin",
      imageUrl: "https://assets.coingecko.com/coins/images/14108/small/Binance-bitcoin.png",
    },
    {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
      address: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8",
      coingeckoUrl: "https://www.coingecko.com/en/coins/ethereum",
      imageUrl: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
    },
    {
      name: "Binance Coin",
      symbol: "BNB",
      decimals: 18,
      address: ethers.constants.AddressZero,
      coingeckoUrl: "https://www.coingecko.com/en/coins/binance-coin",
      imageUrl: "https://assets.coingecko.com/coins/images/825/small/binance-coin-logo.png",
      isNative: true,
    },
    {
      name: "Wrapped Binance Coin",
      symbol: "WBNB",
      decimals: 18,
      address: getContract(MAINNET, "NATIVE_TOKEN"),
      isWrapped: true,
      coingeckoUrl: "https://www.coingecko.com/en/coins/binance-coin",
      imageUrl: "https://assets.coingecko.com/coins/images/825/small/binance-coin-logo.png",
      baseSymbol: "BNB",
    },
    {
      name: "USD Gambit",
      symbol: "USDG",
      decimals: 18,
      address: getContract(MAINNET, "USDG"),
      isUsdg: true,
      coingeckoUrl: "https://www.coingecko.com/en/coins/usd-gambit",
      imageUrl: "https://assets.coingecko.com/coins/images/15886/small/usdg-02.png",
    },
    {
      name: "Binance USD",
      symbol: "BUSD",
      decimals: 18,
      address: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
      isStable: true,
      coingeckoUrl: "https://www.coingecko.com/en/coins/binance-usd",
      imageUrl: "https://assets.coingecko.com/coins/images/9576/small/BUSD.png",
    },
    {
      name: "USD Coin",
      symbol: "USDC",
      decimals: 18,
      address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
      isStable: true,
      coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
      imageUrl: "https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png",
    },
    {
      name: "Tether",
      symbol: "USDT",
      decimals: 18,
      address: "0x55d398326f99059fF775485246999027B3197955",
      isStable: true,
      coingeckoUrl: "https://www.coingecko.com/en/coins/tether",
      imageUrl: "https://assets.coingecko.com/coins/images/325/small/Tether-logo.png",
    },
  ],
  [TESTNET]: [
    {
      name: "Bitcoin (BTCB)",
      symbol: "BTC",
      decimals: 8,
      address: "0xb19C12715134bee7c4b1Ca593ee9E430dABe7b56",
      imageUrl: "https://assets.coingecko.com/coins/images/26115/thumb/btcb.png?1655921693",
    },
    {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
      address: "0x1958f7C067226c7C8Ac310Dc994D0cebAbfb2B02",
      imageUrl: "https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880",
    },
    {
      name: "Binance Coin",
      symbol: "BNB",
      decimals: 18,
      address: ethers.constants.AddressZero,
      isNative: true,
      imageUrl: "https://assets.coingecko.com/coins/images/825/small/binance-coin-logo.png",
    },
    {
      name: "Wrapped Binance Coin",
      symbol: "WBNB",
      decimals: 18,
      address: "0x612777Eea37a44F7a95E3B101C39e1E2695fa6C2",
      isWrapped: true,
      baseSymbol: "BNB",
      imageUrl: "https://assets.coingecko.com/coins/images/825/small/binance-coin-logo.png",
    },
    {
      name: "USD Gambit",
      symbol: "USDG",
      decimals: 18,
      address: getContract(TESTNET, "USDG"),
      isUsdg: true,
      imageUrl: "https://assets.coingecko.com/coins/images/15886/small/usdg-02.png",
    },
    {
      name: "Binance USD",
      symbol: "BUSD",
      decimals: 18,
      address: "0x3F223C4E5ac67099CB695834b20cCd5E5D5AA9Ef",
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/9576/small/BUSD.png",
    },
  ],
  [ARBITRUM_TESTNET]: [
    {
      name: "Bitcoin",
      symbol: "BTC",
      decimals: 8,
      address: "0x27960f9A322BE96A1535E6c19B3958e80E6a2670",
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/7598/thumb/wrapped_bitcoin_wbtc.png?1548822744",
    },
    {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
      address: ethers.constants.AddressZero,
      isNative: true,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880",
    },
    // https://github.com/OffchainLabs/arbitrum/blob/950c2f91b2e951cd3764394e0a73eac3797aecf3/packages/arb-ts/src/lib/networks.ts#L65
    {
      name: "Wrapped Ethereum",
      symbol: "WETH",
      decimals: 18,
      address: "0xB47e6A5f8b33b3F17603C83a0535A9dcD7E32681",
      isWrapped: true,
      baseSymbol: "ETH",
      imageUrl: "https://assets.coingecko.com/coins/images/2518/thumb/weth.png?1628852295",
    },
    {
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      address: "0xf0DCd4737A20ED33481A49De94C599944a3Ca737",
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
    },
    {
      name: "Tether",
      symbol: "USDT",
      decimals: 6,
      address: "0x818ED84bA1927945b631016e0d402Db50cE8865f",
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/325/small/Tether-logo.png",
    },
  ],
  [ARBITRUM]: [
    {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
      address: ethers.constants.AddressZero,
      isNative: true,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880",
    },
    {
      name: "Wrapped Ethereum",
      symbol: "WETH",
      decimals: 18,
      address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
      isWrapped: true,
      baseSymbol: "ETH",
      imageUrl: "https://assets.coingecko.com/coins/images/2518/thumb/weth.png?1628852295",
    },
    {
      name: "Bitcoin (WBTC)",
      symbol: "BTC",
      decimals: 8,
      address: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/7598/thumb/wrapped_bitcoin_wbtc.png?1548822744",
    },
    {
      name: "Chainlink",
      symbol: "LINK",
      decimals: 18,
      address: "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4",
      isStable: false,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/877/thumb/chainlink-new-logo.png?1547034700",
    },
    {
      name: "Uniswap",
      symbol: "UNI",
      decimals: 18,
      address: "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",
      isStable: false,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/12504/thumb/uniswap-uni.png?1600306604",
    },
    {
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      address: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
    },
    {
      name: "Tether",
      symbol: "USDT",
      decimals: 6,
      address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/325/thumb/Tether-logo.png?1598003707",
    },
    {
      name: "Dai",
      symbol: "DAI",
      decimals: 18,
      address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/9956/thumb/4943.png?1636636734",
    },
    {
      name: "Frax",
      symbol: "FRAX",
      decimals: 18,
      address: "0x17FC002b466eEc40DaE837Fc4bE5c67993ddBd6F",
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/13422/small/frax_logo.png?1608476506",
    },
    {
      name: "Magic Internet Money",
      symbol: "MIM",
      decimals: 18,
      address: "0xFEa7a6a0B346362BF88A9e4A88416B77a57D6c2A",
      isStable: true,
      isTempHidden: true,
      imageUrl: "https://assets.coingecko.com/coins/images/16786/small/mimlogopng.png",
    },
  ],
  [AVALANCHE]: [
    {
      name: "Avalanche",
      symbol: "AVAX",
      decimals: 18,
      address: ethers.constants.AddressZero,
      isNative: true,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/12559/small/coin-round-red.png?1604021818",
    },
    {
      name: "Wrapped AVAX",
      symbol: "WAVAX",
      decimals: 18,
      address: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
      isWrapped: true,
      baseSymbol: "AVAX",
      imageUrl: "https://assets.coingecko.com/coins/images/12559/small/coin-round-red.png?1604021818",
    },
    {
      name: "Ethereum (WETH.e)",
      symbol: "ETH",
      address: "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB",
      decimals: 18,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880",
    },
    {
      name: "Bitcoin (BTC.b)",
      symbol: "BTC",
      address: "0x152b9d0FdC40C096757F570A51E494bd4b943E50",
      decimals: 8,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/26115/thumb/btcb.png?1655921693",
    },
    {
      name: "Bitcoin (WBTC.e)",
      symbol: "WBTC",
      address: "0x50b7545627a5162F82A992c33b87aDc75187B218",
      decimals: 8,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/7598/thumb/wrapped_bitcoin_wbtc.png?1548822744",
    },
    {
      name: "USD Coin",
      symbol: "USDC",
      address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
      decimals: 6,
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
    },
    {
      name: "USD Coin (USDC.e)",
      symbol: "USDC.e",
      address: "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664",
      decimals: 6,
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
    },
    {
      name: "Magic Internet Money",
      symbol: "MIM",
      address: "0x130966628846BFd36ff31a822705796e8cb8C18D",
      decimals: 18,
      isStable: true,
      isTempHidden: true,
      imageUrl: "https://assets.coingecko.com/coins/images/16786/small/mimlogopng.png",
    },
  ],
  [AVALANCHE_FUJI]: [
    {
      name: "Avalanche",
      symbol: "AVAX",
      decimals: 18,
      address: ethers.constants.AddressZero,
      isNative: true,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/12559/small/coin-round-red.png?1604021818",
    },
    {
      name: "Wrapped AVAX",
      symbol: "WAVAX",
      decimals: 18,
      address: "0x1D308089a2D1Ced3f1Ce36B1FcaF815b07217be3",
      isWrapped: true,
      baseSymbol: "AVAX",
      imageUrl: "https://assets.coingecko.com/coins/images/12559/small/coin-round-red.png?1604021818",
    },
    {
      name: "Ethereum (WETH.e)",
      symbol: "ETH",
      address: "0x8226EC2c1926c9162b6F815153d10018A7ccdf07",
      decimals: 18,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880",
    },
    {
      name: "USD Coin",
      symbol: "USDC",
      address: "0xC492c8d82DC576Ad870707bb40EDb63E2026111E",
      decimals: 6,
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
    },
  ],
  [SEPOLIA_TESTNET]: [
    {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
      address: ethers.constants.AddressZero,
      isNative: true,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880",
    },
    // {
    //   name: "USD Gambit",
    //   symbol: "USDG",
    //   decimals: 18,
    //   address: "0x8a070eF00F054a217501574cAb37c77C2F5A4bb9",
    //   isUsdg: true,
    //   imageUrl: "https://assets.coingecko.com/coins/images/15886/small/usdg-02.png",
    // },
    {
      name: "Wrapped Ethereum (WETH)",
      symbol: "WETH",
      address: "0xa62C17D6FBda8Aa177804e02A92A42AB5106b395",
      isWrapped: true,
      decimals: 18,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/2518/small/weth.png?1628852295",
    },
    {
      name: "DAI",
      symbol: "DAI",
      address: "0x14f828262d13C63AbBdf14fD7b76FC9e2827C71E",
      decimals: 18,
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/9956/small/4943.png?1636636734",
    },
    {
      name: "Wrapped Bitcoin",
      symbol: "WBTC",
      address: "0x82998402DB6aA364c9c45A0F542F9696D1241B78",
      decimals: 8,
      isStable: false,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png?1548822744",
    },
    // {
    //   name: "Uniswap",
    //   symbol: "UNI",
    //   address: "0x3B88F3CD183Bf4340D2A6bEd26EcCa9C9613DA62",
    //   decimals: 18,
    //   isStable: false,
    //   isShortable: true,
    //   imageUrl: "https://assets.coingecko.com/coins/images/12504/small/uniswap-uni.png?1600306604",
    // },
    {
      name: "Link",
      symbol: "LINK",
      address: "0x26bFbcF5Af31C6c0a8cA7794D62A48708e3D5a44",
      decimals: 18,
      isStable: false,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png?1547034700",
    },
    {
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      address: "0x564465C7B8c89Cfa9068d47059a164eD4a6D1B5d",
      isStable: true,
      coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
      imageUrl: "https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png",
    },
    {
      name: "USD Tether",
      symbol: "USDT",
      address: "0xA322688864bD62F8afD99b06ecf5dbE2f785908D",
      decimals: 6,
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/325/small/Tether.png?1668148663",
    },
  ],
  [OPTIMISM_GOERLI_TESTNET]: [
    {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
      address: ethers.constants.AddressZero,
      isNative: true,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880",
    },
    // {
    //   name: "USD Gambit",
    //   symbol: "USDG",
    //   decimals: 18,
    //   address: "0xeED25Cf3A5322cE77D17cbaa108136c64651ab04",
    //   isUsdg: true,
    //   imageUrl: "https://assets.coingecko.com/coins/images/15886/small/usdg-02.png",
    // },
    {
      name: "USD Coin",
      symbol: "USDC",
      decimals: 18,
      address: "0x6C87d812eb972f375244A7e2e84307bcF2e1904f",
      isStable: true,
      coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
      imageUrl: "https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png",
    },
    {
      name: "Wrapped Ethereum (WETH)",
      symbol: "ETH",
      address: "0x743E73cAe7E5B9838a5eb2CfAd3A4c8aCf41614d",
      isWrapped: true,
      decimals: 18,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/2518/small/weth.png?1628852295",
    },
    {
      name: "DAI",
      symbol: "DAI",
      address: "0x1eB733DA495C92CDCaA1F0591895d63C8F028AfC",
      decimals: 18,
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/9956/small/4943.png?1636636734",
    },
    {
      name: "Link",
      symbol: "LINK",
      address: "0xfcf789E040305b647832Bb037384dCeCbbbB02D1",
      decimals: 18,
      isStable: false,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png?1547034700",
    },
    {
      name: "USD Tether",
      symbol: "USDT",
      address: "0x3aA11a6519E823091e408f5f8fc744e5035b4d6D",
      decimals: 6,
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/325/small/Tether.png?1668148663",
    },
  ],
  [OPTIMISM_MAINNET]: [
    {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
      address: ethers.constants.AddressZero,
      isNative: true,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880",
    },
    // {
    //   name: "USD Gambit",
    //   symbol: "USDG",
    //   decimals: 18,
    //   address: "0xD9c58e82Fc71ed7Cf8593fC94403161072458E43",
    //   isUsdg: true,
    //   imageUrl: "https://assets.coingecko.com/coins/images/15886/small/usdg-02.png",
    // },
    {
      name: "Wrapped Ethereum (WETH)",
      symbol: "ETH",
      address: "0x4200000000000000000000000000000000000006",
      isWrapped: true,
      decimals: 18,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/2518/small/weth.png?1628852295",
    },
    {
      name: "DAI",
      symbol: "DAI",
      address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
      decimals: 18,
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/9956/small/4943.png?1636636734",
    },
    {
      name: "Wrapped Bitcoin",
      symbol: "WBTC",
      address: "0x68f180fcCe6836688e9084f035309E29Bf0A2095",
      decimals: 8,
      isStable: false,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png?1548822744",
    },
    {
      name: "Link",
      symbol: "LINK",
      address: "0x350a791Bfc2C21F9Ed5d10980Dad2e2638ffa7f6",
      decimals: 18,
      isStable: false,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png?1547034700",
    },
    {
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
      isStable: true,
      coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
      imageUrl: "https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png",
    },
    {
      name: "USD Tether",
      symbol: "USDT",
      address: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
      decimals: 6,
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/325/small/Tether.png?1668148663",
    },
  ],
  [BLAST_SEPOLIA_TESTNET]: [
    {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
      address: ethers.constants.AddressZero,
      isNative: true,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880",
    },
    // {
    //   name: "USD Gambit",
    //   symbol: "USDG",
    //   decimals: 18,
    //   address: "0x8a070eF00F054a217501574cAb37c77C2F5A4bb9",
    //   isUsdg: true,
    //   imageUrl: "https://assets.coingecko.com/coins/images/15886/small/usdg-02.png",
    // },
    {
      name: "Wrapped Ethereum (WETH)",
      symbol: "WETH",
      address: "0xBb2de0A11260112160F5FBD2bC5e1a31963356d2",
      isWrapped: true,
      decimals: 18,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/2518/small/weth.png?1628852295",
    },
    {
      name: "DAI",
      symbol: "DAI",
      address: "0x555253A4724c03c4DD54341efd0aEBCf10c54873",
      decimals: 18,
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/9956/small/4943.png?1636636734",
    },
    {
      name: "Wrapped Bitcoin",
      symbol: "WBTC",
      address: "0xdb302Cf8B566EA4a773ccb89d679b675fC638aDb",
      decimals: 8,
      isStable: false,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png?1548822744",
    },
    {
      name: "Link",
      symbol: "LINK",
      address: "0x9b9Acd2b90e91a5bf0C9d0a97D070FAdFFEdE0F5",
      decimals: 18,
      isStable: false,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png?1547034700",
    },
    {
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      address: "0xFEef69098dAC7D6d4C81c7f54aC73a7b0741C32a",
      isStable: true,
      coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
      imageUrl: "https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png",
    },
    {
      name: "USD Tether",
      symbol: "USDT",
      address: "0xED20B1459Bf848e15e603670214DD3948160C529",
      decimals: 6,
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/325/small/Tether.png?1668148663",
    },
  ],
  [MORPH_HOLESKY]: [
    {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
      address: ethers.constants.AddressZero,
      isNative: true,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880",
    },
    {
      name: "Wrapped Ethereum (WETH)",
      symbol: "WETH",
      address: "0x57695F4Bc401B6d3755916cF1F74BA7f3b20a9Dc",
      isWrapped: true,
      decimals: 18,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/2518/small/weth.png?1628852295",
    },
    {
      name: "DAI",
      symbol: "DAI",
      address: "0x34e53B46282f70c129E2A6430E63c84e2e8bDcDb",
      decimals: 18,
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/9956/small/4943.png?1636636734",
    },

    {
      name: "Wrapped Bitcoin",
      symbol: "WBTC",
      address: "0x61BB8823fC9CA7313679DE703671AA6A667a1F83",
      decimals: 8,
      isStable: false,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png?1548822744",
    },
    // {
    //   name: "TMX",
    //   symbol: "TMX",
    //   address: "0x98e9944fdF31890F5823f351B4797e97C5f86088",
    //   decimals: 18,
    //   isStable: false,
    //   isShortable: true,
    //   imageUrl: "https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png?1548822744",
    // },
    {
      name: "Link",
      symbol: "LINK",
      address: "0x70Edec6a2C96316a0E69A6f3D5daE28213b7986e",
      decimals: 18,
      isStable: false,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png?1547034700",
    },
    {
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      address: "0xe3B620B1557696DA5324EFcA934Ea6c27ad69e00",
      isStable: true,
      coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
      imageUrl: "https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png",
    },
    {
      name: "USD Tether",
      symbol: "USDT",
      address: "0x07d9b60c7F719994c07C96a7f87460a0cC94379F",
      decimals: 6,
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/325/small/Tether.png?1668148663",
    },
  ],
  [MORPH_MAINNET]: [
    {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
      address: ethers.constants.AddressZero,
      isNative: true,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880",
    },
    {
      name: "Wrapped Ethereum (WETH)",
      symbol: "WETH",
      address: "0x5300000000000000000000000000000000000011",
      isWrapped: true,
      decimals: 18,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/2518/small/weth.png?1628852295",
    },
    // {
    //   name: "DAI",
    //   symbol: "DAI",
    //   address: "0x34e53B46282f70c129E2A6430E63c84e2e8bDcDb",
    //   decimals: 18,
    //   isStable: true,
    //   imageUrl: "https://assets.coingecko.com/coins/images/9956/small/4943.png?1636636734",
    // },

    // {
    //   name: "Wrapped Bitcoin",
    //   symbol: "WBTC",
    //   address: "0x803DcE4D3f4Ae2e17AF6C51343040dEe320C149D",
    //   decimals: 8,
    //   isStable: false,
    //   isShortable: true,
    //   imageUrl: "https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png?1548822744",
    // },
    // {
    //   name: "TMX",
    //   symbol: "TMX",
    //   address: "0x98e9944fdF31890F5823f351B4797e97C5f86088",
    //   decimals: 18,
    //   isStable: false,
    //   isShortable: true,
    //   imageUrl: "https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png?1548822744",
    // },
    // {
    //   name: "Link",
    //   symbol: "LINK",
    //   address: "0x70Edec6a2C96316a0E69A6f3D5daE28213b7986e",
    //   decimals: 18,
    //   isStable: false,
    //   isShortable: true,
    //   imageUrl: "https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png?1547034700",
    // },
    // {
    //   name: "USD Coin",
    //   symbol: "USDC",
    //   decimals: 6,
    //   address: "0xc7D67A9cBB121b3b0b9c053DD9f469523243379A",
    //   isStable: true,
    //   coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
    //   imageUrl: "https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png",
    // },
    {
      name: "USD Tether",
      symbol: "USDT",
      address: "0xc7D67A9cBB121b3b0b9c053DD9f469523243379A",
      decimals: 6,
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/325/small/Tether.png?1668148663",
    },
  ],
  [OPBNB_TESTNET]: [
    {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
      address: ethers.constants.AddressZero,
      isNative: true,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880",
    },
    {
      name: "Wrapped Ethereum (WETH)",
      symbol: "WETH",
      address: "0x4555Ed1F6D9cb6CC1D52BB88C7525b17a06da0Dd",
      isWrapped: true,
      decimals: 18,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/2518/small/weth.png?1628852295",
    },
    {
      name: "DAI",
      symbol: "DAI",
      address: "0xD491FAca0709322780Ec49fD35b4CB5DD34be788",
      decimals: 18,
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/9956/small/4943.png?1636636734",
    },

    {
      name: "Wrapped Bitcoin",
      symbol: "WBTC",
      address: "0xd5Da0E8D4925dCd6A323468Aa959934688fB0800",
      decimals: 8,
      isStable: false,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png?1548822744",
    },
    // {
    //   name: "TMX",
    //   symbol: "TMX",
    //   address: "0x98e9944fdF31890F5823f351B4797e97C5f86088",
    //   decimals: 18,
    //   isStable: false,
    //   isShortable: true,
    //   imageUrl: "https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png?1548822744",
    // },
    {
      name: "Link",
      symbol: "LINK",
      address: "0x68D363017048FBEA0325eb8027B144Fd217cc3A3",
      decimals: 18,
      isStable: false,
      isShortable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png?1547034700",
    },
    {
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      address: "0xE32a1e502224b73a3FFCD01db75dBa5b0B9061E4",
      isStable: true,
      coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
      imageUrl: "https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png",
    },
    {
      name: "USD Tether",
      symbol: "USDT",
      address: "0xEb9586532918916eB1196EE5e6751f6351fe39E6",
      decimals: 6,
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/325/small/Tether.png?1668148663",
    },
  ],
};

export const ADDITIONAL_TOKENS: { [chainId: number]: Token[] } = {
  [ARBITRUM]: [
    {
      name: "GMX",
      symbol: "GMX",
      address: getContract(ARBITRUM, "GMX"),
      decimals: 18,
      imageUrl: "https://assets.coingecko.com/coins/images/18323/small/arbit.png?1631532468",
    },
    {
      name: "Escrowed GMX",
      symbol: "esGMX",
      address: getContract(ARBITRUM, "ES_GMX"),
      decimals: 18,
    },
    {
      name: "GMX LP",
      symbol: "GLP",
      address: getContract(ARBITRUM, "GLP"),
      decimals: 18,
      imageUrl: "https://github.com/gmx-io/gmx-assets/blob/main/GMX-Assets/PNG/GLP_LOGO%20ONLY.png?raw=true",
    },
  ],
  [AVALANCHE]: [
    {
      name: "GMX",
      symbol: "GMX",
      address: getContract(AVALANCHE, "GMX"),
      decimals: 18,
      imageUrl: "https://assets.coingecko.com/coins/images/18323/small/arbit.png?1631532468",
    },
    {
      name: "Escrowed GMX",
      symbol: "esGMX",
      address: getContract(AVALANCHE, "ES_GMX"),
      decimals: 18,
    },
    {
      name: "GMX LP",
      symbol: "GLP",
      address: getContract(ARBITRUM, "GLP"),
      decimals: 18,
      imageUrl: "https://github.com/gmx-io/gmx-assets/blob/main/GMX-Assets/PNG/GLP_LOGO%20ONLY.png?raw=true",
    },
  ],
  [SEPOLIA_TESTNET]: [
    {
      name: "GMX",
      symbol: "GMX",
      address: getContract(SEPOLIA_TESTNET, "GMX"),
      decimals: 18,
      imageUrl: "https://assets.coingecko.com/coins/images/18323/small/arbit.png?1631532468",
    },
    {
      name: "Escrowed GMX",
      symbol: "esGMX",
      address: getContract(SEPOLIA_TESTNET, "ES_GMX"),
      decimals: 18,
    },
    {
      name: "GMX LP",
      symbol: "GLP",
      address: getContract(SEPOLIA_TESTNET, "GLP"),
      decimals: 18,
      imageUrl: "https://github.com/gmx-io/gmx-assets/blob/main/GMX-Assets/PNG/GLP_LOGO%20ONLY.png?raw=true",
    },
  ],
  [BLAST_SEPOLIA_TESTNET]: [
    {
      name: "GMX",
      symbol: "GMX",
      address: getContract(BLAST_SEPOLIA_TESTNET, "GMX"),
      decimals: 18,
      imageUrl: "https://assets.coingecko.com/coins/images/18323/small/arbit.png?1631532468",
    },
    {
      name: "Escrowed GMX",
      symbol: "esGMX",
      address: getContract(BLAST_SEPOLIA_TESTNET, "ES_GMX"),
      decimals: 18,
    },
    {
      name: "GMX LP",
      symbol: "GLP",
      address: getContract(BLAST_SEPOLIA_TESTNET, "GLP"),
      decimals: 18,
      imageUrl: "https://github.com/gmx-io/gmx-assets/blob/main/GMX-Assets/PNG/GLP_LOGO%20ONLY.png?raw=true",
    },
  ],
  [MORPH_HOLESKY]: [
    {
      name: "GMX",
      symbol: "GMX",
      address: getContract(MORPH_HOLESKY, "GMX"),
      decimals: 18,
      imageUrl: "https://assets.coingecko.com/coins/images/18323/small/arbit.png?1631532468",
    },
    {
      name: "Escrowed GMX",
      symbol: "esGMX",
      address: getContract(MORPH_HOLESKY, "ES_GMX"),
      decimals: 18,
    },
    {
      name: "GMX LP",
      symbol: "GLP",
      address: getContract(MORPH_HOLESKY, "GLP"),
      decimals: 18,
      imageUrl: "https://github.com/gmx-io/gmx-assets/blob/main/GMX-Assets/PNG/GLP_LOGO%20ONLY.png?raw=true",
    },
  ],
  [MORPH_MAINNET]: [
    {
      name: "GMX",
      symbol: "GMX",
      address: getContract(MORPH_MAINNET, "GMX"),
      decimals: 18,
      imageUrl: "https://assets.coingecko.com/coins/images/18323/small/arbit.png?1631532468",
    },
    {
      name: "Escrowed GMX",
      symbol: "esGMX",
      address: getContract(MORPH_MAINNET, "ES_GMX"),
      decimals: 18,
    },
    {
      name: "GMX LP",
      symbol: "GLP",
      address: getContract(MORPH_MAINNET, "GLP"),
      decimals: 18,
      imageUrl: "https://github.com/gmx-io/gmx-assets/blob/main/GMX-Assets/PNG/GLP_LOGO%20ONLY.png?raw=true",
    },
  ],
  [OPTIMISM_GOERLI_TESTNET]: [
    {
      name: "GMX",
      symbol: "GMX",
      address: getContract(OPTIMISM_GOERLI_TESTNET, "GMX"),
      decimals: 18,
      imageUrl: "https://assets.coingecko.com/coins/images/18323/small/arbit.png?1631532468",
    },
    {
      name: "Escrowed GMX",
      symbol: "esGMX",
      address: getContract(OPTIMISM_GOERLI_TESTNET, "ES_GMX"),
      decimals: 18,
    },
    {
      name: "GMX LP",
      symbol: "GLP",
      address: getContract(OPTIMISM_GOERLI_TESTNET, "GLP"),
      decimals: 18,
      imageUrl: "https://github.com/gmx-io/gmx-assets/blob/main/GMX-Assets/PNG/GLP_LOGO%20ONLY.png?raw=true",
    },
  ],
  [OPTIMISM_MAINNET]: [
    {
      name: "GMX",
      symbol: "GMX",
      address: getContract(OPTIMISM_MAINNET, "GMX"),
      decimals: 18,
      imageUrl: "https://assets.coingecko.com/coins/images/18323/small/arbit.png?1631532468",
    },
    {
      name: "Escrowed GMX",
      symbol: "esGMX",
      address: getContract(OPTIMISM_MAINNET, "ES_GMX"),
      decimals: 18,
    },
    {
      name: "GMX LP",
      symbol: "GLP",
      address: getContract(OPTIMISM_MAINNET, "GLP"),
      decimals: 18,
      imageUrl: "https://github.com/gmx-io/gmx-assets/blob/main/GMX-Assets/PNG/GLP_LOGO%20ONLY.png?raw=true",
    },
  ],
};

export const PLATFORM_TOKENS: { [chainId: number]: { [symbol: string]: Token } } = {
  [ARBITRUM]: {
    // arbitrum
    GMX: {
      name: "GMX",
      symbol: "GMX",
      decimals: 18,
      address: getContract(ARBITRUM, "GMX"),
      imageUrl: "https://assets.coingecko.com/coins/images/18323/small/arbit.png?1631532468",
    },
    GLP: {
      name: "GMX LP",
      symbol: "GLP",
      decimals: 18,
      address: getContract(ARBITRUM, "StakedGlpTracker"), // address of fsGLP token because user only holds fsGLP
      imageUrl: "https://github.com/gmx-io/gmx-assets/blob/main/GMX-Assets/PNG/GLP_LOGO%20ONLY.png?raw=true",
    },
  },
  [AVALANCHE]: {
    // avalanche
    GMX: {
      name: "GMX",
      symbol: "GMX",
      decimals: 18,
      address: getContract(AVALANCHE, "GMX"),
      imageUrl: "https://assets.coingecko.com/coins/images/18323/small/arbit.png?1631532468",
    },
    GLP: {
      name: "GMX LP",
      symbol: "GLP",
      decimals: 18,
      address: getContract(AVALANCHE, "StakedGlpTracker"), // address of fsGLP token because user only holds fsGLP
      imageUrl: "https://github.com/gmx-io/gmx-assets/blob/main/GMX-Assets/PNG/GLP_LOGO%20ONLY.png?raw=true",
    },
  },
  [SEPOLIA_TESTNET]: {
    GMX: {
      name: "GMX",
      symbol: "GMX",
      decimals: 18,
      address: getContract(SEPOLIA_TESTNET, "GMX"),
      imageUrl: "https://assets.coingecko.com/coins/images/18323/small/arbit.png?1631532468",
    },
    GLP: {
      name: "GMX LP",
      symbol: "GLP",
      decimals: 18,
      address: getContract(SEPOLIA_TESTNET, "StakedGlpTracker"), // address of fsGLP token because user only holds fsGLP
      imageUrl: "https://github.com/gmx-io/gmx-assets/blob/main/GMX-Assets/PNG/GLP_LOGO%20ONLY.png?raw=true",
    },
  },
  [BLAST_SEPOLIA_TESTNET]: {
    GMX: {
      name: "GMX",
      symbol: "GMX",
      decimals: 18,
      address: getContract(BLAST_SEPOLIA_TESTNET, "GMX"),
      imageUrl: "https://assets.coingecko.com/coins/images/18323/small/arbit.png?1631532468",
    },
    GLP: {
      name: "GMX LP",
      symbol: "GLP",
      decimals: 18,
      address: getContract(BLAST_SEPOLIA_TESTNET, "StakedGlpTracker"), // address of fsGLP token because user only holds fsGLP
      imageUrl: "https://github.com/gmx-io/gmx-assets/blob/main/GMX-Assets/PNG/GLP_LOGO%20ONLY.png?raw=true",
    },
  },
  [MORPH_HOLESKY]: {
    GMX: {
      name: "GMX",
      symbol: "GMX",
      decimals: 18,
      address: getContract(MORPH_HOLESKY, "GMX"),
      imageUrl: "https://assets.coingecko.com/coins/images/18323/small/arbit.png?1631532468",
    },
    GLP: {
      name: "GMX LP",
      symbol: "GLP",
      decimals: 18,
      address: getContract(MORPH_HOLESKY, "StakedGlpTracker"), // address of fsGLP token because user only holds fsGLP
      imageUrl: "https://github.com/gmx-io/gmx-assets/blob/main/GMX-Assets/PNG/GLP_LOGO%20ONLY.png?raw=true",
    },
  },
  [OPTIMISM_GOERLI_TESTNET]: {
    GMX: {
      name: "GMX",
      symbol: "GMX",
      decimals: 18,
      address: getContract(OPTIMISM_GOERLI_TESTNET, "GMX"),
      imageUrl: "https://assets.coingecko.com/coins/images/18323/small/arbit.png?1631532468",
    },
    GLP: {
      name: "GMX LP",
      symbol: "GLP",
      decimals: 18,
      address: getContract(OPTIMISM_GOERLI_TESTNET, "StakedGlpTracker"), // address of fsGLP token because user only holds fsGLP
      imageUrl: "https://github.com/gmx-io/gmx-assets/blob/main/GMX-Assets/PNG/GLP_LOGO%20ONLY.png?raw=true",
    },
  },
  [OPTIMISM_MAINNET]: {
    GMX: {
      name: "GMX",
      symbol: "GMX",
      decimals: 18,
      address: getContract(OPTIMISM_MAINNET, "GMX"),
      imageUrl: "https://assets.coingecko.com/coins/images/18323/small/arbit.png?1631532468",
    },
    GLP: {
      name: "GMX LP",
      symbol: "GLP",
      decimals: 18,
      address: getContract(OPTIMISM_MAINNET, "StakedGlpTracker"), // address of fsGLP token because user only holds fsGLP
      imageUrl: "https://github.com/gmx-io/gmx-assets/blob/main/GMX-Assets/PNG/GLP_LOGO%20ONLY.png?raw=true",
    },
  },
};

export const ICONLINKS = {
  [ARBITRUM_TESTNET]: {
    GMX: {
      coingecko: "https://www.coingecko.com/en/coins/gmx",
      arbitrum: "https://arbiscan.io/address/0xfc5a1a6eb076a2c7ad06ed22c90d7e710e35ad0a",
    },
    GLP: {
      arbitrum: "https://testnet.arbiscan.io/token/0xb4f81Fa74e06b5f762A104e47276BA9b2929cb27",
    },
  },
  [ARBITRUM]: {
    GMX: {
      coingecko: "https://www.coingecko.com/en/coins/gmx",
      arbitrum: "https://arbiscan.io/address/0xfc5a1a6eb076a2c7ad06ed22c90d7e710e35ad0a",
    },
    GLP: {
      arbitrum: "https://arbiscan.io/token/0x1aDDD80E6039594eE970E5872D247bf0414C8903",
      reserves: "https://portfolio.nansen.ai/dashboard/gmx?chain=ARBITRUM",
    },
    ETH: {
      coingecko: "https://www.coingecko.com/en/coins/ethereum",
    },
    BTC: {
      coingecko: "https://www.coingecko.com/en/coins/wrapped-bitcoin",
      arbitrum: "https://arbiscan.io/address/0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f",
    },
    LINK: {
      coingecko: "https://www.coingecko.com/en/coins/chainlink",
      arbitrum: "https://arbiscan.io/address/0xf97f4df75117a78c1a5a0dbb814af92458539fb4",
    },
    UNI: {
      coingecko: "https://www.coingecko.com/en/coins/uniswap",
      arbitrum: "https://arbiscan.io/address/0xfa7f8980b0f1e64a2062791cc3b0871572f1f7f0",
    },
    USDC: {
      coingecko: "https://www.coingecko.com/en/coins/usd-coin",
      arbitrum: "https://arbiscan.io/address/0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
    },
    USDT: {
      coingecko: "https://www.coingecko.com/en/coins/tether",
      arbitrum: "https://arbiscan.io/address/0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9",
    },
    DAI: {
      coingecko: "https://www.coingecko.com/en/coins/dai",
      arbitrum: "https://arbiscan.io/address/0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
    },
    MIM: {
      coingecko: "https://www.coingecko.com/en/coins/magic-internet-money",
      arbitrum: "https://arbiscan.io/address/0xfea7a6a0b346362bf88a9e4a88416b77a57d6c2a",
    },
    FRAX: {
      coingecko: "https://www.coingecko.com/en/coins/frax",
      arbitrum: "https://arbiscan.io/address/0x17fc002b466eec40dae837fc4be5c67993ddbd6f",
    },
  },
  [AVALANCHE]: {
    GMX: {
      coingecko: "https://www.coingecko.com/en/coins/gmx",
      avalanche: "https://snowtrace.io/address/0x62edc0692bd897d2295872a9ffcac5425011c661",
    },
    GLP: {
      avalanche: "https://snowtrace.io/address/0x9e295B5B976a184B14aD8cd72413aD846C299660",
      reserves: "https://portfolio.nansen.ai/dashboard/gmx?chain=AVAX",
    },
    AVAX: {
      coingecko: "https://www.coingecko.com/en/coins/avalanche",
    },
    ETH: {
      coingecko: "https://www.coingecko.com/en/coins/weth",
      avalanche: "https://snowtrace.io/address/0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab",
    },
    WBTC: {
      coingecko: "https://www.coingecko.com/en/coins/wrapped-bitcoin",
      avalanche: "https://snowtrace.io/address/0x50b7545627a5162f82a992c33b87adc75187b218",
    },
    BTC: {
      coingecko: "https://www.coingecko.com/en/coins/bitcoin-avalanche-bridged-btc-b",
      avalanche: "https://snowtrace.io/address/0x152b9d0FdC40C096757F570A51E494bd4b943E50",
    },
    MIM: {
      coingecko: "https://www.coingecko.com/en/coins/magic-internet-money",
      avalanche: "https://snowtrace.io/address/0x130966628846bfd36ff31a822705796e8cb8c18d",
    },
    USDC: {
      coingecko: "https://www.coingecko.com/en/coins/usd-coin",
      avalanche: "https://snowtrace.io/address/0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e",
    },
    "USDC.e": {
      coingecko: "https://www.coingecko.com/en/coins/usd-coin-avalanche-bridged-usdc-e",
      avalanche: "https://snowtrace.io/address/0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664",
    },
  },
  [AVALANCHE_FUJI]: {
    AVAX: {
      coingecko: "https://www.coingecko.com/en/coins/avalanche",
    },
    ETH: {
      coingecko: "https://www.coingecko.com/en/coins/weth",
      avalanche: "https://testnet.snowtrace.io/address/0x8226EC2c1926c9162b6F815153d10018A7ccdf07",
    },
    USDC: {
      coingecko: "https://www.coingecko.com/en/coins/usd-coin",
      avalanche: "https://testnet.snowtrace.io/address/0xC492c8d82DC576Ad870707bb40EDb63E2026111E",
    },
  },
  [SEPOLIA_TESTNET]: {
    ETH: {
      coingecko: "https://www.coingecko.com/en/coins/weth",
      avalanche: "https://testnet.snowtrace.io/address/0x8226EC2c1926c9162b6F815153d10018A7ccdf07",
    },
    USDC: {
      coingecko: "https://www.coingecko.com/en/coins/usd-coin",
      avalanche: "https://testnet.snowtrace.io/address/0xC492c8d82DC576Ad870707bb40EDb63E2026111E",
    },
    USDT: {
      coingecko: "https://assets.coingecko.com/coins/images/325/small/Tether.png?1668148663",
      avalanche: "https://testnet.snowtrace.io/address/0xC492c8d82DC576Ad870707bb40EDb63E2026111E",
    },
    GMX: {
      coingecko: "https://www.coingecko.com/en/coins/gmx",
      arbitrum: "https://arbiscan.io/address/0xfc5a1a6eb076a2c7ad06ed22c90d7e710e35ad0a",
    },
    GLP: {
      arbitrum: "https://arbiscan.io/token/0x1aDDD80E6039594eE970E5872D247bf0414C8903",
      reserves: "https://portfolio.nansen.ai/dashboard/gmx?chain=ARBITRUM",
    },
  },
  [OPTIMISM_GOERLI_TESTNET]: {
    ETH: {
      coingecko: "https://www.coingecko.com/en/coins/weth",
      avalanche: "https://testnet.snowtrace.io/address/0x8226EC2c1926c9162b6F815153d10018A7ccdf07",
    },
    USDC: {
      coingecko: "https://www.coingecko.com/en/coins/usd-coin",
      avalanche: "https://testnet.snowtrace.io/address/0xC492c8d82DC576Ad870707bb40EDb63E2026111E",
    },
    USDT: {
      coingecko: "https://assets.coingecko.com/coins/images/325/small/Tether.png?1668148663",
      avalanche: "https://testnet.snowtrace.io/address/0xC492c8d82DC576Ad870707bb40EDb63E2026111E",
    },
    GMX: {
      coingecko: "https://www.coingecko.com/en/coins/gmx",
      arbitrum: "https://arbiscan.io/address/0xfc5a1a6eb076a2c7ad06ed22c90d7e710e35ad0a",
    },
    GLP: {
      arbitrum: "https://arbiscan.io/token/0x1aDDD80E6039594eE970E5872D247bf0414C8903",
      reserves: "https://portfolio.nansen.ai/dashboard/gmx?chain=ARBITRUM",
    },
  },
  [OPTIMISM_MAINNET]: {
    ETH: {
      coingecko: "https://www.coingecko.com/en/coins/weth",
      avalanche: "https://testnet.snowtrace.io/address/0x8226EC2c1926c9162b6F815153d10018A7ccdf07",
    },
    USDC: {
      coingecko: "https://www.coingecko.com/en/coins/usd-coin",
      avalanche: "https://testnet.snowtrace.io/address/0xC492c8d82DC576Ad870707bb40EDb63E2026111E",
    },
    USDT: {
      coingecko: "https://assets.coingecko.com/coins/images/325/small/Tether.png?1668148663",
      avalanche: "https://testnet.snowtrace.io/address/0xC492c8d82DC576Ad870707bb40EDb63E2026111E",
    },
    // @todo
    // GMX: {
    //   coingecko: "https://www.coingecko.com/en/coins/gmx",
    //   arbitrum: "https://arbiscan.io/address/0xfc5a1a6eb076a2c7ad06ed22c90d7e710e35ad0a",
    // },
    // GLP: {
    //   arbitrum: "https://arbiscan.io/token/0x1aDDD80E6039594eE970E5872D247bf0414C8903",
    //   reserves: "https://portfolio.nansen.ai/dashboard/gmx?chain=ARBITRUM",
    // },
  },
  [BLAST_SEPOLIA_TESTNET]: {
    ETH: {
      coingecko: "https://www.coingecko.com/en/coins/weth",
      avalanche: "https://testnet.snowtrace.io/address/0x8226EC2c1926c9162b6F815153d10018A7ccdf07",
    },
    USDC: {
      coingecko: "https://www.coingecko.com/en/coins/usd-coin",
      avalanche: "https://testnet.snowtrace.io/address/0xC492c8d82DC576Ad870707bb40EDb63E2026111E",
    },
    USDT: {
      coingecko: "https://assets.coingecko.com/coins/images/325/small/Tether.png?1668148663",
      avalanche: "https://testnet.snowtrace.io/address/0xC492c8d82DC576Ad870707bb40EDb63E2026111E",
    },
    TMX: {
      coingecko: "https://www.coingecko.com/en/coins/gmx",
      arbitrum: "https://arbiscan.io/address/0xfc5a1a6eb076a2c7ad06ed22c90d7e710e35ad0a",
    },
    TLP: {
      arbitrum: "https://arbiscan.io/token/0x1aDDD80E6039594eE970E5872D247bf0414C8903",
      reserves: "https://portfolio.nansen.ai/dashboard/gmx?chain=ARBITRUM",
    },
  },
  [MORPH_HOLESKY]: {
    ETH: {
      coingecko: "https://www.coingecko.com/en/coins/weth",
      avalanche: "https://testnet.snowtrace.io/address/0x8226EC2c1926c9162b6F815153d10018A7ccdf07",
    },
    USDC: {
      coingecko: "https://www.coingecko.com/en/coins/usd-coin",
      avalanche: "https://testnet.snowtrace.io/address/0xC492c8d82DC576Ad870707bb40EDb63E2026111E",
    },
    USDT: {
      coingecko: "https://assets.coingecko.com/coins/images/325/small/Tether.png?1668148663",
      avalanche: "https://testnet.snowtrace.io/address/0xC492c8d82DC576Ad870707bb40EDb63E2026111E",
    },
    TMX: {
      coingecko: "https://www.coingecko.com/en/coins/gmx",
      arbitrum: "https://arbiscan.io/address/0xfc5a1a6eb076a2c7ad06ed22c90d7e710e35ad0a",
    },
    TLP: {
      arbitrum: "https://arbiscan.io/token/0x1aDDD80E6039594eE970E5872D247bf0414C8903",
      reserves: "https://portfolio.nansen.ai/dashboard/gmx?chain=ARBITRUM",
    },
  },
  [MORPH_MAINNET]: {
    ETH: {
      coingecko: "https://www.coingecko.com/en/coins/weth",
      // avalanche: "https://testnet.snowtrace.io/address/0x8226EC2c1926c9162b6F815153d10018A7ccdf07",
      morph: "https://testnet.snowtrace.io/address/0x8226EC2c1926c9162b6F815153d10018A7ccdf07",
    },
    USDC: {
      coingecko: "https://www.coingecko.com/en/coins/usd-coin",
      // avalanche: "https://testnet.snowtrace.io/address/0xC492c8d82DC576Ad870707bb40EDb63E2026111E",
      morph: "https://testnet.snowtrace.io/address/0xC492c8d82DC576Ad870707bb40EDb63E2026111E",
    },
    USDT: {
      coingecko: "https://assets.coingecko.com/coins/images/325/small/Tether.png?1668148663",
      // avalanche: "https://testnet.snowtrace.io/address/0xC492c8d82DC576Ad870707bb40EDb63E2026111E",
      morph: "https://testnet.snowtrace.io/address/0xC492c8d82DC576Ad870707bb40EDb63E2026111E",
    },
    TMX: {
      // coingecko: "https://www.coingecko.com/en/coins/gmx",
      // arbitrum: "https://arbiscan.io/address/0xfc5a1a6eb076a2c7ad06ed22c90d7e710e35ad0a",
      morph: "https://explorer.morphl2.io/address/0x5682453dC23cB0Ff914Da3A079072202405D1bce",
    },
    TLP: {
      // arbitrum: "https://arbiscan.io/token/0x1aDDD80E6039594eE970E5872D247bf0414C8903",
      // reserves: "https://portfolio.nansen.ai/dashboard/gmx?chain=ARBITRUM",
      // morph: "https://portfolio.nansen.ai/dashboard/gmx?chain=MORPH",
      morph: "https://explorer.morphl2.io/address/0x95FF8e2d0B9355E856391C2E234995A1F7F896c5",
    },
  },
  [OPBNB_TESTNET]: {
    ETH: {
      coingecko: "https://www.coingecko.com/en/coins/weth",
      avalanche: "https://testnet.snowtrace.io/address/0x8226EC2c1926c9162b6F815153d10018A7ccdf07",
    },
    USDC: {
      coingecko: "https://www.coingecko.com/en/coins/usd-coin",
      avalanche: "https://testnet.snowtrace.io/address/0xC492c8d82DC576Ad870707bb40EDb63E2026111E",
    },
    USDT: {
      coingecko: "https://assets.coingecko.com/coins/images/325/small/Tether.png?1668148663",
      avalanche: "https://testnet.snowtrace.io/address/0xC492c8d82DC576Ad870707bb40EDb63E2026111E",
    },
    TMX: {
      coingecko: "https://www.coingecko.com/en/coins/gmx",
      arbitrum: "https://arbiscan.io/address/0xfc5a1a6eb076a2c7ad06ed22c90d7e710e35ad0a",
    },
    TLP: {
      arbitrum: "https://arbiscan.io/token/0x1aDDD80E6039594eE970E5872D247bf0414C8903",
      reserves: "https://portfolio.nansen.ai/dashboard/gmx?chain=ARBITRUM",
    },
  },
};

export const GLP_POOL_COLORS = {
  ETH: "#6062a6",
  BTC: "#F7931A",
  WBTC: "#F7931A",
  USDC: "#2775CA",
  "USDC.e": "#2A5ADA",
  USDT: "#67B18A",
  MIM: "#9695F8",
  FRAX: "#000",
  DAI: "#FAC044",
  UNI: "#E9167C",
  AVAX: "#E84142",
  LINK: "#3256D6",
};

export const TOKENS_MAP: { [chainId: number]: { [address: string]: Token } } = {};
export const TOKENS_BY_SYMBOL_MAP: { [chainId: number]: { [symbol: string]: Token } } = {};
export const WRAPPED_TOKENS_MAP: { [chainId: number]: Token } = {};
export const NATIVE_TOKENS_MAP: { [chainId: number]: Token } = {};

const CHAIN_IDS = [
  MAINNET,
  TESTNET,
  ARBITRUM,
  ARBITRUM_TESTNET,
  AVALANCHE,
  AVALANCHE_FUJI,
  SEPOLIA_TESTNET,
  OPTIMISM_GOERLI_TESTNET,
  OPTIMISM_MAINNET,
  BLAST_SEPOLIA_TESTNET,
  MORPH_HOLESKY,
  MORPH_MAINNET,
  OPBNB_TESTNET,
];

for (let j = 0; j < CHAIN_IDS.length; j++) {
  const chainId = CHAIN_IDS[j];
  TOKENS_MAP[chainId] = {};
  TOKENS_BY_SYMBOL_MAP[chainId] = {};
  let tokens = TOKENS[chainId];
  if (ADDITIONAL_TOKENS[chainId]) {
    tokens = tokens.concat(ADDITIONAL_TOKENS[chainId]);
  }

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    TOKENS_MAP[chainId][token.address] = token;
    TOKENS_BY_SYMBOL_MAP[chainId][token.symbol] = token;
  }
}

for (const chainId of CHAIN_IDS) {
  for (const token of TOKENS[chainId]) {
    if (token.isWrapped) {
      WRAPPED_TOKENS_MAP[chainId] = token;
    } else if (token.isNative) {
      NATIVE_TOKENS_MAP[chainId] = token;
    }
  }
}

export function getWrappedToken(chainId: number) {
  return WRAPPED_TOKENS_MAP[chainId];
}

export function getNativeToken(chainId: number) {
  return NATIVE_TOKENS_MAP[chainId];
}

export function getTokens(chainId: number) {
  return TOKENS[chainId];
}

export function isValidToken(chainId: number, address: string) {
  if (!TOKENS_MAP[chainId]) {
    throw new Error(`Incorrect chainId ${chainId}`);
  }
  return address in TOKENS_MAP[chainId];
}

export function getPriceDecimals(chainId: number, tokenSymbol?: string) {
  if (!tokenSymbol) return 2;

  try {
    const token = getTokenBySymbol(chainId, tokenSymbol);
    return token.priceDecimals ?? 2;
  } catch (e) {
    return 2;
  }
}

export function getToken(chainId: number, address: string) {
  if (!TOKENS_MAP[chainId]) {
    throw new Error(`Incorrect chainId ${chainId}`);
  }
  if (!TOKENS_MAP[chainId][address]) {
    throw new Error(`Incorrect address "${address}" for chainId ${chainId}`);
  }
  return TOKENS_MAP[chainId][address];
}

export function getTokenBySymbol(chainId: number, symbol: string) {
  const token = TOKENS_BY_SYMBOL_MAP[chainId][symbol];
  if (!token) {
    throw new Error(`Incorrect symbol "${symbol}" for chainId ${chainId}`);
  }
  return token;
}

export function getWhitelistedTokens(chainId: number) {
  return TOKENS[chainId].filter((token) => token.symbol !== "USDG");
}

export function getVisibleTokens(chainId: number) {
  return getWhitelistedTokens(chainId).filter((token) => !token.isWrapped && !token.isTempHidden);
}

export function getNormalizedTokenSymbol(tokenSymbol) {
  if (["WBTC", "WETH", "WAVAX"].includes(tokenSymbol)) {
    return tokenSymbol.substr(1);
  } else if (tokenSymbol === "BTC.b") {
    return "BTC";
  }
  return tokenSymbol;
}

const AVAILABLE_CHART_TOKENS = {
  [ARBITRUM]: ["ETH", "BTC", "LINK", "UNI"],
  [AVALANCHE]: ["AVAX", "ETH", "BTC"],
  [SEPOLIA_TESTNET]: ["ETH", "BTC", "LINK"],
  [OPTIMISM_GOERLI_TESTNET]: ["ETH", "LINK"],
  [OPTIMISM_MAINNET]: ["ETH", "BTC", "LINK"],
};

export function isChartAvailabeForToken(chainId: number, tokenSymbol: string) {
  const token = getTokenBySymbol(chainId, tokenSymbol);
  if (!token) return false;
  return (token.isStable || AVAILABLE_CHART_TOKENS[chainId]?.includes(getNormalizedTokenSymbol(tokenSymbol))) ?? false;
}
