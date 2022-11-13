import { ARBITRUM, AVALANCHE } from "config/chains";

type Exchange = {
  name: string;
  icon: string;
  networks: number[];
  link: string;
};

export const EXTERNAL_LINKS = {
  bungee: {
    [ARBITRUM]:
      "https://multitx.bungee.exchange/?toChainId=42161&toTokenAddress=0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a",
    [AVALANCHE]:
      "https://multitx.bungee.exchange/?toChainId=43114&toTokenAddress=0x62edc0692bd897d2295872a9ffcac5425011c661",
  },
  banxa: {
    [AVALANCHE]: "https://gmx.banxa.com/?coinType=AVAX&fiatType=USD&fiatAmount=500&blockchain=avalanche",
    [ARBITRUM]: "https://gmx.banxa.com/?coinType=ETH&fiatType=USD&fiatAmount=500&blockchain=arbitrum",
  },
  o3: { [ARBITRUM]: "https://o3swap.com/", [AVALANCHE]: "https://o3swap.com/" },
  buyGmx: {
    banxa: {
      [ARBITRUM]: "https://gmx.banxa.com/?coinType=GMX&fiatType=USD&fiatAmount=500&blockchain=arbitrum",
      [AVALANCHE]: "https://gmx.banxa.com/?coinType=GMX&fiatType=USD&fiatAmount=500&blockchain=avalanche",
    },
    main: {
      [ARBITRUM]:
        "https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a",
      [AVALANCHE]: "https://traderjoexyz.com/trade?outputCurrency=0x62edc0692BD897D2295872a9FFCac5425011c661#/",
    },
  },
  nativeNetwork: { [ARBITRUM]: "https://arbitrum.io/", [AVALANCHE]: "https://www.avax.network/" },
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
    link: "https://app.1inch.io/",
    networks: [ARBITRUM, AVALANCHE],
  },
  {
    name: "Matcha",
    icon: "ic_matcha.png",
    link: "https://www.matcha.xyz/",
    networks: [ARBITRUM, AVALANCHE],
  },
  {
    name: "Paraswap",
    icon: "ic_paraswap.svg",
    link: "https://www.paraswap.io/",
    networks: [ARBITRUM, AVALANCHE],
  },
  {
    name: "Firebird",
    icon: "ic_firebird.png",
    link: "https://firebird.finance/",
    networks: [ARBITRUM, AVALANCHE],
  },
  {
    name: "OpenOcean",
    icon: "ic_openocean.svg",
    link: "https://openocean.finance/",
    networks: [ARBITRUM, AVALANCHE],
  },
  {
    name: "DODO",
    icon: "ic_dodo.svg",
    link: "https://dodoex.io/",
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
    link: "https://slingshot.finance/",
    networks: [ARBITRUM],
  },
  {
    name: "Yieldyak",
    icon: "ic_yield_yak.png",
    link: "https://yieldyak.com/swap",
    networks: [AVALANCHE],
  },
];
