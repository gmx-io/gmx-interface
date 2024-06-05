import { ARBITRUM, ARBITRUM_GOERLI, AVALANCHE, AVALANCHE_FUJI } from "config/chains";
import { getContract } from "config/contracts";

const ARBITRUM_GMX = getContract(ARBITRUM, "GMX").toLowerCase();
const AVALANCHE_GMX = getContract(AVALANCHE, "GMX").toLowerCase();

type Exchange = {
  name: string;
  icon: string;
  links: { [key: number]: string };
};

export const EXTERNAL_LINKS = {
  [ARBITRUM]: {
    networkWebsite: "https://arbitrum.io/",
    buyGmx: {
      uniswap: `https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=${ARBITRUM_GMX}`,
      gmx: `https://app.gmx.io/#/trade/swap/?mode=market&from=usdc&to=gmx`,
    },
  },
  [ARBITRUM_GOERLI]: {
    networkWebsite: "https://arbitrum.io/",
    buyGmx: {
      uniswap: `https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=${ARBITRUM_GMX}`,
    },
  },
  [AVALANCHE]: {
    networkWebsite: "https://www.avax.network/",
    buyGmx: {
      traderjoe: `https://traderjoexyz.com/trade?outputCurrency=${AVALANCHE_GMX}`,
    },
  },
  [AVALANCHE_FUJI]: {
    networkWebsite: "https://www.avax.network/",
    buyGmx: {
      traderjoe: `https://traderjoexyz.com/trade?outputCurrency=${AVALANCHE_GMX}`,
    },
  },
};

export const FIAT_GATEWAYS: Exchange[] = [
  {
    name: "Banxa",
    icon: "ic_banxa.svg",
    links: {
      [ARBITRUM]: "https://gmx.banxa.com/?coinType=GMX&fiatType=USD&fiatAmount=500&blockchain=arbitrum",
      [AVALANCHE]: "https://gmx.banxa.com/?coinType=GMX&fiatType=USD&fiatAmount=500&blockchain=avalanche",
    },
  },
  {
    name: "Transak",
    icon: "ic_tansak.svg",
    links: {
      [ARBITRUM]:
        "https://global.transak.com/?apiKey=28a15a9b-d94e-4944-99cc-6aa35b45cc74&networks=arbitrum&defaultCryptoCurrency=GMX&isAutoFillUserData=true&hideMenu=true&isFeeCalculationHidden=true",
    },
  },
];

export const GMX_FROM_ANY_NETWORKS: Exchange[] = [
  {
    name: "Bungee",
    icon: "ic_bungee.png",
    links: {
      [ARBITRUM]: `https://multitx.bungee.exchange/?toChainId=42161&toTokenAddress=${ARBITRUM_GMX}`,
      [AVALANCHE]: `https://multitx.bungee.exchange/?toChainId=43114&toTokenAddress=${AVALANCHE_GMX}`,
    },
  },
  {
    name: "O3",
    icon: "ic_o3.png",
    links: {
      [ARBITRUM]: `https://o3swap.com/swap?dst_chain=42161&dst_token_hash=${ARBITRUM_GMX}`,
      [AVALANCHE]: `https://o3swap.com/swap?dst_chain=43114&dst_token_hash=${AVALANCHE_GMX}`,
    },
  },
];

