import { ReactNode } from "react";

import { ARBITRUM, AVALANCHE, ContractsChainId } from "config/chains";

import OneInchIcon from "img/ic_1inch.svg?react";
import BanxaIcon from "img/ic_banxa.svg?react";
import BinanceIcon from "img/ic_binance.svg?react";
import BybitIcon from "img/ic_bybit.svg?react";
import MatchaIcon from "img/ic_matcha.svg?react";
import TransakIcon from "img/ic_tansak.svg?react";
import UniswapIcon from "img/ic_uni_24.svg?react";

export type BuyGmxModalButtonConfig = {
  id: string;
  icon: ReactNode;
  label: ReactNode;
  getLink: (chainId: ContractsChainId) => string;
};

const createGetLink =
  (links: Partial<Record<ContractsChainId, string>>, fallback: string) => (chainId: ContractsChainId) => {
    return links[chainId] ?? fallback;
  };

export const BUY_GMX_MODAL_LINKS: BuyGmxModalButtonConfig[] = [
  {
    id: "uniswap",
    icon: <UniswapIcon className="size-20" />,
    label: "Uniswap",
    getLink: createGetLink(
      {
        [ARBITRUM]:
          "https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a",
      },
      "https://app.uniswap.org/"
    ),
  },
  {
    id: "1inch",
    icon: <OneInchIcon className="size-20" />,
    label: "1inch",
    getLink: createGetLink(
      {
        [ARBITRUM]: "https://app.1inch.io/#/42161/unified/swap/ETH/GMX",
        [AVALANCHE]: "https://app.1inch.io/#/43114/unified/swap/AVAX/GMX",
      },
      "https://1inch.io/"
    ),
  },
  {
    id: "matcha",
    icon: <MatchaIcon className="size-20" />,
    label: "Matcha",
    getLink: createGetLink(
      {
        [ARBITRUM]: "https://www.matcha.xyz/markets/42161/0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a",
        [AVALANCHE]: "https://www.matcha.xyz/markets/43114/0x62edc0692BD897D2295872a9FFCac5425011c661",
      },
      "https://www.matcha.xyz/"
    ),
  },
  {
    id: "binance",
    icon: <BinanceIcon className="size-20" />,
    label: "Binance",
    getLink: createGetLink(
      {
        [ARBITRUM]: "https://www.binance.com/en/trade/GMX_USDT",
        [AVALANCHE]: "https://www.binance.com/en/trade/GMX_USDT",
      },
      "https://www.binance.com/"
    ),
  },
  {
    id: "bybit",
    icon: <BybitIcon className="size-20" />,
    label: "Bybit",
    getLink: createGetLink(
      {
        [ARBITRUM]: "https://www.bybit.com/en-US/trade/spot/GMX/USDT",
        [AVALANCHE]: "https://www.bybit.com/en-US/trade/spot/GMX/USDT",
      },
      "https://www.bybit.com/"
    ),
  },
  {
    id: "banxa",
    icon: <BanxaIcon className="size-20" />,
    label: "Banxa",
    getLink: createGetLink(
      {
        [ARBITRUM]: "https://gmx.banxa.com/?coinType=GMX&fiatType=USD&fiatAmount=500&blockchain=arbitrum",
        [AVALANCHE]: "https://gmx.banxa.com/?coinType=GMX&fiatType=USD&fiatAmount=500&blockchain=avalanche",
      },
      "https://gmx.banxa.com"
    ),
  },
  {
    id: "transak",
    icon: <TransakIcon className="size-20" />,
    label: "Transak",
    getLink: createGetLink(
      {
        [ARBITRUM]:
          "https://global.transak.com/?apiKey=28a15a9b-d94e-4944-99cc-6aa35b45cc74&networks=arbitrum&defaultCryptoCurrency=GMX&isAutoFillUserData=true&hideMenu=true&isFeeCalculationHidden=true",
      },
      "https://global.transak.com"
    ),
  },
];
