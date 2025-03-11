import { zeroAddress } from "viem";

import { Token, TokenCategory } from "types/tokens";

import { ARBITRUM, AVALANCHE, AVALANCHE_FUJI } from "./chains";
import { getContract } from "./contracts";

export const NATIVE_TOKEN_ADDRESS = zeroAddress;

export const TOKENS: { [chainId: number]: Token[] } = {
  [ARBITRUM]: [
    {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
      address: zeroAddress,
      isNative: true,
      isShortable: true,
      categories: ["layer1"],
      imageUrl: "https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880",
      coingeckoUrl: "https://www.coingecko.com/en/coins/ethereum",
      isV1Available: true,
    },
    {
      name: "Wrapped Ethereum",
      symbol: "WETH",
      decimals: 18,
      address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
      isWrapped: true,
      baseSymbol: "ETH",
      imageUrl: "https://assets.coingecko.com/coins/images/2518/thumb/weth.png?1628852295",
      coingeckoUrl: "https://www.coingecko.com/en/coins/ethereum",
      isV1Available: true,
    },
    {
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
    },
    {
      name: "Arbitrum",
      symbol: "ARB",
      decimals: 18,
      priceDecimals: 4,
      address: "0x912CE59144191C1204E64559FE8253a0e49E6548",
      categories: ["layer2", "defi"],
      imageUrl: "https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg?1680097630",
      coingeckoUrl: "https://www.coingecko.com/en/coins/arbitrum",
      explorerUrl: "https://arbiscan.io/token/0x912ce59144191c1204e64559fe8253a0e49e6548",
    },
    {
      name: "Wrapped SOL (Wormhole)",
      symbol: "SOL",
      assetSymbol: "WSOL (Wormhole)",
      priceDecimals: 3,
      decimals: 9,
      address: "0x2bcC6D6CdBbDC0a4071e48bb3B969b06B3330c07",
      categories: ["layer1"],
      imageUrl: "https://assets.coingecko.com/coins/images/4128/small/solana.png?1640133422",
      coingeckoUrl: "https://www.coingecko.com/en/coins/solana",
      coingeckoSymbol: "SOL",
      explorerUrl: "https://arbiscan.io/token/0x2bCc6D6CdBbDC0a4071e48bb3B969b06B3330c07",
      explorerSymbol: "SOL",
    },
    {
      name: "Chainlink",
      symbol: "LINK",
      decimals: 18,
      priceDecimals: 4,
      address: "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4",
      isStable: false,
      isShortable: true,
      categories: ["defi"],
      imageUrl: "https://assets.coingecko.com/coins/images/877/thumb/chainlink-new-logo.png?1547034700",
      coingeckoUrl: "https://www.coingecko.com/en/coins/chainlink",
      explorerUrl: "https://arbiscan.io/token/0xf97f4df75117a78c1a5a0dbb814af92458539fb4",
      isV1Available: true,
    },
    {
      name: "Uniswap",
      symbol: "UNI",
      decimals: 18,
      priceDecimals: 4,
      address: "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",
      isStable: false,
      isShortable: true,
      categories: ["layer2", "defi"],
      imageUrl: "https://assets.coingecko.com/coins/images/12504/thumb/uniswap-uni.png?1600306604",
      coingeckoUrl: "https://www.coingecko.com/en/coins/uniswap",
      explorerUrl: "https://arbiscan.io/token/0xfa7f8980b0f1e64a2062791cc3b0871572f1f7f0",
      isV1Available: true,
    },
    {
      name: "Bridged USDC (USDC.e)",
      symbol: "USDC.e",
      decimals: 6,
      address: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
      coingeckoUrl: "https://www.coingecko.com/en/coins/bridged-usdc-arbitrum",
      explorerUrl: "https://arbiscan.io/token/0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
      isV1Available: true,
    },
    {
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      isStable: true,
      isV1Available: true,
      imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
      coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
      explorerUrl: "https://arbiscan.io/address/0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    },
    {
      name: "Tether",
      symbol: "USDT",
      decimals: 6,
      address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/325/thumb/Tether-logo.png?1598003707",
      explorerUrl: "https://arbiscan.io/address/0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
      coingeckoUrl: "https://www.coingecko.com/en/coins/tether",
      isV1Available: true,
    },
    {
      name: "Dai",
      symbol: "DAI",
      decimals: 18,
      address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/9956/thumb/4943.png?1636636734",
      coingeckoUrl: "https://www.coingecko.com/en/coins/dai",
      explorerUrl: "https://arbiscan.io/token/0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
      isV1Available: true,
    },
    {
      name: "Frax",
      symbol: "FRAX",
      decimals: 18,
      address: "0x17FC002b466eEc40DaE837Fc4bE5c67993ddBd6F",
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/13422/small/frax_logo.png?1608476506",
      coingeckoUrl: "https://www.coingecko.com/en/coins/frax",
      explorerUrl: "https://arbiscan.io/token/0x17FC002b466eEc40DaE837Fc4bE5c67993ddBd6F",
      isV1Available: true,
    },
    {
      name: "Magic Internet Money",
      symbol: "MIM",
      decimals: 18,
      address: "0xFEa7a6a0B346362BF88A9e4A88416B77a57D6c2A",
      isStable: true,
      isTempHidden: true,
      imageUrl: "https://assets.coingecko.com/coins/images/16786/small/mimlogopng.png",
      isV1Available: true,
    },
    {
      name: "Bitcoin",
      symbol: "BTC",
      address: "0x47904963fc8b2340414262125aF798B9655E58Cd",
      isSynthetic: true,
      decimals: 8,
      categories: ["layer1"],
      imageUrl: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png?1547033579",
      coingeckoUrl: "https://www.coingecko.com/en/coins/bitcoin",
    },
    {
      name: "Dogecoin",
      symbol: "DOGE",
      decimals: 8,
      priceDecimals: 5,
      address: "0xC4da4c24fd591125c3F47b340b6f4f76111883d8",
      isSynthetic: true,
      categories: ["meme"],
      imageUrl: "https://assets.coingecko.com/coins/images/5/small/dogecoin.png?1547792256",
      coingeckoUrl: "https://www.coingecko.com/en/coins/dogecoin",
    },
    {
      name: "Litecoin",
      symbol: "LTC",
      decimals: 8,
      priceDecimals: 3,
      address: "0xB46A094Bc4B0adBD801E14b9DB95e05E28962764",
      isSynthetic: true,
      categories: ["layer1"],
      imageUrl: "https://assets.coingecko.com/coins/images/2/small/litecoin.png?1547033580",
      coingeckoUrl: "https://www.coingecko.com/en/coins/litecoin",
    },
    {
      name: "XRP",
      symbol: "XRP",
      decimals: 6,
      priceDecimals: 4,
      address: "0xc14e065b0067dE91534e032868f5Ac6ecf2c6868",
      categories: ["layer1"],
      imageUrl: "https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png?1605778731",
      coingeckoUrl: "https://www.coingecko.com/en/coins/xrp",
      isSynthetic: true,
    },
    {
      name: "GMX",
      symbol: "GMX",
      address: getContract(ARBITRUM, "GMX"),
      decimals: 18,
      isPlatformToken: true,
      isPlatformTradingToken: true,
      categories: ["defi"],
      imageUrl: "https://assets.coingecko.com/coins/images/18323/small/arbit.png?1631532468",
      coingeckoUrl: "https://www.coingecko.com/en/coins/gmx",
      explorerUrl: "https://arbiscan.io/address/0xfc5a1a6eb076a2c7ad06ed22c90d7e710e35ad0a",
    },
    {
      name: "Escrowed GMX",
      symbol: "esGMX",
      address: getContract(ARBITRUM, "ES_GMX"),
      decimals: 18,
      isPlatformToken: true,
    },
    {
      name: "Wrapped BNB (LayerZero)",
      symbol: "BNB",
      assetSymbol: "WBNB (LayerZero)",
      address: "0xa9004A5421372E1D83fB1f85b0fc986c912f91f3",
      decimals: 18,
      categories: ["layer1"],
      imageUrl: "https://assets.coingecko.com/coins/images/825/standard/bnb-icon2_2x.png?1696501970",
      coingeckoUrl: "https://www.coingecko.com/en/coins/bnb",
      coingeckoSymbol: "BNB",
      metamaskSymbol: "WBNB",
      explorerUrl: "https://arbiscan.io/token/0xa9004A5421372E1D83fB1f85b0fc986c912f91f3",
      explorerSymbol: "WBNB",
    },
    {
      name: "Cosmos",
      symbol: "ATOM",
      assetSymbol: "ATOM",
      priceDecimals: 4,
      address: "0x7D7F1765aCbaF847b9A1f7137FE8Ed4931FbfEbA",
      decimals: 6,
      categories: ["layer1"],
      imageUrl: "https://assets.coingecko.com/coins/images/1481/standard/cosmos_hub.png?1696502525",
      coingeckoUrl: "https://www.coingecko.com/en/coins/cosmos-hub",
      coingeckoSymbol: "ATOM",
      isSynthetic: true,
    },
    {
      name: "Near",
      symbol: "NEAR",
      assetSymbol: "NEAR",
      priceDecimals: 4,
      address: "0x1FF7F3EFBb9481Cbd7db4F932cBCD4467144237C",
      decimals: 24,
      categories: ["layer1"],
      imageUrl: "https://assets.coingecko.com/coins/images/10365/standard/near.jpg?1696510367",
      coingeckoUrl: "https://www.coingecko.com/en/coins/near",
      coingeckoSymbol: "NEAR",
      isSynthetic: true,
    },
    {
      name: "Aave",
      symbol: "AAVE",
      assetSymbol: "AAVE",
      priceDecimals: 3,
      address: "0xba5DdD1f9d7F570dc94a51479a000E3BCE967196",
      decimals: 18,
      categories: ["defi"],
      imageUrl: "https://assets.coingecko.com/coins/images/12645/standard/AAVE.png?1696512452",
      coingeckoUrl: "https://www.coingecko.com/en/coins/aave",
      coingeckoSymbol: "AAVE",
    },
    {
      name: "Wrapped AVAX (Wormhole)",
      symbol: "AVAX",
      assetSymbol: "WAVAX (Wormhole)",
      priceDecimals: 4,
      address: "0x565609fAF65B92F7be02468acF86f8979423e514",
      decimals: 18,
      categories: ["layer1"],
      imageUrl: "https://assets.coingecko.com/coins/images/12559/small/coin-round-red.png?1604021818",
      coingeckoUrl: "https://www.coingecko.com/en/coins/avalanche",
      coingeckoSymbol: "AVAX",
      explorerSymbol: "WAVAX",
    },
    {
      name: "Optimism",
      symbol: "OP",
      priceDecimals: 4,
      address: "0xaC800FD6159c2a2CB8fC31EF74621eB430287a5A",
      decimals: 18,
      categories: ["layer2"],
      imageUrl: "https://assets.coingecko.com/coins/images/25244/standard/Optimism.png?1696524385",
      coingeckoUrl: "https://www.coingecko.com/en/coins/optimism",
    },
    {
      name: "Pepe",
      symbol: "PEPE",
      address: "0x25d887Ce7a35172C62FeBFD67a1856F20FaEbB00",
      decimals: 18,
      priceDecimals: 8,
      categories: ["meme"],
      imageUrl: "https://assets.coingecko.com/coins/images/29850/standard/pepe-token.jpeg?1696528776",
      coingeckoUrl: "https://www.coingecko.com/en/coins/pepe",
      visualMultiplier: 1000,
      visualPrefix: "k",
    },
    {
      name: "dogwifhat",
      symbol: "WIF",
      address: "0xA1b91fe9FD52141Ff8cac388Ce3F10BFDc1dE79d",
      decimals: 6,
      categories: ["meme"],
      imageUrl: "https://assets.coingecko.com/coins/images/33566/standard/dogwifhat.jpg?1702499428",
      coingeckoUrl: "https://www.coingecko.com/en/coins/dogwifhat",
    },
    {
      name: "ORDI",
      symbol: "ORDI",
      address: "0x1E15d08f3CA46853B692EE28AE9C7a0b88a9c994",
      decimals: 18,
      categories: ["defi"],
      imageUrl: "https://assets.coingecko.com/coins/images/30162/standard/ordi.png?1696529082",
      coingeckoUrl: "https://www.coingecko.com/en/coins/ordi",
      isSynthetic: true,
    },
    {
      name: "Stacks",
      symbol: "STX",
      address: "0xBaf07cF91D413C0aCB2b7444B9Bf13b4e03c9D71",
      decimals: 6,
      categories: ["layer2"],
      imageUrl: "https://assets.coingecko.com/coins/images/2069/standard/Stacks_Logo_png.png?1709979332",
      coingeckoUrl: "https://www.coingecko.com/en/coins/stacks",
      isSynthetic: true,
    },
    {
      name: "Ethena USDe",
      symbol: "USDe",
      address: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34",
      decimals: 18,
      imageUrl: "https://assets.coingecko.com/coins/images/33613/standard/USDE.png?1716355685",
      coingeckoUrl: "https://www.coingecko.com/en/coins/ethena-usde",
      isStable: true,
    },
    {
      name: "Wrapped stETH",
      symbol: "wstETH",
      address: "0x5979D7b546E38E414F7E9822514be443A4800529",
      decimals: 18,
      imageUrl: "https://assets.coingecko.com/coins/images/18834/standard/wstETH.png?1696518295",
      coingeckoUrl: "https://www.coingecko.com/en/coins/wrapped-steth",
    },
    {
      name: "Shiba Inu",
      symbol: "SHIB",
      assetSymbol: "SHIB",
      address: "0x3E57D02f9d196873e55727382974b02EdebE6bfd",
      decimals: 18,
      priceDecimals: 9,
      categories: ["meme"],
      imageUrl: "https://assets.coingecko.com/coins/images/11939/standard/shiba.png?1696511800",
      coingeckoUrl: "https://www.coingecko.com/en/coins/shiba-inu",
      isSynthetic: true,
      visualMultiplier: 1000,
      visualPrefix: "k",
    },
    {
      name: "tBTC",
      symbol: "tBTC",
      address: "0x6c84a8f1c29108F47a79964b5Fe888D4f4D0dE40",
      decimals: 18,
      imageUrl:
        "https://assets.coingecko.com/coins/images/11224/standard/0x18084fba666a33d37592fa2633fd49a74dd93a88.png?1696511155",
      coingeckoUrl: "https://www.coingecko.com/en/coins/tbtc",
    },
    {
      name: "Eigen",
      symbol: "EIGEN",
      address: "0x606C3e5075e5555e79Aa15F1E9FACB776F96C248",
      decimals: 18,
      categories: ["layer2"],
      imageUrl: "https://assets.coingecko.com/coins/images/37441/standard/eigen.jpg?1728023974",
      coingeckoUrl: "https://www.coingecko.com/en/coins/eigenlayer",
    },
    {
      name: "Sats",
      symbol: "SATS",
      address: "0x2cD2eB61D17b78239Fcd19aafF72981B5D5eF319",
      decimals: 6,
      priceDecimals: 11,
      categories: ["meme"],
      imageUrl: "https://assets.coingecko.com/coins/images/30666/standard/_dD8qr3M_400x400.png?1702913020",
      coingeckoUrl: "https://www.coingecko.com/en/coins/sats-ordinals",
      isSynthetic: true,
      visualMultiplier: 1000_000,
      visualPrefix: "m",
    },
    {
      name: "Polygon",
      symbol: "POL",
      decimals: 18,
      priceDecimals: 5,
      address: "0x9c74772b713a1B032aEB173E28683D937E51921c",
      categories: ["layer1", "layer2"],
      imageUrl: "https://assets.coingecko.com/coins/images/32440/standard/polygon.png?1698233684",
      coingeckoUrl: "https://www.coingecko.com/en/coins/polygon",
      isSynthetic: true,
    },
    {
      name: "APE",
      symbol: "APE",
      address: "0x7f9FBf9bDd3F4105C478b996B648FE6e828a1e98",
      decimals: 18,
      priceDecimals: 4,
      imageUrl: "https://assets.coingecko.com/coins/images/24383/standard/apecoin.jpg?1696523566",
      coingeckoUrl: "https://www.coingecko.com/en/coins/apecoin",
    },
    {
      name: "SUI",
      symbol: "SUI",
      address: "0x197aa2DE1313c7AD50184234490E12409B2a1f95",
      decimals: 9,
      priceDecimals: 4,
      categories: ["layer1"],
      imageUrl: "https://assets.coingecko.com/coins/images/26375/standard/sui-ocean-square.png?1727791290",
      coingeckoUrl: "https://www.coingecko.com/en/coins/sui",
      isSynthetic: true,
    },
    {
      name: "SEI",
      symbol: "SEI",
      address: "0x55e85A147a1029b985384822c0B2262dF8023452",
      decimals: 18,
      priceDecimals: 5,
      categories: ["layer1"],
      imageUrl: "https://assets.coingecko.com/coins/images/28205/standard/Sei_Logo_-_Transparent.png?1696527207",
      coingeckoUrl: "https://www.coingecko.com/en/coins/sei",
      isSynthetic: true,
    },
    {
      name: "APT",
      symbol: "APT",
      address: "0x3f8f0dCE4dCE4d0D1d0871941e79CDA82cA50d0B",
      decimals: 8,
      priceDecimals: 4,
      categories: ["layer1"],
      imageUrl: "https://assets.coingecko.com/coins/images/26455/standard/aptos_round.png?1696525528",
      coingeckoUrl: "https://www.coingecko.com/en/coins/aptos",
      isSynthetic: true,
    },
    {
      name: "TIA",
      symbol: "TIA",
      address: "0x38676f62d166f5CE7De8433F51c6B3D6D9d66C19",
      decimals: 6,
      priceDecimals: 4,
      categories: ["layer1"],
      imageUrl: "https://assets.coingecko.com/coins/images/31967/standard/tia.jpg?1696530772",
      coingeckoUrl: "https://www.coingecko.com/en/coins/celestia",
      isSynthetic: true,
    },
    {
      name: "TRON",
      symbol: "TRX",
      address: "0xb06aa7E4af937C130dDade66f6ed7642716fe07A",
      decimals: 6,
      priceDecimals: 5,
      categories: ["layer1"],
      imageUrl: "https://assets.coingecko.com/coins/images/1094/standard/tron-logo.png?1696502193",
      coingeckoUrl: "https://www.coingecko.com/en/coins/tron",
      isSynthetic: true,
    },
    {
      name: "TON",
      symbol: "TON",
      address: "0xB2f7cefaeEb08Aa347705ac829a7b8bE2FB560f3",
      decimals: 9,
      priceDecimals: 4,
      categories: ["layer1"],
      imageUrl: "https://assets.coingecko.com/coins/images/17980/standard/photo_2024-09-10_17.09.00.jpeg?1725963446",
      coingeckoUrl: "https://www.coingecko.com/en/coins/toncoin",
      isSynthetic: true,
    },
    {
      name: "WLD",
      symbol: "WLD",
      address: "0x75B9AdD873641b253718810E6c65dB6d72311FD0",
      decimals: 18,
      priceDecimals: 4,
      imageUrl: "https://assets.coingecko.com/coins/images/31069/standard/worldcoin.jpeg?1696529903",
      coingeckoUrl: "https://www.coingecko.com/en/coins/worldcoin",
      isSynthetic: true,
    },
    {
      name: "BONK",
      symbol: "BONK",
      address: "0x1FD10E767187A92f0AB2ABDEEF4505e319cA06B2",
      decimals: 5,
      priceDecimals: 9,
      categories: ["meme"],
      imageUrl: "https://assets.coingecko.com/coins/images/28600/standard/bonk.jpg?1696527587",
      coingeckoUrl: "https://www.coingecko.com/en/coins/bonk",
      isSynthetic: true,
      visualMultiplier: 1000,
      visualPrefix: "k",
    },
    {
      name: "TAO",
      symbol: "TAO",
      address: "0x938aef36CAaFbcB37815251B602168087eC14648",
      decimals: 9,
      priceDecimals: 3,
      imageUrl: "https://assets.coingecko.com/coins/images/28452/standard/ARUsPeNQ_400x400.jpeg?1696527447",
      coingeckoUrl: "https://www.coingecko.com/en/coins/bittensor",
      isSynthetic: true,
    },
    {
      name: "BOME",
      symbol: "BOME",
      address: "0x3Eea56A1ccCdbfB70A26aD381C71Ee17E4c8A15F",
      decimals: 6,
      priceDecimals: 6,
      categories: ["meme"],
      imageUrl: "https://assets.coingecko.com/coins/images/36071/standard/bome.png?1710407255",
      coingeckoUrl: "https://www.coingecko.com/en/coins/book-of-meme",
      isSynthetic: true,
    },
    {
      name: "FLOKI",
      symbol: "FLOKI",
      address: "0x6792c5B8962ffbDD020c6b6FD0Be7b182e0e33a3",
      decimals: 9,
      priceDecimals: 8,
      categories: ["meme"],
      imageUrl: "https://assets.coingecko.com/coins/images/16746/standard/PNG_image.png?1696516318",
      coingeckoUrl: "https://www.coingecko.com/en/coins/floki",
      isSynthetic: true,
      visualMultiplier: 1000,
      visualPrefix: "k",
    },
    {
      name: "MEME",
      symbol: "MEME",
      address: "0xaF770F03518686a365300ab35AD860e99967B2f0",
      decimals: 18,
      priceDecimals: 6,
      imageUrl: "https://assets.coingecko.com/coins/images/32528/standard/memecoin_%282%29.png?1698912168",
      coingeckoUrl: "https://www.coingecko.com/en/coins/meme",
      isSynthetic: true,
    },
    {
      name: "MEW",
      symbol: "MEW",
      address: "0x5503CF72f54b6d692d36BBCD391516A7dE068687",
      decimals: 5,
      priceDecimals: 7,
      categories: ["meme"],
      imageUrl: "https://assets.coingecko.com/coins/images/36440/standard/MEW.png?1711442286",
      coingeckoUrl: "https://www.coingecko.com/en/coins/mew",
      isSynthetic: true,
    },
    {
      name: "PENDLE",
      symbol: "PENDLE",
      address: "0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8",
      decimals: 18,
      priceDecimals: 4,
      categories: ["defi"],
      imageUrl: "https://assets.coingecko.com/coins/images/15069/standard/Pendle_Logo_Normal-03.png?1696514728",
      coingeckoUrl: "https://www.coingecko.com/en/coins/pendle",
    },
    {
      name: "ADA",
      symbol: "ADA",
      address: "0x53186c8419BEB83fE4Da74F7875041a1287337ED",
      decimals: 6,
      priceDecimals: 4,
      categories: ["layer1"],
      imageUrl: "https://assets.coingecko.com/coins/images/975/standard/cardano.png?1696502090",
      coingeckoUrl: "https://www.coingecko.com/en/coins/cardano",
      isSynthetic: true,
    },
    {
      name: "BCH",
      symbol: "BCH",
      address: "0xc33D9C096e74aa4f571E9417b69a19C4A1e72ef2",
      decimals: 8,
      priceDecimals: 3,
      categories: ["layer1"],
      imageUrl: "https://assets.coingecko.com/coins/images/780/standard/bitcoin-cash-circle.png?1696501932",
      coingeckoUrl: "https://www.coingecko.com/en/coins/bitcoin-cash",
      isSynthetic: true,
    },
    {
      name: "DOT",
      symbol: "DOT",
      address: "0xE958f107b467d5172573F761d26931D658C1b436",
      decimals: 10,
      priceDecimals: 4,
      categories: ["layer1"],
      imageUrl:
        "https://static.coingecko.com/s/polkadot-73b0c058cae10a2f076a82dcade5cbe38601fad05d5e6211188f09eb96fa4617.gif",
      coingeckoUrl: "https://www.coingecko.com/en/coins/polkadot",
      isSynthetic: true,
    },
    {
      name: "ICP",
      symbol: "ICP",
      address: "0xdaf0A71608938F762e37eC5F72F670Cc44703454",
      decimals: 8,
      priceDecimals: 4,
      categories: ["layer1"],
      imageUrl: "https://assets.coingecko.com/coins/images/14495/standard/Internet_Computer_logo.png?1696514180",
      coingeckoUrl: "https://www.coingecko.com/en/coins/internet-computer",
      isSynthetic: true,
    },
    {
      name: "XLM",
      symbol: "XLM",
      address: "0xc5dbD52Ae5a927Cf585B884011d0C7631C9974c6",
      decimals: 7,
      priceDecimals: 5,
      imageUrl: "https://assets.coingecko.com/coins/images/100/standard/Stellar_symbol_black_RGB.png?1696501482",
      coingeckoUrl: "https://www.coingecko.com/en/coins/stellar",
      isSynthetic: true,
    },
    {
      name: "RENDER",
      symbol: "RENDER",
      address: "0x82BB89fcc64c5d4016C5Ed1AB016bB0D1C20D6C3",
      decimals: 18,
      priceDecimals: 4,
      imageUrl: "https://assets.coingecko.com/coins/images/11636/standard/rndr.png?1696511529",
      coingeckoUrl: "https://www.coingecko.com/en/coins/render",
      isSynthetic: true,
    },
    {
      name: "Filecoin",
      symbol: "FIL",
      address: "0x3AeBb98f57081DcBEb0B8EA823Cf84900A31e5D8",
      decimals: 18,
      categories: ["layer1"],
      priceDecimals: 4,
      imageUrl: "https://assets.coingecko.com/coins/images/12817/standard/filecoin.png?1696512609",
      coingeckoUrl: "https://www.coingecko.com/en/coins/filecoin",
      isSynthetic: true,
    },
    {
      name: "dYdX",
      symbol: "DYDX",
      address: "0x0739Ad7AeA69aD36EdEb91b0e55cAC140427c632",
      decimals: 18,
      priceDecimals: 4,
      categories: ["layer1", "defi"],
      imageUrl: "https://assets.coingecko.com/coins/images/32594/standard/dydx.png?1698673495",
      coingeckoUrl: "https://www.coingecko.com/en/coins/dydx-chain",
      isSynthetic: true,
    },
    {
      name: "Injective",
      symbol: "INJ",
      address: "0xfdE73EddbE6c5712A12B72c470F8FE5c77A7fF17",
      decimals: 18,
      priceDecimals: 4,
      categories: ["layer1"],
      imageUrl: "https://assets.coingecko.com/coins/images/12882/standard/Secondary_Symbol.png?1696512670",
      coingeckoUrl: "https://www.coingecko.com/en/coins/injective",
      isSynthetic: true,
    },
    {
      name: "Official Trump",
      symbol: "TRUMP",
      address: "0x30021aFA4767Ad66aA52A06dF8a5AB3acA9371fD",
      decimals: 6,
      priceDecimals: 4,
      categories: ["meme"],
      imageUrl: "https://assets.coingecko.com/coins/images/53746/standard/trump.png?1737171561",
      coingeckoUrl: "https://www.coingecko.com/en/coins/official-trump",
      isSynthetic: true,
    },
    {
      name: "Melania Meme",
      symbol: "MELANIA",
      address: "0xfa4F8E582214eBCe1A08eB2a65e08082053E441F",
      decimals: 6,
      priceDecimals: 4,
      categories: ["meme"],
      imageUrl: "https://assets.coingecko.com/coins/images/53775/standard/melania-meme.png?1737329885",
      coingeckoUrl: "https://www.coingecko.com/en/coins/melania-meme",
      isSynthetic: true,
    },
    {
      name: "Ethena Governance Token",
      symbol: "ENA",
      address: "0xfe1Aac2CD9C5cC77b58EeCfE75981866ed0c8b7a",
      decimals: 18,
      priceDecimals: 4,
      categories: ["defi"],
      imageUrl: "https://assets.coingecko.com/coins/images/36530/standard/ethena.png?1711701436",
      coingeckoUrl: "https://www.coingecko.com/en/coins/ethena",
      isSynthetic: true,
    },
    {
      name: "ai16z",
      symbol: "AI16Z",
      address: "0xBb69bd9dc152C2c0F083507641a46193d2B61EBb",
      decimals: 9,
      priceDecimals: 5,
      categories: ["meme"],
      imageUrl: "https://assets.coingecko.com/coins/images/51090/standard/AI16Z.jpg?1730027175",
      coingeckoUrl: "https://www.coingecko.com/en/coins/ai16z",
      isSynthetic: true,
    },
    {
      name: "Animecoin",
      symbol: "ANIME",
      address: "0x37a645648dF29205C6261289983FB04ECD70b4B3",
      decimals: 18,
      priceDecimals: 6,
      categories: ["meme"],
      imageUrl: "https://assets.coingecko.com/coins/images/53575/standard/anime.jpg?1736748703",
      coingeckoUrl: "https://www.coingecko.com/en/coins/anime",
      isSynthetic: false,
    },
    {
      name: "Fartcoin",
      symbol: "FARTCOIN",
      address: "0xaca341E61aB6177B0b0Df46a612e4311F8a7605f",
      decimals: 6,
      priceDecimals: 4,
      categories: ["meme"],
      imageUrl: "https://assets.coingecko.com/coins/images/50891/standard/fart.jpg?1729503972",
      coingeckoUrl: "https://www.coingecko.com/en/coins/fartcoin",
      isSynthetic: true,
    },
    {
      name: "Berachain",
      symbol: "BERA",
      address: "0x67ADABbAd211eA9b3B4E2fd0FD165E593De1e983",
      decimals: 18,
      priceDecimals: 4,
      categories: ["layer1", "defi"],
      imageUrl: "https://assets.coingecko.com/coins/images/25235/standard/BERA.png?1738822008",
      coingeckoUrl: "https://www.coingecko.com/en/coins/berachain",
      isSynthetic: true,
    },
    {
      name: "Lido DAO",
      symbol: "LDO",
      address: "0x9D678B4Dd38a6E01df8090aEB7974aD71142b05f",
      decimals: 18,
      priceDecimals: 4,
      categories: ["defi"],
      imageUrl: "https://assets.coingecko.com/coins/images/13573/standard/Lido_DAO.png?1696513326",
      coingeckoUrl: "https://www.coingecko.com/en/coins/lido-dao",
      isSynthetic: true,
    },
    {
      name: "Virtuals Protocol",
      symbol: "VIRTUAL",
      address: "0xB6672496214C90134A9223894e709F26A5eED362",
      decimals: 18,
      priceDecimals: 4,
      imageUrl: "https://assets.coingecko.com/coins/images/34057/standard/LOGOMARK.png?1708356054",
      coingeckoUrl: "https://www.coingecko.com/en/coins/virtual-protocol",
      isSynthetic: true,
    },
    {
      name: "Pudgy Penguins",
      symbol: "PENGU",
      address: "0x4C1dac9b6eAf122Fe3DE824c1C2220413F3aC197",
      decimals: 6,
      priceDecimals: 7,
      categories: ["meme"],
      imageUrl: "https://assets.coingecko.com/coins/images/52622/standard/PUDGY_PENGUINS_PENGU_PFP.png?1733809110",
      coingeckoUrl: "https://www.coingecko.com/en/coins/pudgy-penguins",
      isSynthetic: true,
    },
    {
      name: "Artificial Superintelligence Alliance",
      symbol: "FET",
      address: "0x83D5944E7f5EF1d8432002d3cb062e1012f6F8e6",
      decimals: 18,
      priceDecimals: 5,
      imageUrl: "https://assets.coingecko.com/coins/images/5681/standard/ASI.png?1719827289",
      coingeckoUrl: "https://www.coingecko.com/en/coins/artificial-superintelligence-alliance",
      isSynthetic: true,
    },
    {
      name: "Ondo",
      symbol: "ONDO",
      address: "0xEcFB4718aD19b626A77491895a2f99ea0cedEd08",
      decimals: 18,
      priceDecimals: 4,
      categories: ["defi"],
      imageUrl: "https://assets.coingecko.com/coins/images/26580/standard/ONDO.png?1696525656",
      coingeckoUrl: "https://www.coingecko.com/en/coins/ondo",
      isSynthetic: true,
    },
    {
      name: "AIXBT",
      symbol: "AIXBT",
      address: "0xcA543Cb8bCC76e4E0A034F56EB40a1029bDFd70E",
      decimals: 18,
      priceDecimals: 4,
      categories: ["meme"],
      imageUrl: "https://assets.coingecko.com/coins/images/51784/standard/3.png?1731981138",
      coingeckoUrl: "https://www.coingecko.com/en/coins/ondo",
      isSynthetic: true,
    },
    {
      name: "Sonic",
      symbol: "S",
      address: "0x8F6cCb99d4Fd0B4095915147b5ae3bbDb8075394",
      decimals: 18,
      priceDecimals: 5,
      categories: ["layer1"],
      imageUrl: "https://assets.coingecko.com/coins/images/38108/standard/200x200_Sonic_Logo.png?1734679256",
      coingeckoUrl: "https://www.coingecko.com/en/coins/sonic",
      isSynthetic: true,
    },
    {
      name: "pancakeswap",
      symbol: "CAKE",
      address: "0x580b373Ac16803BB0133356F470f3c7EEF54151B",
      decimals: 18,
      priceDecimals: 5,
      categories: ["defi"],
      imageUrl: "https://assets.coingecko.com/coins/images/12632/standard/pancakeswap-cake-logo_%281%29.png?1696512440",
      coingeckoUrl: "https://www.coingecko.com/en/coins/pancakeswap",
      isSynthetic: true,
    },
    {
      name: "Hyperliquid",
      symbol: "HYPE",
      address: "0xfDFA0A749dA3bCcee20aE0B4AD50E39B26F58f7C",
      decimals: 8,
      priceDecimals: 4,
      categories: ["defi"],
      imageUrl: "https://assets.coingecko.com/coins/images/50882/standard/hyperliquid.jpg?1729431300",
      coingeckoUrl: "https://www.coingecko.com/en/coins/hyperliquid",
      isSynthetic: true,
    },
    {
      name: "Jupiter",
      symbol: "JUP",
      address: "0xfEd500Df379427Fbc48BDaf3b511b519c7eCCD26",
      decimals: 6,
      priceDecimals: 5,
      categories: ["defi"],
      imageUrl: "https://assets.coingecko.com/coins/images/34188/standard/jup.png?1704266489",
      coingeckoUrl: "https://www.coingecko.com/en/coins/jupiter",
      isSynthetic: true,
    },
    {
      name: "GMX LP",
      symbol: "GLP",
      address: getContract(ARBITRUM, "GLP"),
      decimals: 18,
      imageUrl: "https://github.com/gmx-io/gmx-assets/blob/main/GMX-Assets/PNG/GLP_LOGO%20ONLY.png?raw=true",
      reservesUrl: "https://portfolio.nansen.ai/dashboard/gmx?chain=ARBITRUM",
      isPlatformToken: true,
    },
    /** Placeholder tokens */
    {
      name: "GMX Market tokens",
      symbol: "GM",
      address: "<market-token-address>",
      decimals: 18,
      imageUrl: "https://raw.githubusercontent.com/gmx-io/gmx-assets/main/GMX-Assets/PNG/GM_LOGO.png",
      isPlatformToken: true,
    },
    {
      name: "GLV Market tokens",
      symbol: "GLV",
      address: "<market-token-address>",
      decimals: 18,
      imageUrl: "https://raw.githubusercontent.com/gmx-io/gmx-assets/main/GMX-Assets/PNG/GLV_LOGO.png",
      isPlatformToken: true,
    },
  ],
  [AVALANCHE]: [
    {
      name: "Avalanche",
      symbol: "AVAX",
      decimals: 18,
      address: zeroAddress,
      isNative: true,
      isShortable: true,
      categories: ["layer1"],
      imageUrl: "https://assets.coingecko.com/coins/images/12559/small/coin-round-red.png?1604021818",
      coingeckoUrl: "https://www.coingecko.com/en/coins/avalanche",
      isV1Available: true,
    },
    {
      name: "Wrapped AVAX",
      symbol: "WAVAX",
      decimals: 18,
      address: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
      isWrapped: true,
      baseSymbol: "AVAX",
      categories: ["layer1"],
      imageUrl: "https://assets.coingecko.com/coins/images/12559/small/coin-round-red.png?1604021818",
      coingeckoUrl: "https://www.coingecko.com/en/coins/avalanche",
      explorerUrl: "https://snowtrace.io/address/0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
      isV1Available: true,
    },
    {
      name: "Ethereum (WETH.e)",
      symbol: "ETH",
      assetSymbol: "WETH.e",
      address: "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB",
      decimals: 18,
      isShortable: true,
      categories: ["layer1"],
      imageUrl: "https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880",
      coingeckoUrl: "https://www.coingecko.com/en/coins/weth",
      coingeckoSymbol: "WETH",
      explorerUrl: "https://snowtrace.io/address/0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB",
      isV1Available: true,
    },
    {
      name: "Bitcoin (BTC.b)",
      symbol: "BTC",
      assetSymbol: "BTC.b",
      address: "0x152b9d0FdC40C096757F570A51E494bd4b943E50",
      decimals: 8,
      isShortable: true,
      categories: ["layer1"],
      imageUrl: "https://assets.coingecko.com/coins/images/26115/thumb/btcb.png?1655921693",
      coingeckoUrl: "https://www.coingecko.com/en/coins/bitcoin-avalanche-bridged-btc-b",
      explorerUrl: "https://snowtrace.io/address/0x152b9d0FdC40C096757F570A51E494bd4b943E50",
      isV1Available: true,
    },
    {
      name: "Bitcoin (WBTC.e)",
      symbol: "WBTC",
      assetSymbol: "WBTC.e",
      address: "0x50b7545627a5162F82A992c33b87aDc75187B218",
      decimals: 8,
      isShortable: true,
      categories: ["layer1"],
      imageUrl: "https://assets.coingecko.com/coins/images/7598/thumb/wrapped_bitcoin_wbtc.png?1548822744",
      coingeckoUrl: "https://www.coingecko.com/en/coins/wrapped-bitcoin",
      coingeckoSymbol: "WBTC",
      explorerUrl: "https://snowtrace.io/address/0x50b7545627a5162F82A992c33b87aDc75187B218",
      isV1Available: true,
    },
    {
      name: "USD Coin",
      symbol: "USDC",
      address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
      decimals: 6,
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
      coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
      explorerUrl: "https://snowtrace.io/address/0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
      isV1Available: true,
    },
    {
      name: "Bridged USDC (USDC.e)",
      symbol: "USDC.e",
      address: "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664",
      decimals: 6,
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
      coingeckoUrl: "https://www.coingecko.com/en/coins/bridged-usdc-avalanche-bridge",
      explorerUrl: "https://snowtrace.io/address/0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664",
      isV1Available: true,
    },
    {
      name: "Tether",
      symbol: "USDT",
      decimals: 6,
      address: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/325/small/Tether-logo.png",
      coingeckoUrl: "https://www.coingecko.com/en/coins/tether",
      explorerUrl: "https://snowtrace.io/address/0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
    },
    {
      name: "Tether",
      symbol: "USDT.e",
      decimals: 6,
      address: "0xc7198437980c041c805A1EDcbA50c1Ce5db95118",
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/325/small/Tether-logo.png",
      coingeckoUrl: "https://www.coingecko.com/en/coins/tether",
      explorerUrl: "https://snowtrace.io/address/0xc7198437980c041c805A1EDcbA50c1Ce5db95118",
    },
    {
      name: "Dai",
      symbol: "DAI.e",
      address: "0xd586E7F844cEa2F87f50152665BCbc2C279D8d70",
      decimals: 18,
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/9956/thumb/4943.png?1636636734",
      coingeckoUrl: "https://www.coingecko.com/en/coins/dai",
      explorerUrl: "https://snowtrace.io/address/0xd586E7F844cEa2F87f50152665BCbc2C279D8d70",
    },
    {
      name: "Magic Internet Money",
      symbol: "MIM",
      address: "0x130966628846BFd36ff31a822705796e8cb8C18D",
      decimals: 18,
      isStable: true,
      isTempHidden: true,
      imageUrl: "https://assets.coingecko.com/coins/images/16786/small/mimlogopng.png",
      coingeckoUrl: "https://www.coingecko.com/en/coins/magic-internet-money",
      explorerUrl: "https://snowtrace.io/address/0x130966628846BFd36ff31a822705796e8cb8C18D",
      isV1Available: true,
    },
    {
      name: "Chainlink",
      symbol: "LINK",
      decimals: 18,
      priceDecimals: 4,
      address: "0x5947BB275c521040051D82396192181b413227A3",
      isStable: false,
      isShortable: true,
      categories: ["defi"],
      imageUrl: "https://assets.coingecko.com/coins/images/877/thumb/chainlink-new-logo.png?1547034700",
      coingeckoUrl: "https://www.coingecko.com/en/coins/chainlink",
      explorerUrl: "https://snowtrace.io/address/0x5947BB275c521040051D82396192181b413227A3",
    },
    {
      name: "Dogecoin",
      symbol: "DOGE",
      decimals: 8,
      priceDecimals: 5,
      address: "0xC301E6fe31062C557aEE806cc6A841aE989A3ac6",
      isSynthetic: true,
      categories: ["meme"],
      imageUrl: "https://assets.coingecko.com/coins/images/5/small/dogecoin.png?1547792256",
      coingeckoUrl: "https://www.coingecko.com/en/coins/dogecoin",
    },
    {
      name: "Litecoin",
      symbol: "LTC",
      decimals: 8,
      priceDecimals: 3,
      address: "0x8E9C35235C38C44b5a53B56A41eaf6dB9a430cD6",
      isSynthetic: true,
      categories: ["layer1"],
      imageUrl: "https://assets.coingecko.com/coins/images/2/small/litecoin.png?1547033580",
      coingeckoUrl: "https://www.coingecko.com/en/coins/litecoin",
    },
    {
      name: "Wrapped SOL (Wormhole)",
      symbol: "SOL",
      assetSymbol: "WSOL (Wormhole)",
      priceDecimals: 3,
      decimals: 9,
      address: "0xFE6B19286885a4F7F55AdAD09C3Cd1f906D2478F",
      categories: ["layer1"],
      imageUrl: "https://assets.coingecko.com/coins/images/4128/small/solana.png?1640133422",
      coingeckoUrl: "https://www.coingecko.com/en/coins/solana",
      coingeckoSymbol: "SOL",
      explorerUrl: "https://snowtrace.io/address/0xFE6B19286885a4F7F55AdAD09C3Cd1f906D2478F",
    },
    {
      name: "XRP",
      symbol: "XRP",
      decimals: 6,
      priceDecimals: 5,
      address: "0x34B2885D617cE2ddeD4F60cCB49809fc17bb58Af",
      categories: ["layer1"],
      imageUrl: "https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png?1605778731",
      coingeckoUrl: "https://www.coingecko.com/en/coins/xrp",
      isSynthetic: true,
    },
    {
      name: "GMX",
      symbol: "GMX",
      address: getContract(AVALANCHE, "GMX"),
      decimals: 18,
      imageUrl: "https://assets.coingecko.com/coins/images/18323/small/arbit.png?1631532468",
      isPlatformToken: true,
      categories: ["defi"],
      coingeckoUrl: "https://www.coingecko.com/en/coins/gmx",
      explorerUrl: "https://snowtrace.io/address/0x62edc0692bd897d2295872a9ffcac5425011c661",
    },
    {
      name: "Official Trump",
      symbol: "TRUMP",
      address: "0x2f6d7be53fab5538065a226BA091015d422a7528",
      decimals: 6,
      priceDecimals: 4,
      categories: ["meme"],
      imageUrl: "https://assets.coingecko.com/coins/images/53746/standard/trump.png?1737171561",
      coingeckoUrl: "https://www.coingecko.com/en/coins/official-trump",
      isSynthetic: true,
    },
    {
      name: "Melania Meme",
      symbol: "MELANIA",
      address: "0xd42C991a4FAb293C57a7bf25C2E2ec5aE1dB1714",
      decimals: 6,
      priceDecimals: 4,
      categories: ["meme"],
      imageUrl: "https://assets.coingecko.com/coins/images/53775/standard/melania-meme.png?1737329885",
      coingeckoUrl: "https://www.coingecko.com/en/coins/melania-meme",
      isSynthetic: true,
    },
    {
      name: "Escrowed GMX",
      symbol: "esGMX",
      address: getContract(AVALANCHE, "ES_GMX"),
      decimals: 18,
      isPlatformToken: true,
    },
    {
      name: "GMX LP",
      symbol: "GLP",
      address: getContract(AVALANCHE, "GLP"),
      decimals: 18,
      isPlatformToken: true,
      imageUrl: "https://github.com/gmx-io/gmx-assets/blob/main/GMX-Assets/PNG/GLP_LOGO%20ONLY.png?raw=true",
      explorerUrl: "https://snowtrace.io/address/0x9e295B5B976a184B14aD8cd72413aD846C299660",
      reservesUrl: "https://portfolio.nansen.ai/dashboard/gmx?chain=AVAX",
    },
    /** Placeholder tokens */
    {
      name: "GMX Market tokens",
      symbol: "GM",
      address: "<market-token-address>",
      decimals: 18,
      imageUrl: "https://raw.githubusercontent.com/gmx-io/gmx-assets/main/GMX-Assets/PNG/GM_LOGO.png",
      isPlatformToken: true,
    },
    {
      name: "GLV Market tokens",
      symbol: "GLV",
      address: "<market-token-address>",
      decimals: 18,
      imageUrl: "https://raw.githubusercontent.com/gmx-io/gmx-assets/main/GMX-Assets/PNG/GLV_LOGO.png",
      isPlatformToken: true,
    },
  ],
  [AVALANCHE_FUJI]: [
    {
      name: "Avalanche",
      symbol: "AVAX",
      priceDecimals: 3,
      decimals: 18,
      address: zeroAddress,
      isNative: true,
      isShortable: true,
      categories: ["layer1"],
      imageUrl: "https://assets.coingecko.com/coins/images/12559/small/coin-round-red.png?1604021818",
    },
    {
      name: "Wrapped AVAX",
      symbol: "WAVAX",
      priceDecimals: 3,
      decimals: 18,
      address: "0x1D308089a2D1Ced3f1Ce36B1FcaF815b07217be3",
      isWrapped: true,
      baseSymbol: "AVAX",
      categories: ["layer1"],
      imageUrl: "https://assets.coingecko.com/coins/images/12559/small/coin-round-red.png?1604021818",
      coingeckoUrl: "https://www.coingecko.com/en/coins/avalanche",
      explorerUrl: "https://testnet.snowtrace.io/address/0x1D308089a2D1Ced3f1Ce36B1FcaF815b07217be3",
    },
    {
      name: "Ethereum (WETH.e)",
      symbol: "ETH",
      assetSymbol: "WETH.e",
      address: "0x82F0b3695Ed2324e55bbD9A9554cB4192EC3a514",
      decimals: 18,
      isShortable: true,
      categories: ["layer1"],
      imageUrl: "https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880",
      coingeckoUrl: "https://www.coingecko.com/en/coins/weth",
      coingeckoSymbol: "WETH",
      explorerUrl: "https://testnet.snowtrace.io/address/0x82F0b3695Ed2324e55bbD9A9554cB4192EC3a514",
    },
    {
      name: "USD Coin",
      symbol: "USDC",
      address: "0x3eBDeaA0DB3FfDe96E7a0DBBAFEC961FC50F725F",
      decimals: 6,
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
      coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
      explorerUrl: "https://testnet.snowtrace.io/address/0x3eBDeaA0DB3FfDe96E7a0DBBAFEC961FC50F725F",
    },
    {
      name: "Tether",
      symbol: "USDT",
      decimals: 6,
      address: "0x50df4892Bd13f01E4e1Cd077ff394A8fa1A3fD7c",
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/325/small/Tether-logo.png",
      coingeckoUrl: "https://www.coingecko.com/en/coins/dai",
      explorerUrl: "https://testnet.snowtrace.io/address/0x50df4892Bd13f01E4e1Cd077ff394A8fa1A3fD7c",
    },
    {
      name: "Dai",
      symbol: "DAI",
      address: "0x51290cb93bE5062A6497f16D9cd3376Adf54F920",
      decimals: 6,
      isStable: true,
      imageUrl: "https://assets.coingecko.com/coins/images/9956/thumb/4943.png?1636636734",
      coingeckoUrl: "https://www.coingecko.com/en/coins/dai",
      explorerUrl: "https://testnet.snowtrace.io/address/0x51290cb93bE5062A6497f16D9cd3376Adf54F920",
    },
    {
      name: "Bitcoin (WBTC)",
      symbol: "WBTC",
      decimals: 8,
      address: "0x3Bd8e00c25B12E6E60fc8B6f1E1E2236102073Ca",
      categories: ["layer1"],
      imageUrl: "https://assets.coingecko.com/coins/images/7598/thumb/wrapped_bitcoin_wbtc.png?1548822744",
      coingeckoUrl: "https://www.coingecko.com/en/coins/wrapped-bitcoin",
      explorerUrl: "https://testnet.snowtrace.io/address/0x3Bd8e00c25B12E6E60fc8B6f1E1E2236102073Ca",
    },
    {
      name: "Solana",
      symbol: "SOL",
      decimals: 18,
      priceDecimals: 3,
      address: "0x137f4a7336df4f3f11894718528516edaaD0B082",
      categories: ["layer1"],
      isSynthetic: true,
      imageUrl: "https://assets.coingecko.com/coins/images/4128/small/solana.png?1640133422",
      coingeckoUrl: "https://www.coingecko.com/en/coins/solana",
    },
    {
      name: "Test token",
      symbol: "TEST",
      decimals: 18,
      address: "0x42DD131E1086FFCc59bAE9498D71E20E0C889B14",
      isSynthetic: true,
      coingeckoUrl: "https://www.coingecko.com/en/coins/tether",
    },
    {
      name: "BNB",
      symbol: "BNB",
      decimals: 18,
      priceDecimals: 3,
      address: "0x110892Dd5fa73bE430c0ade694febD9a4CAc68Be",
      isSynthetic: true,
      coingeckoUrl: "https://www.coingecko.com/en/coins/binancecoin",
    },
    {
      name: "Cardano",
      symbol: "ADA",
      decimals: 18,
      priceDecimals: 5,
      address: "0xE64dfFF37Fa6Fe969b792B4146cEe2774Ef6e1a1",
      categories: ["layer1"],
      isSynthetic: true,
      coingeckoUrl: "https://www.coingecko.com/en/coins/cardano",
    },
    {
      name: "TRON",
      symbol: "TRX",
      decimals: 18,
      priceDecimals: 5,
      address: "0x0D1495527C255068F2f6feE31C85d326D0A76FE8",
      isSynthetic: true,
      coingeckoUrl: "https://www.coingecko.com/en/coins/tron",
    },
    {
      name: "Polygon",
      symbol: "MATIC",
      decimals: 18,
      priceDecimals: 4,
      address: "0xadc4698B257F78187Fd675FBf591a09f4c975240",
      categories: ["layer1"],
      isSynthetic: true,
      coingeckoUrl: "https://www.coingecko.com/en/coins/polygon",
    },
    {
      name: "Polkadot",
      symbol: "DOT",
      address: "0x65FFb5664a7B3377A5a27D9e59C72Fb1A5E94962",
      decimals: 18,
      priceDecimals: 4,
      isSynthetic: true,
      categories: ["layer1"],
      coingeckoUrl: "https://www.coingecko.com/en/coins/polkadot",
    },
    {
      name: "Uniswap",
      symbol: "UNI",
      decimals: 18,
      priceDecimals: 4,
      address: "0xF62dC1d2452d0893735D22945Af53C290b158eAF",
      isSynthetic: true,
      categories: ["layer2", "defi"],
      coingeckoUrl: "https://www.coingecko.com/en/coins/uniswap",
    },
    {
      name: "Dogecoin",
      symbol: "DOGE",
      decimals: 8,
      priceDecimals: 5,
      address: "0x2265F317eA5f47A684E5B26c50948617c945d986",
      isSynthetic: true,
      isShortable: true,
      categories: ["meme"],
      coingeckoUrl: "https://www.coingecko.com/en/coins/dogecoin",
    },
    {
      name: "Chainlink",
      symbol: "LINK",
      decimals: 18,
      priceDecimals: 3,
      address: "0x6BD09E8D65AD5cc761DF62454452d4EC1545e647",
      isSynthetic: true,
      isShortable: true,
      categories: ["defi"],
      coingeckoUrl: "https://www.coingecko.com/en/coins/chainlink",
    },
    {
      name: "XRP",
      symbol: "XRP",
      decimals: 6,
      priceDecimals: 4,
      address: "0xF1C2093383453831e8c90ecf809691123116dAaC",
      isSynthetic: true,
      categories: ["layer1"],
      imageUrl: "https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png?1605778731",
      coingeckoUrl: "https://www.coingecko.com/en/coins/xrp",
    },
    {
      name: "GMX",
      symbol: "GMX",
      address: "",
      decimals: 18,
      imageUrl: "https://assets.coingecko.com/coins/images/18323/small/arbit.png?1631532468",
      isPlatformToken: true,
    },
    {
      name: "Escrowed GMX",
      symbol: "esGMX",
      address: "",
      decimals: 18,
      isPlatformToken: true,
    },
    {
      name: "GMX LP",
      symbol: "GLP",
      address: "",
      decimals: 18,
      imageUrl: "https://github.com/gmx-io/gmx-assets/blob/main/GMX-Assets/PNG/GLP_LOGO%20ONLY.png?raw=true",
      isPlatformToken: true,
    },
    /** Placeholder tokens */
    {
      name: "GMX Market tokens",
      symbol: "GM",
      address: "<market-token-address>",
      decimals: 18,
      imageUrl: "https://raw.githubusercontent.com/gmx-io/gmx-assets/main/GMX-Assets/PNG/GM_LOGO.png",
      isPlatformToken: true,
    },
    {
      name: "GLV Market tokens",
      symbol: "GLV",
      address: "<market-token-address>",
      decimals: 18,
      imageUrl: "https://raw.githubusercontent.com/gmx-io/gmx-assets/main/GMX-Assets/PNG/GLV_LOGO.png",
      isPlatformToken: true,
    },
  ],
};

export const TOKEN_COLOR_MAP = {
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
  DOGE: "#BA9F2F",
  SOL: "#38cbc1",
  ARB: "#162c4f",
  NEAR: "#07eb98",
  BNB: "#efb90b",
  ATOM: "#6f7390",
  XRP: "#23292f",
  LTC: "#16182e",
  OP: "#ff0421",
  DOT: "#e6007a",
  tBTC: "#000000",
  TEST: "#2d3ed7",
  SHIB: "#f00601",
  STX: "#eb6230",
  ORDI: "#000000",
  MATIC: "#6f41d8",
  EIGEN: "#1A0C6D",
  SATS: "#F7931A",
  default: "#6062a6",
};

export const TOKENS_MAP: { [chainId: number]: { [address: string]: Token } } = {};
export const V1_TOKENS: { [chainId: number]: Token[] } = {};
export const V2_TOKENS: { [chainId: number]: Token[] } = {};
export const SYNTHETIC_TOKENS: { [chainId: number]: Token[] } = {};
export const TOKENS_BY_SYMBOL_MAP: { [chainId: number]: { [symbol: string]: Token } } = {};
export const WRAPPED_TOKENS_MAP: { [chainId: number]: Token } = {};
export const NATIVE_TOKENS_MAP: { [chainId: number]: Token } = {};

const CHAIN_IDS = [ARBITRUM, AVALANCHE, AVALANCHE_FUJI];

for (let j = 0; j < CHAIN_IDS.length; j++) {
  const chainId = CHAIN_IDS[j];

  TOKENS_MAP[chainId] = {};
  TOKENS_BY_SYMBOL_MAP[chainId] = {};
  SYNTHETIC_TOKENS[chainId] = [];
  V1_TOKENS[chainId] = [];
  V2_TOKENS[chainId] = [];

  let tokens = TOKENS[chainId];
  let wrappedTokenAddress: string | undefined;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    TOKENS_MAP[chainId][token.address] = token;
    TOKENS_BY_SYMBOL_MAP[chainId][token.symbol] = token;

    if (token.isWrapped) {
      WRAPPED_TOKENS_MAP[chainId] = token;
      wrappedTokenAddress = token.address;
    }

    if (token.isNative) {
      NATIVE_TOKENS_MAP[chainId] = token;
    }

    if (token.isV1Available && !token.isTempHidden) {
      V1_TOKENS[chainId].push(token);
    }

    if ((!token.isPlatformToken || (token.isPlatformToken && token.isPlatformTradingToken)) && !token.isTempHidden) {
      V2_TOKENS[chainId].push(token);
    }

    if (token.isSynthetic) {
      SYNTHETIC_TOKENS[chainId].push(token);
    }
  }

  NATIVE_TOKENS_MAP[chainId].wrappedAddress = wrappedTokenAddress;
}