export const BUY_NATIVE_TOKENS: Exchange[] = [
  {
    name: "Bungee",
    icon: "ic_bungee.png",
    links: {
      [ARBITRUM]: `https://multitx.bungee.exchange/?fromChainId=1&fromTokenAddress=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee&toChainId=42161&toTokenAddress=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee `,
      [AVALANCHE]: `https://multitx.bungee.exchange/?fromChainId=1&fromTokenAddress=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee&toChainId=43114&toTokenAddress=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee`,
    },
  },
  {
    name: "O3",
    icon: "ic_o3.png",
    links: {
      [ARBITRUM]:
        "https://o3swap.com/swap?src_chain=1&dst_chain=42161&dst_token_hash=0x0000000000000000000000000000000000000000",
      [AVALANCHE]:
        "https://o3swap.com/swap?src_chain=1&dst_chain=43114&dst_token_hash=0x0000000000000000000000000000000000000000",
    },
  },
  {
    name: "Banxa",
    icon: "ic_banxa.svg",
    links: {
      [ARBITRUM]: "https://gmx.banxa.com/?coinType=ETH&fiatType=USD&fiatAmount=500&blockchain=arbitrum",
      [AVALANCHE]: "https://gmx.banxa.com/?coinType=AVAX&fiatType=USD&fiatAmount=500&blockchain=avalanche",
    },
  },
  {
    name: "Transak",
    icon: "ic_tansak.svg",
    links: {
      [ARBITRUM]:
        "https://global.transak.com/?apiKey=28a15a9b-d94e-4944-99cc-6aa35b45cc74&networks=arbitrum&isAutoFillUserData=true&hideMenu=true&isFeeCalculationHidden=true",
      [AVALANCHE]:
        "https://global.transak.com/?apiKey=28a15a9b-d94e-4944-99cc-6aa35b45cc74&networks=avaxcchain&defaultCryptoCurrency=AVAX&isAutoFillUserData=true&hideMenu=true&isFeeCalculationHidden=true",
    },
  },
];

