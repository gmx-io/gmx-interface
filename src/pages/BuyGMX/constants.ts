import { ARBITRUM, AVALANCHE } from "config/chains";
import { getContract } from "config/contracts";

const ARBITRUM_GMX = getContract(ARBITRUM, "GMX");
const AVALANCHE_GMX = getContract(AVALANCHE, "GMX");

type Exchange = {
  name: string;
  icon: string;
  networks: number[];
  link?: string;
  links?: { [ARBITRUM]: string; [AVALANCHE]: string };
};

export const EXTERNAL_LINKS = {
  [ARBITRUM]: {
    bungee: `https://multitx.bungee.exchange/?toChainId=42161&toTokenAddress=${ARBITRUM_GMX}`,
    banxa: "https://gmx.banxa.com/?coinType=ETH&fiatType=USD&fiatAmount=500&blockchain=arbitrum",
    o3: "https://o3swap.com/",
    networkWebsite: "https://arbitrum.io/",
    buyGmx: {
      banxa: "https://gmx.banxa.com/?coinType=GMX&fiatType=USD&fiatAmount=500&blockchain=arbitrum",
      uniswap: `https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=${ARBITRUM_GMX}`,
    },
  },
  [AVALANCHE]: {
    bungee: `https://multitx.bungee.exchange/?toChainId=43114&toTokenAddress=${AVALANCHE_GMX}`,
    banxa: "https://gmx.banxa.com/?coinType=AVAX&fiatType=USD&fiatAmount=500&blockchain=avalanche",
    networkWebsite: "https://www.avax.network/",
    buyGmx: {
      banxa: "https://gmx.banxa.com/?coinType=GMX&fiatType=USD&fiatAmount=500&blockchain=avalanche",
      traderjoe: `https://traderjoexyz.com/trade?outputCurrency=${AVALANCHE_GMX}`,
    },
  },
};

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
    link: "https://synapseprotocol.com/",
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
    link: "https://multitx.bungee.exchange",
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
    link: "https://o3swap.com/",
  },
  {
    name: "Across",
    icon: "ic_across.svg",
    networks: [ARBITRUM],
    link: "https://across.to/",
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
      [ARBITRUM]: "https://app.paraswap.io/#/?network=arbitrum",
      [AVALANCHE]: "https://app.paraswap.io/#/?network=avalanche",
    },
    networks: [ARBITRUM, AVALANCHE],
  },
  {
    name: "Firebird",
    icon: "ic_firebird.png",
    link: "https://app.firebird.finance/swap",
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
    name: "Odos",
    icon: "ic_odos.png",
    link: "https://app.odos.xyz/",
    networks: [ARBITRUM],
  },
  {
    name: "Slingshot",
    icon: "ic_slingshot.svg",
    link: "https://app.slingshot.finance/swap/ETH",
    networks: [ARBITRUM],
  },
  {
    name: "Yieldyak",
    icon: "ic_yield_yak.png",
    link: "https://yieldyak.com/swap",
    networks: [AVALANCHE],
  },
];