export function getSyntheticTokens(chainId: number) {
  return SYNTHETIC_TOKENS[chainId];
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

export function getV1Tokens(chainId: number) {
  return V1_TOKENS[chainId];
}

export function getV2Tokens(chainId: number) {
  return V2_TOKENS[chainId];
}

export function getTokensMap(chainId: number) {
  return TOKENS_MAP[chainId];
}

export function getWhitelistedV1Tokens(chainId: number) {
  return getV1Tokens(chainId);
}

export function getVisibleV1Tokens(chainId: number) {
  return getV1Tokens(chainId).filter((token) => !token.isWrapped);
}

export function isValidToken(chainId: number, address: string) {
  if (!TOKENS_MAP[chainId]) {
    throw new Error(`Incorrect chainId ${chainId}`);
  }
  return address in TOKENS_MAP[chainId];
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

export function getTokenBySymbol(
  chainId: number,
  symbol: string,
  {
    isSynthetic,
    version,
    symbolType = "symbol",
  }: { isSynthetic?: boolean; version?: "v1" | "v2"; symbolType?: "symbol" | "baseSymbol" } = {}
) {
  let tokens = Object.values(TOKENS_MAP[chainId]);

  if (version) {
    tokens = version === "v1" ? getV1Tokens(chainId) : getV2Tokens(chainId);
  }

  let token: Token | undefined;

  if (isSynthetic !== undefined) {
    token = tokens.find((token) => {
      return token[symbolType]?.toLowerCase() === symbol.toLowerCase() && Boolean(token.isSynthetic) === isSynthetic;
    });
  } else {
    if (symbolType === "symbol" && TOKENS_BY_SYMBOL_MAP[chainId][symbol]) {
      token = TOKENS_BY_SYMBOL_MAP[chainId][symbol];
    } else {
      token = tokens.find((token) => token[symbolType]?.toLowerCase() === symbol.toLowerCase());
    }
  }

  if (!token) {
    throw new Error(`Incorrect symbol "${symbol}" for chainId ${chainId}`);
  }

  return token;
}

export function convertTokenAddress(chainId: number, address: string, convertTo?: "wrapped" | "native") {
  const wrappedToken = getWrappedToken(chainId);

  if (convertTo === "wrapped" && address === NATIVE_TOKEN_ADDRESS) {
    return wrappedToken.address;
  }

  if (convertTo === "native" && address === wrappedToken.address) {
    return NATIVE_TOKEN_ADDRESS;
  }

  return address;
}

export function getNormalizedTokenSymbol(tokenSymbol) {
  if (["WBTC", "WETH", "WAVAX"].includes(tokenSymbol)) {
    return tokenSymbol.substr(1);
  } else if (tokenSymbol.includes(".")) {
    return tokenSymbol.split(".")[0];
  }
  return tokenSymbol;
}

export function isChartAvailableForToken(chainId: number, tokenSymbol: string) {
  let token;

  try {
    token = getTokenBySymbol(chainId, tokenSymbol);
  } catch (e) {
    return false;
  }

  if (token.isChartDisabled || (token.isPlatformToken && !token.isPlatformTradingToken)) return false;

  return true;
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

export function getTokenBySymbolSafe(
  chainId: number,
  symbol: string,
  params: Parameters<typeof getTokenBySymbol>[2] = {}
) {
  try {
    return getTokenBySymbol(chainId, symbol, params);
  } catch (e) {
    return;
  }
}

export function isTokenInList(token: Token, tokenList: Token[]): boolean {
  return tokenList.some((t) => t.address === token.address);
}

export function isSimilarToken(tokenA: Token, tokenB: Token) {
  if (tokenA.address === tokenB.address) {
    return true;
  }

  if (tokenA.symbol === tokenB.symbol || tokenA.baseSymbol === tokenB.symbol || tokenA.symbol === tokenB.baseSymbol) {
    return true;
  }

  return false;
}

export function getTokenVisualMultiplier(token: Token): string {
  return token.visualPrefix || token.visualMultiplier?.toString() || "";
}

export function getStableTokens(chainId: number) {
  return getTokens(chainId).filter((t) => t.isStable);
}

export function getCategoryTokenAddresses(chainId: number, category: TokenCategory) {
  return TOKENS[chainId].filter((token) => token.categories?.includes(category)).map((token) => token.address);
}

export const createTokensMap = (tokens: Token[]) => {
  return tokens.reduce((acc, token) => {
    acc[token.address] = token;
    return acc;
  }, {});
};
