import { ARBITRUM, AVALANCHE } from "config/chains";
import { getContract } from "config/contracts";

const ARBITRUM_GMX = getContract(ARBITRUM, "GMX").toLowerCase();
const AVALANCHE_GMX = getContract(AVALANCHE, "GMX").toLowerCase();

type Exchange = {
  name: string;
  icon: string;
  networks: number[];
  link?: string;
  links?: { [ARBITRUM]: string; [AVALANCHE]: string };
};

export const EXTERNAL_LINKS = {
  [ARBITRUM]: {
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
};

export const FIAT_GATEWAYS: Exchange[] = [
  {
    name: "Binance Connect",
    icon: "ic_binance.svg",
    networks: [ARBITRUM, AVALANCHE],
    link: "https://www.binancecnt.com/en/buy-sell-crypto",
  },
  {
    name: "Banxa",
    icon: "ic_banxa.svg",
    networks: [ARBITRUM, AVALANCHE],
    links: {
      [ARBITRUM]: "https://gmx.banxa.com/?coinType=GMX&fiatType=USD&fiatAmount=500&blockchain=arbitrum",
      [AVALANCHE]: "https://gmx.banxa.com/?coinType=GMX&fiatType=USD&fiatAmount=500&blockchain=avalanche",
    },
  },
  {
    name: "Tansak",
    icon: "ic_tansak.svg",
    networks: [ARBITRUM],
    link: "https://global.transak.com/?apiKey=28a15a9b-d94e-4944-99cc-6aa35b45cc74&networks=arbitrum&defaultCryptoCurrency=GMX&isAutoFillUserData=true&hideMenu=true&isFeeCalculationHidden=true",
  },
];

export const GMX_FROM_ANY_NETWORKS: Exchange[] = [
  {
    name: "Bungee",
    icon: "ic_bungee.png",
    networks: [ARBITRUM, AVALANCHE],
    links: {
      [ARBITRUM]: `https://multitx.bungee.exchange/?toChainId=42161&toTokenAddress=${ARBITRUM_GMX}`,
      [AVALANCHE]: `https://multitx.bungee.exchange/?toChainId=43114&toTokenAddress=${AVALANCHE_GMX}`,
    },
  },
  {
    name: "O3",
    icon: "ic_o3.png",
    networks: [ARBITRUM, AVALANCHE],
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
    networks: [ARBITRUM, AVALANCHE],
    links: {
      [ARBITRUM]: `https://multitx.bungee.exchange/?fromChainId=1&fromTokenAddress=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee&toChainId=42161&toTokenAddress=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee `,
      [AVALANCHE]: `https://multitx.bungee.exchange/?fromChainId=1&fromTokenAddress=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee&toChainId=43114&toTokenAddress=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee`,
    },
  },
  {
    name: "O3",
    icon: "ic_o3.png",
    networks: [ARBITRUM, AVALANCHE],
    link: "https://o3swap.com/swap",
  },
  {
    name: "Banxa",
    icon: "ic_banxa.svg",
    networks: [ARBITRUM, AVALANCHE],
    links: {
      [ARBITRUM]: "https://gmx.banxa.com/?coinType=ETH&fiatType=USD&fiatAmount=500&blockchain=arbitrum",
      [AVALANCHE]: "https://gmx.banxa.com/?coinType=AVAX&fiatType=USD&fiatAmount=500&blockchain=avalanche",
    },
  },
  {
    name: "Tansak",
    icon: "ic_tansak.svg",
    networks: [ARBITRUM, AVALANCHE],
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
    networks: [ARBITRUM, AVALANCHE],
    link: "https://www.binance.com/en/trade/",
  },
  {
    name: "Synapse",
    icon: "ic_synapse.svg",
    networks: [ARBITRUM, AVALANCHE],
    links: {
      [ARBITRUM]: "https://synapseprotocol.com/?inputCurrency=ETH&outputCurrency=ETH&outputChain=42161",
      [AVALANCHE]: "https://synapseprotocol.com/",
    },
  },
  {
    name: "Arbitrum",
    icon: "ic_arbitrum_24.svg",
    networks: [ARBITRUM],
    link: "https://bridge.arbitrum.io/",
  },
  {
    name: "Avalanche",
    icon: "ic_avax_30.svg",
    networks: [AVALANCHE],
    link: "https://bridge.avax.network/",
  },
  {
    name: "Hop",
    icon: "ic_hop.svg",
    networks: [ARBITRUM],
    link: "https://app.hop.exchange/send?token=ETH&sourceNetwork=ethereum&destNetwork=arbitrum",
  },
  {
    name: "Bungee",
    icon: "ic_bungee.png",
    networks: [ARBITRUM, AVALANCHE],
    links: {
      [ARBITRUM]:
        "https://multitx.bungee.exchange/?fromChainId=1&fromTokenAddress=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee&toChainId=42161&toTokenAddress=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      [AVALANCHE]:
        "https://multitx.bungee.exchange/?fromChainId=1&fromTokenAddress=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee&toChainId=43114&toTokenAddress=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    },
  },
  {
    name: "Multiswap",
    icon: "ic_multiswap.svg",
    networks: [ARBITRUM, AVALANCHE],
    link: "https://app.multichain.org/#/router",
  },
  {
    name: "O3",
    icon: "ic_o3.png",
    networks: [ARBITRUM, AVALANCHE],
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
    networks: [ARBITRUM],
    link: "https://across.to/bridge?from=1&to=42161&asset=ETH",
  },
];

export const CENTRALISED_EXCHANGES: Exchange[] = [
  {
    name: "Binance",
    icon: "ic_binance.svg",
    link: "https://www.binance.com/en/trade/GMX_USDT?_from=markets",
    networks: [ARBITRUM, AVALANCHE],
  },
  {
    name: "Bybit",
    icon: "ic_bybit.svg",
    link: "https://www.bybit.com/en-US/trade/spot/GMX/USDT",
    networks: [ARBITRUM, AVALANCHE],
  },
  {
    name: "Kucoin",
    icon: "ic_kucoin.svg",
    link: "https://www.kucoin.com/trade/GMX-USDT",
    networks: [ARBITRUM, AVALANCHE],
  },
  {
    name: "Huobi",
    icon: "ic_huobi.svg",
    link: "https://www.huobi.com/en-us/exchange/gmx_usdt/",
    networks: [ARBITRUM, AVALANCHE],
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
    networks: [ARBITRUM, AVALANCHE],
  },
  {
    name: "Matcha",
    icon: "ic_matcha.png",
    links: {
      [ARBITRUM]: `https://www.matcha.xyz/markets/42161/${ARBITRUM_GMX}`,
      [AVALANCHE]: `https://www.matcha.xyz/markets/43114/${AVALANCHE_GMX}`,
    },
    networks: [ARBITRUM, AVALANCHE],
  },
  {
    name: "Paraswap",
    icon: "ic_paraswap.svg",
    links: {
      [ARBITRUM]: `https://app.paraswap.io/#/${ARBITRUM_GMX}?network=arbitrum`,
      [AVALANCHE]: `https://app.paraswap.io/#/${AVALANCHE_GMX}?network=avalanche`,
    },
    networks: [ARBITRUM, AVALANCHE],
  },
  {
    name: "KyberSwap",
    icon: "ic_kyberswap.svg",
    links: {
      [ARBITRUM]: "https://kyberswap.com/swap/arbitrum/eth-to-gmx",
      [AVALANCHE]: "https://kyberswap.com/swap/avalanche/avax-to-gmx",
    },
    networks: [ARBITRUM, AVALANCHE],
  },
  {
    name: "OpenOcean",
    icon: "ic_openocean.svg",
    links: {
      [ARBITRUM]: "https://app.openocean.finance/CLASSIC#/ARBITRUM/ETH/GMX",
      [AVALANCHE]: "https://app.openocean.finance/CLASSIC#/AVAX/AVAX/GMX",
    },
    networks: [ARBITRUM, AVALANCHE],
  },
  {
    name: "DODO",
    icon: "ic_dodo.svg",
    links: {
      [ARBITRUM]: `https://app.dodoex.io/?from=ETH&to=${ARBITRUM_GMX}&network=arbitrum`,
      [AVALANCHE]: `https://app.dodoex.io/?from=AVAX&to=${AVALANCHE_GMX}&network=avalanche`,
    },
    networks: [ARBITRUM, AVALANCHE],
  },
  {
    name: "Slingshot",
    icon: "ic_slingshot.svg",
    link: "https://app.slingshot.finance/swap/ETH?network=arbitrum",
    networks: [ARBITRUM],
  },
  {
    name: "Yieldyak",
    icon: "ic_yield_yak.png",
    link: `https://yieldyak.com/swap?outputCurrency=${AVALANCHE_GMX}`,
    networks: [AVALANCHE],
  },
  {
    name: "Firebird",
    icon: "ic_firebird.png",
    link: "https://app.firebird.finance/swap",
    networks: [ARBITRUM, AVALANCHE],
  },
];