export const TRANSFER_EXCHANGES: Exchange[] = [
  {
    name: "Binance",
    icon: "ic_binance.svg",
    links: {
      [ARBITRUM]: "https://www.binance.com/en/trade/",
      [AVALANCHE]: "https://www.binance.com/en/trade/",
    },
  },
  {
    name: "Synapse",
    icon: "ic_synapse.svg",
    links: {
      [ARBITRUM]: "https://synapseprotocol.com/?inputCurrency=ETH&outputCurrency=ETH&outputChain=42161",
      [AVALANCHE]: "https://synapseprotocol.com/",
    },
  },
  {
    name: "Arbitrum",
    icon: "ic_arbitrum_24.svg",
    links: {
      [ARBITRUM]: "https://bridge.arbitrum.io/",
    },
  },
  {
    name: "Avalanche",
    icon: "ic_avax_30.svg",
    links: {
      [AVALANCHE]: "https://bridge.avax.network/",
    },
  },
  {
    name: "Hop",
    icon: "ic_hop.svg",
    links: { [ARBITRUM]: "https://app.hop.exchange/send?token=ETH&sourceNetwork=ethereum&destNetwork=arbitrum" },
  },
  {
    name: "Bungee",
    icon: "ic_bungee.png",
    links: {
      [ARBITRUM]:
        "https://multitx.bungee.exchange/?fromChainId=1&fromTokenAddress=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee&toChainId=42161&toTokenAddress=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      [AVALANCHE]:
        "https://multitx.bungee.exchange/?fromChainId=1&fromTokenAddress=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee&toChainId=43114&toTokenAddress=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    },
  },
  {
    name: "O3",
    icon: "ic_o3.png",
    links: {
      [ARBITRUM]:
        "https://o3swap.com/swap?src_chain=1&dst_chain=42161&dst_token_hash=0x0000000000000000000000000000000000000000",
      [AVALANCHE]:
        "https://o3swap.com/swap?src_chain=1&dst_chain=43114&dst_token_hash=0x0000000000000000000000000000000000000000",
    },
  },
  {
    name: "Across",
    icon: "ic_across.svg",
    links: { [ARBITRUM]: "https://across.to/bridge?from=1&to=42161&asset=ETH" },
  },
];

export const CENTRALISED_EXCHANGES: Exchange[] = [
  {
    name: "Binance",
    icon: "ic_binance.svg",
    links: {
      [ARBITRUM]: "https://www.binance.com/en/trade/GMX_USDT",
      [AVALANCHE]: "https://www.binance.com/en/trade/GMX_USDT",
    },
  },
  {
    name: "Bybit",
    icon: "ic_bybit.svg",
    links: {
      [ARBITRUM]: "https://www.bybit.com/en-US/trade/spot/GMX/USDT",
      [AVALANCHE]: "https://www.bybit.com/en-US/trade/spot/GMX/USDT",
    },
  },
  {
    name: "Kucoin",
    icon: "ic_kucoin.svg",
    links: {
      [ARBITRUM]: "https://www.kucoin.com/trade/GMX-USDT",
      [AVALANCHE]: "https://www.kucoin.com/trade/GMX-USDT",
    },
  },
  {
    name: "Huobi",
    icon: "ic_huobi.svg",
    links: {
      [ARBITRUM]: "https://www.huobi.com/en-us/exchange/gmx_usdt/",
      [AVALANCHE]: "https://www.huobi.com/en-us/exchange/gmx_usdt/",
    },
  },
];

export const DECENTRALISED_AGGRIGATORS: Exchange[] = [
  {
    name: "1inch",
    icon: "ic_1inch.svg",
    links: {
      [ARBITRUM]: "https://app.1inch.io/#/42161/unified/swap/ETH/GMX",
      [AVALANCHE]: "https://app.1inch.io/#/43114/unified/swap/AVAX/GMX",
    },
  },
  {
    name: "Matcha",
    icon: "ic_matcha.png",
    links: {
      [ARBITRUM]: `https://www.matcha.xyz/markets/42161/${ARBITRUM_GMX}`,
      [AVALANCHE]: `https://www.matcha.xyz/markets/43114/${AVALANCHE_GMX}`,
    },
  },
  {
    name: "Paraswap",
    icon: "ic_paraswap.svg",
    links: {
      [ARBITRUM]: `https://app.paraswap.io/#/${ARBITRUM_GMX}?network=arbitrum`,
      [AVALANCHE]: `https://app.paraswap.io/#/${AVALANCHE_GMX}?network=avalanche`,
    },
  },
  {
    name: "KyberSwap",
    icon: "ic_kyberswap.svg",
    links: {
      [ARBITRUM]: "https://kyberswap.com/swap/arbitrum/eth-to-gmx",
      [AVALANCHE]: "https://kyberswap.com/swap/avalanche/avax-to-gmx",
    },
  },
  {
    name: "OpenOcean",
    icon: "ic_openocean.svg",
    links: {
      [ARBITRUM]: "https://app.openocean.finance/CLASSIC#/ARBITRUM/ETH/GMX",
      [AVALANCHE]: "https://app.openocean.finance/CLASSIC#/AVAX/AVAX/GMX",
    },
  },
  {
    name: "DODO",
    icon: "ic_dodo.svg",
    links: {
      [ARBITRUM]: `https://app.dodoex.io/?from=ETH&to=${ARBITRUM_GMX}&network=arbitrum`,
      [AVALANCHE]: `https://app.dodoex.io/?from=AVAX&to=${AVALANCHE_GMX}&network=avalanche`,
    },
  },
  {
    name: "Slingshot",
    icon: "ic_slingshot.svg",
    links: { [ARBITRUM]: "https://app.slingshot.finance/swap/ETH?network=arbitrum" },
  },
  {
    name: "Yieldyak",
    icon: "ic_yield_yak.png",
    links: {
      [AVALANCHE]: `https://yieldyak.com/swap?outputCurrency=${AVALANCHE_GMX}`,
    },
  },
  {
    name: "Firebird",
    icon: "ic_firebird.png",
    links: {
      [ARBITRUM]: "https://app.firebird.finance/swap",
      [AVALANCHE]: "https://app.firebird.finance/swap",
    },
  },
  {
    name: "Odos",
    icon: "ic_odos.png",
    links: {
      [ARBITRUM]: "https://app.odos.xyz/swap/42161/ETH/GMX",
      [AVALANCHE]: "https://app.odos.xyz/swap/43114/AVAX/GMX",
    },
  },
];
