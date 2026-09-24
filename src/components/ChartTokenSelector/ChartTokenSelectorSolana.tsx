import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import React, { useCallback, useMemo, useState, useEffect } from "react";

import { SOLANA_USD_DECIMALS } from "config/factors";
import {
  SubCategoryTab,
  TopLevelTab,
  cryptoSubCategoryOptions,
  subCategoryTabLabels,
  tradfiSubCategoryOptions,
  useTokensFavorites,
} from "context/TokensFavoritesContext/TokensFavoritesContextProvider";
import { PreferredTradeTypePickStrategy } from "domain/synthetics/markets/chooseSuitableMarket";
import { getMarketBaseName } from "domain/synthetics/markets/utils";
import type { PriceDelta, TokenData } from "domain/synthetics/tokens";
import { TradeType } from "domain/synthetics/trade";
import { stripBlacklistedWords, type Token } from "domain/tokens";
import { getMidPrice } from "domain/tokens/utils";
import { createGmxSolanaWebSocketClient } from "lib/gmxSolanaRequest";
import { useLocalizedMap } from "lib/i18n";
import { bigintToNumber, formatAmountHuman, formatUsdPrice } from "lib/numbers";
import { searchBy } from "lib/searchBy";
import { useBreakpoints } from "lib/useBreakpoints";
import { getTokenVisualMultiplier } from "sdk/configs/tokens";

import Button from "components/Button/Button";
import { EmptyTableContent } from "components/EmptyTableContent/EmptyTableContent";
import { FavoriteTabs } from "components/FavoriteTabs/FavoriteTabs";
import { RecentlyListedFavoriteSlot } from "components/FavoriteTabs/RecentlyListedFavoriteSlot";
import SearchInput from "components/SearchInput/SearchInput";
import { Sorter, useSorterHandlers } from "components/Sorter/Sorter";
import { ButtonRowScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import Tabs from "components/Tabs/Tabs";
import type { Option as TabOption } from "components/Tabs/types";
import TokenIcon from "components/TokenIcon/TokenIcon";

import ChevronDownIcon from "img/ic_chevron_down.svg?react";
import LongIcon from "img/long.svg?react";
import SearchIconComponent from "img/search.svg?react";
import ShortIcon from "img/short.svg?react";

import {
  applySubCategoryFilter,
  applyTopLevelFilter,
  getMarketSearchEmptyStateActions,
  isMarketRecentlyListed,
} from "./marketFilters";
import { ModeTabs } from "./ModeTabs";
import { SelectorBase, useSelectorClose } from "../SelectorBase/SelectorBase";

type Props = {
  selectedToken: Token | undefined;
  oneRowLabels?: boolean;
  onSelect?: (address: string, preferredTradeType?: PreferredTradeTypePickStrategy) => void;
};

export type SolanaMarketItem = {
  token: Token;
  tokenData?: TokenData;
  dayPriceDelta?: PriceDelta;
  dayVolume?: bigint;
  openInterestLong?: bigint;
  openInterestShort?: bigint;
  maxLeverage?: number;
  longLiquidity?: bigint;
  shortLiquidity?: bigint;
  listingDate?: number;
};

const EMPTY_ITEMS: SolanaMarketItem[] = [];

export type SolanaIndexTokensResponse = {
  type: "indexTokens";
  payload: {
    symbol?: string | null;
    indexToken?: string | null;
    unitPrice?: string | null;
    price?: string | null;
    percentChange24h?: string | null;
    volume24h?: string | null;
    LongOpenInterest?: string | null;
    shortOpenInterest?: string | null;
    maxLeverage?: string | null;
    lpLong?: string | null;
    lpShort?: string | null;
    gtEnabled?: boolean;
    marketInfos?: any
  }[];
};

export function convertSolanaIndexTokensToMarketItems(response: SolanaIndexTokensResponse) {
  const toBigInt = (value: string | null | undefined) => (value == null ? null : BigInt(value));
  const mockTradFiStocks = ["MSFT", "MSTR", "NVDA", "META", "SPCX", "AAPL", "AMZN", "GOOGL"];
  const mockTradFiIndices = ["QQQ", "SPY"];
  const mockTradFiCommodities = ["WTI"];
  const memeTokens = ["PEPE", "SHIB", "PUMP", "BOME", "FARTCOIN", "BONK", "WIF", "TRUMP", "MELANIA", "DOGE"];
  const layer1Tokens = [
    "BTC",
    "ETH",
    "AVAX",
    "SOL",
    "NEAR",
    "LTC",
    "SUI",
    "XRP",
    "ADA",
    "DOT",
    "BCH",
    "BNB",
    "TON",
    "TRX",
    "XLM",
    "XMR",
    "ZEC",
  ];
  const layer2Tokens = ["ARB"];
  const defiTokens = ["AAVE", "UNI", "LINK"];

  return response.payload.map((item) => {
    const token: Token = {
      name: '',
      symbol: item.symbol ?? '',
      address: item.indexToken ?? '',
      isSynthetic: true,
      decimals: 8,
      categories: mockTradFiStocks.includes(item.symbol ?? "")
        ? ["tradfi", "stocks"]
        : mockTradFiIndices.includes(item.symbol ?? "")
          ? ["tradfi", "indices"]
          : mockTradFiCommodities.includes(item.symbol ?? "")
            ? ["tradfi", "commodities"]
            : memeTokens.includes(item.symbol ?? "")
              ? ["meme"]
              : layer2Tokens.includes(item.symbol ?? "")
                ? ["layer2"]
                : defiTokens.includes(item.symbol ?? "")
                  ? ["defi"]
                  : layer1Tokens.includes(item.symbol ?? "")
                    ? ["layer1"]
                    : [],
      imageUrl: '',
      isPermitSupported: false,
      isPermitDisabled: false,
    };
    const price = toBigInt(item.price);
    const percentChange = toBigInt(item.percentChange24h);
    const deltaPercentage = percentChange === null ? 0 : bigintToNumber(percentChange, 2);
    const maxLeverage = toBigInt(item.maxLeverage);

    return {
      token,
      tokenData: {
        ...token,
        hasPriceFeedProvider: undefined,
        prices: {
          minPrice: price ?? BigInt('0'),
          maxPrice: price ?? BigInt('0'),
        },
        balanceType: 0,
      },
      dayVolume: toBigInt(item.volume24h) ?? BigInt('0'),
      openInterestLong: toBigInt(item.LongOpenInterest) ?? BigInt('0'),
      openInterestShort: toBigInt(item.shortOpenInterest) ?? BigInt('0'),
      maxLeverage: maxLeverage === null ? 0 : bigintToNumber(maxLeverage, SOLANA_USD_DECIMALS),
      longLiquidity: toBigInt(item.lpLong) ?? BigInt('0'),
      shortLiquidity: toBigInt(item.lpShort) ?? BigInt('0'),
      dayPriceDelta: {
        close: 0,
        deltaPercentage,
        deltaPercentageStr:
          deltaPercentage === null ? '--' : `${deltaPercentage > 0 ? "+" : ""}${deltaPercentage.toFixed(2)}%`,
        deltaPrice: 0,
        high: 0,
        low: 0,
        open: 0,
        tokenSymbol: item.symbol ?? '',
      },
    };
  });
}


// const solana_data: SolanaIndexTokensResponse = {
//   "type": "indexTokens",
//   "payload": [
//     {
//       "symbol": "AVAX",
//       "indexToken": "KgV1GvrHQmRBY8sHQQeUKwTm2r2h8t4C8qt12Cw1HVE",
//       "unitPrice": "10359613838051",
//       "price": "1035961383805100000000",
//       "percentChange24h": "-656",
//       "volume24h": "4952397888357976594743296",
//       "LongOpenInterest": "1542605769789603168907328",
//       "shortOpenInterest": "2025345690149295125820101",
//       "lpLong": "2449923913500160459331922",
//       "lpShort": "2878604539416886994035275",
//       "gtEnabled": true,
//       "maxLeverage": "25000000000000000000000",
//       "marketInfos": [
//         {
//           "indexToken": "KgV1GvrHQmRBY8sHQQeUKwTm2r2h8t4C8qt12Cw1HVE",
//           "marketToken": "2wxH1sGLH4Rui6Ws4F1nFDHtW3aJDG1fAF3gZVJ7ktwV",
//           "longToken": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
//           "shortToken": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
//           "unitPrice": "10359613838051",
//           "volume24h": "4952397888357976594743296",
//           "longOpenInterest": "1542605769789603168907328",
//           "shortOpenInterest": "2025345690149295125820101",
//           "lpLong": "2449923913500160459331922",
//           "lpShort": "2878604539416886994035275",
//           "maxLeverage": "25000000000000000000000",
//           "longFundingFeeRateHour": "-7518201474384000",
//           "longBorrowingFeeRateHour": "0",
//           "longNetRatePerHour": "-7518201474384000",
//           "shortFundingFeeRateHour": "5726242699815600",
//           "shortBorrowingFeeRateHour": "-2121590264742000",
//           "shortNetRatePerHour": "3604652435073600",
//           "reservedValueForLong": "2454026316066021660523454",
//           "maxReserveValueForLong": "4903950229566182119855376",
//           "openInterestForLong": "1542605769789603168907328",
//           "maxOpenInterestForLong": "100000000000000004764729344",
//           "reservedValueForShort": "2025345690149295125820101",
//           "maxReserveValueForShort": "4903950229566182119855376",
//           "openInterestForShort": "2025345690149295125820101",
//           "maxOpenInterestForShort": "100000000000000004764729344",
//           "prices": [
//             "10358961343402",
//             "10360266332701",
//             "99985408514068",
//             "99985408514068",
//             "99985408514068",
//             "99985408514068"
//           ],
//           "supply": "46552427171348",
//           "marketDecimals": "9",
//           "minCollateralFactorForLong": "400000000000000000",
//           "minCollateralFactorForShort": "400000000000000000",
//           "minCollateralValue": "100000000000000000000",
//           "longToShortAvailableLiquidity": "2451975114783091059917809",
//           "shortToLongAvailableLiquidity": "2451975114783091059914670",
//           "marketPrice": "80530871156713137765",
//           "longTokenAmount": "24523329466",
//           "shortTokenAmount": "24523329466",
//           "poolValueLong": "2451975114783091059927688",
//           "poolValueShort": "2451975114783091059927688",
//           "longDepositCapacityAmount": "925615309879",
//           "shortDepositCapacityAmount": "925615309879",
//           "maxLongSellableUsd": "1254889106946007323086979",
//           "maxShortSellableUsd": "1254889106946007323086979",
//           "viForSwaps": "",
//           "viForPositions": "",
//           "mlForLong": "4903950229566182119855376",
//           "mlForShort": "4903950229566182119855376",
//           "oFFForPositive": "10000000000000000",
//           "oFFForNegative": "12000000000000000",
//           "mCMCFForLiquidation": "0",
//           "closed": false,
//           "tvl": "5823047183591950646182156"
//         }
//       ]
//     },
//     {
//       "symbol": "LIT",
//       "indexToken": "LitYCK3XFM7imaCwzutins43WCKfH8iubaEhp9JFPcj",
//       "unitPrice": "5244175000000",
//       "price": "524417500000000000000",
//       "percentChange24h": "914",
//       "volume24h": "121876909964434865957896192",
//       "LongOpenInterest": "4644950271885370476247502",
//       "shortOpenInterest": "6299102490799099750438912",
//       "lpLong": "1567049343457666780597600",
//       "lpShort": "4248192180985895592091400",
//       "gtEnabled": true,
//       "maxLeverage": "10000000000000000000000",
//       "marketInfos": [
//         {
//           "indexToken": "LitYCK3XFM7imaCwzutins43WCKfH8iubaEhp9JFPcj",
//           "marketToken": "5MpBQqsNFhuSJL27NAJ8W25TQ8yZVr6PZezjrU74LbMq",
//           "longToken": "9wX6Qz1Y5YQe71dfnFYFfZYXZhKqjYKQwdqfrRkmYUSX",
//           "shortToken": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
//           "unitPrice": "5244175000000",
//           "volume24h": "121876909964434865957896192",
//           "longOpenInterest": "4644950271885370476247502",
//           "shortOpenInterest": "6299102490799099750438912",
//           "lpLong": "1567049343457666780597600",
//           "lpShort": "4248192180985895592091400",
//           "maxLeverage": "10000000000000000000000",
//           "longFundingFeeRateHour": "13436995690713600",
//           "longBorrowingFeeRateHour": "0",
//           "longNetRatePerHour": "13436995690713600",
//           "shortFundingFeeRateHour": "-9908423760063600",
//           "shortBorrowingFeeRateHour": "-3408815479132800",
//           "shortNetRatePerHour": "-13317239239196400",
//           "reservedValueForLong": "7168982995667784140000000",
//           "maxReserveValueForLong": "8736032339125450920597600",
//           "openInterestForLong": "4644950271885370476247502",
//           "maxOpenInterestForLong": "100000000000000000000000000",
//           "reservedValueForShort": "6299102490799099750438912",
//           "maxReserveValueForShort": "10547294671784995342530312",
//           "openInterestForShort": "6299102490799099750438912",
//           "maxOpenInterestForShort": "100000000000000000000000000",
//           "prices": [
//             "5242440000000",
//             "5245910000000",
//             "803041900200",
//             "803720646733",
//             "99985408514068",
//             "99985408514068"
//           ],
//           "supply": "83235937907402",
//           "marketDecimals": "9",
//           "minCollateralFactorForLong": "1000000000000000000",
//           "minCollateralFactorForShort": "1000000000000000000",
//           "minCollateralValue": "100000000000000000000",
//           "longToShortAvailableLiquidity": "5273647335892497671234429",
//           "shortToLongAvailableLiquidity": "4369862135402391020488428",
//           "marketPrice": "73614584890768750504",
//           "longTokenAmount": "5439337808494",
//           "shortTokenAmount": "52744169517",
//           "poolValueLong": "4369862135402391020524451",
//           "poolValueShort": "5273647335892497671265156",
//           "longDepositCapacityAmount": "19560662191506",
//           "shortDepositCapacityAmount": "184790490319",
//           "maxLongSellableUsd": "872797259464166893083619",
//           "maxShortSellableUsd": "1053311248622179655337838",
//           "viForSwaps": "",
//           "viForPositions": "",
//           "mlForLong": "8736032339125450920597600",
//           "mlForShort": "10547294671784995342530312",
//           "oFFForPositive": "10000000000000000",
//           "oFFForNegative": "12000000000000000",
//           "mCMCFForLiquidation": "500000000000000000",
//           "closed": false,
//           "tvl": "10688975140628071049132772"
//         }
//       ]
//     },
//     {
//       "symbol": "LTC",
//       "indexToken": "LtcsFqdfsLyoHZ7cRt9BkijqbFRAN1M4fB8naGaykTF",
//       "unitPrice": "59848583008382",
//       "price": "5984858300838200000000",
//       "percentChange24h": "-328",
//       "volume24h": "8891243422617855070569141",
//       "LongOpenInterest": "467810674828611283301213",
//       "shortOpenInterest": "25804574007422012126250",
//       "lpLong": "7774030091243168257672191",
//       "lpShort": "2291724011970905286527662",
//       "gtEnabled": true,
//       "maxLeverage": "10000000000000000000000",
//       "marketInfos": [
//         {
//           "indexToken": "LtcsFqdfsLyoHZ7cRt9BkijqbFRAN1M4fB8naGaykTF",
//           "marketToken": "5Sv9AETZBdR8JGpe3YMZJKzhvQmnLsAgcrfViJ8y8LB7",
//           "longToken": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
//           "shortToken": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
//           "unitPrice": "59848583008382",
//           "volume24h": "9997970000000000000",
//           "longOpenInterest": "107859576873966698250",
//           "shortOpenInterest": "101358994019469890000",
//           "lpLong": "198868543520805289555688",
//           "lpShort": "198874911374430593867576",
//           "maxLeverage": "10000000000000000000000",
//           "longFundingFeeRateHour": "8045642598289200",
//           "longBorrowingFeeRateHour": "-2781197809200",
//           "longNetRatePerHour": "8042861400480000",
//           "shortFundingFeeRateHour": "-8561643835615200",
//           "shortBorrowingFeeRateHour": "0",
//           "shortNetRatePerHour": "-8561643835615200",
//           "reservedValueForLong": "107727047615591230024",
//           "maxReserveValueForLong": "198976270568420880785712",
//           "openInterestForLong": "107859576873966698250",
//           "maxOpenInterestForLong": "150000000000000000000000000",
//           "reservedValueForShort": "101358994019469890000",
//           "maxReserveValueForShort": "198976270368450063757576",
//           "openInterestForShort": "101358994019469890000",
//           "maxOpenInterestForShort": "150000000000000000000000000",
//           "prices": [
//             "59844284012574",
//             "59852882004191",
//             "99985408514068",
//             "99985408514068",
//             "99985408514068",
//             "99985408514068"
//           ],
//           "supply": "293553226492",
//           "marketDecimals": "9",
//           "minCollateralFactorForLong": "1000000000000000000",
//           "minCollateralFactorForShort": "1000000000000000000",
//           "minCollateralValue": "100000000000000000000",
//           "longToShortAvailableLiquidity": "99488135184225031878788",
//           "shortToLongAvailableLiquidity": "99488135284210440392856",
//           "marketPrice": "158142505746589844144",
//           "longTokenAmount": "995026541",
//           "shortTokenAmount": "995026541",
//           "poolValueLong": "99488135284210440392856",
//           "poolValueShort": "99488135184225031878788",
//           "longDepositCapacityAmount": "1424212932477",
//           "shortDepositCapacityAmount": "1424212932477",
//           "maxLongSellableUsd": "99435585404900353229996",
//           "maxShortSellableUsd": "99435585304967757257112",
//           "viForSwaps": "",
//           "viForPositions": "",
//           "mlForLong": "198976270568420880785712",
//           "mlForShort": "198976270368450063757576",
//           "oFFForPositive": "10000000000000000",
//           "oFFForNegative": "12000000000000000",
//           "mCMCFForLiquidation": "0",
//           "closed": false,
//           "tvl": "199766740910219684881988"
//         },
//         {
//           "indexToken": "LtcsFqdfsLyoHZ7cRt9BkijqbFRAN1M4fB8naGaykTF",
//           "marketToken": "527jUvh7guN8Fip96TeJhKWreeWdcwD9CFFwXG9mTiHQ",
//           "longToken": "So11111111111111111111111111111111111111112",
//           "shortToken": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
//           "unitPrice": "59848583008382",
//           "volume24h": "8891233424647855070569141",
//           "longOpenInterest": "467702815251737316602963",
//           "shortOpenInterest": "25703215013402542236250",
//           "lpLong": "7774030091243168257672191",
//           "lpShort": "2291724011970905286527662",
//           "maxLeverage": "10000000000000000000000",
//           "longFundingFeeRateHour": "271091716988400",
//           "longBorrowingFeeRateHour": "-318925140487200",
//           "longNetRatePerHour": "-47833423498800",
//           "shortFundingFeeRateHour": "-4932859922848800",
//           "shortBorrowingFeeRateHour": "0",
//           "shortNetRatePerHour": "-4932859922848800",
//           "reservedValueForLong": "460086925500869910460173",
//           "maxReserveValueForLong": "8234117016744038168132364",
//           "openInterestForLong": "467702815251737316602963",
//           "maxOpenInterestForLong": "150000000000000000000000000",
//           "reservedValueForShort": "25703215013402542236250",
//           "maxReserveValueForShort": "2317427226984307828763912",
//           "openInterestForShort": "25703215013402542236250",
//           "maxOpenInterestForShort": "150000000000000000000000000",
//           "prices": [
//             "59844284012574",
//             "59852882004191",
//             "11452389898263",
//             "11453160159603",
//             "99985408514068",
//             "99985408514068"
//           ],
//           "supply": "44491198335471",
//           "marketDecimals": "9",
//           "minCollateralFactorForLong": "1000000000000000000",
//           "minCollateralFactorForShort": "1000000000000000000",
//           "minCollateralValue": "100000000000000000000",
//           "longToShortAvailableLiquidity": "1158713613492153914381831",
//           "shortToLongAvailableLiquidity": "4117196960303523704538318",
//           "marketPrice": "117941900216596711257",
//           "longTokenAmount": "359493393514",
//           "shortTokenAmount": "11588827117",
//           "poolValueLong": "4117196960303523704540562",
//           "poolValueShort": "1158713613492153914381956",
//           "longDepositCapacityAmount": "10354506606486",
//           "shortDepositCapacityAmount": "1438622780305",
//           "maxLongSellableUsd": "3892764313717733504316088",
//           "maxShortSellableUsd": "1095550941067598079052936",
//           "viForSwaps": "",
//           "viForPositions": "",
//           "mlForLong": "8234117016744038168132364",
//           "mlForShort": "2317427226984307828763912",
//           "oFFForPositive": "10000000000000000",
//           "oFFForNegative": "12000000000000000",
//           "mCMCFForLiquidation": "0",
//           "closed": false,
//           "tvl": "5412474812210678052790417"
//         }
//       ]
//     }]
// }

// const mock_items2: SolanaMarketItem[] = convertSolanaIndexTokensToMarketItems(solana_data)

const SWAP_EXCLUDED_TOP_LEVEL_TABS: TopLevelTab[] = ["tradfi", "recently-listed"];
const MAX_MARKET_SEARCH_QUERY_LENGTH = 100;

function getSearchMatchedTokens(options: Token[] | undefined, searchKeyword: string, isSwap: boolean) {
  if (!options) return undefined;
  const query = searchKeyword.trim();
  if (!query) return options;

  return searchBy(
    options,
    [
      (item) => stripBlacklistedWords(item.name),
      (item) => (isSwap ? item.symbol : `${getTokenVisualMultiplier(item)}${item.symbol}`),
      (item) => (item.searchAliases ?? []).join(" "),
    ],
    query
  );
}

export default function ChartTokenSelector(props: Props) {
  const { selectedToken, oneRowLabels, onSelect } = props;
  const [response, setResponse] = useState<SolanaIndexTokensResponse>();

  useEffect(() => {
    const client = createGmxSolanaWebSocketClient({
      onStateChange(state) {
        // if (state.status === "error") setIsEnabled(false);
      },
      onOpen() {
        try {
          client.send(JSON.stringify({ subscribe: "indexTokens" }));
        } catch (cause) {
          // console.log('error:');
        }
      },
      onMessage(event) {
        try {
          const message: SolanaIndexTokensResponse = JSON.parse(event.data);
          if (typeof message !== "object" || message === null || !("type" in message)) {
            throw new Error("Expected a JSON object with a message type.");
          }
          if (message.type !== "indexTokens") return;

          setResponse(message);
          // setUpdatedAt(new Date().toLocaleTimeString("en-US", { hour12: false }));
          // setError(null);
        } catch (cause) {
          // setError(`Invalid message: ${cause instanceof Error ? cause.message : String(cause)}`);
        }
      },
    });

    client.connect();

    return () => {
      client.destroy();
    };
  }, []);

  const { mode } = useTokensFavorites("chart-token-selector");
  const isSwap = mode === "swap";

  const { isMobile } = useBreakpoints();
  const shouldUsePerpPanelWidth = !isSwap;

  return (
    <SelectorBase
      popoverPlacement="bottom-start"
      handleClassName={cx({
        "mr-24": oneRowLabels === false,
        "py-0 md:h-40": isSwap,
      })}
      desktopPanelClassName={cx("max-w-[100vw] shadow-md", {
        "w-[520px]": !shouldUsePerpPanelWidth,
        "w-[880px]": shouldUsePerpPanelWidth,
      })}
      chevronClassName="hidden"
      label={
        <Button variant="secondary">
          {selectedToken ? (
            <span
              className={cx("inline-flex gap-12 whitespace-nowrap pl-0 text-[13px]", {
                "items-start": !oneRowLabels,
                "items-center": oneRowLabels,
              })}
            >
              {isSwap && oneRowLabels ? (
                <div className="rounded-4 bg-blue-300 bg-opacity-[20%] px-7 py-4 text-blue-300">
                  <Trans>Swap</Trans>
                </div>
              ) : null}

              <div className="flex items-center gap-8">
                <TokenIcon symbol={selectedToken.symbol} displaySize={isMobile ? 32 : 20} />
                <div className="flex gap-2 md:items-center md:gap-8">
                  <span
                    className={cx("flex justify-start leading-base", {
                      "flex-col items-baseline gap-2": !oneRowLabels,
                      "flex-row items-center": oneRowLabels,
                    })}
                  >
                    <span className="text-start text-[13px] font-medium text-typography-primary">
                      {!isSwap && <>{getTokenVisualMultiplier(selectedToken)}</>}
                      {selectedToken.symbol}
                      {t`/USD`}
                    </span>

                    {isSwap && !oneRowLabels ? (
                      <div className="text-blue-300">
                        <Trans>Swap</Trans>
                      </div>
                    ) : null}
                  </span>

                  <ChevronDownIcon className="inline-block size-16" />
                </div>
              </div>
            </span>
          ) : (
            "..."
          )}
        </Button>
      }
      modalLabel={t`Market`}
      mobileModalContentPadding={false}
    >
      <MarketsList items={response ? convertSolanaIndexTokensToMarketItems(response) : EMPTY_ITEMS} onSelect={onSelect} />
    </SelectorBase>
  );
}

type SortField =
  | "lastPrice"
  | "24hChange"
  | "24hVolume"
  | "longLiquidity"
  | "shortLiquidity"
  | "combinedAvailableLiquidity"
  | "combinedOpenInterest"
  | "unspecified";

function MarketsList({ items, onSelect }: Pick<Props, "onSelect"> & { items: SolanaMarketItem[] }) {
  const {
    topLevelTab: storedTopLevelTab,
    subCategoryTab: storedSubCategoryTab,
    mode,
    setMode,
    setModeAndResetFilters,
    setSubCategoryTab,
    favoriteTokens,
    toggleFavoriteToken,
  } = useTokensFavorites("chart-token-selector");

  const localizedSubCategoryLabels = useLocalizedMap(subCategoryTabLabels);

  const recentlyListedAddressesSet = useMemo(
    () =>
      new Set(
        items.filter((item) => isMarketRecentlyListed(item.listingDate, Date.now())).map((item) => item.token.address)
      ),
    [items]
  );
  const isSwap = mode === "swap";
  const options = useMemo(() => items.map((item) => item.token), [items]);
  const otherModeOptions: Token[] = [];

  const recentlyListedCount = useMemo(() => {
    if (!options || recentlyListedAddressesSet.size === 0) return 0;
    return options.filter((t) => recentlyListedAddressesSet.has(t.address)).length;
  }, [options, recentlyListedAddressesSet]);

  const hasAvailableFavorites = useMemo(() => {
    if (!options || favoriteTokens.length === 0) return false;
    return options.some((t) => favoriteTokens.includes(t.address));
  }, [options, favoriteTokens]);

  const shouldFallbackToAll =
    (isSwap && SWAP_EXCLUDED_TOP_LEVEL_TABS.includes(storedTopLevelTab)) ||
    (storedTopLevelTab === "favorites" && !hasAvailableFavorites) ||
    (storedTopLevelTab === "recently-listed" && recentlyListedCount === 0);
  const topLevelTab = shouldFallbackToAll ? "all" : storedTopLevelTab;
  const subCategoryTab = shouldFallbackToAll ? "all" : storedSubCategoryTab;

  const populatedCryptoSubCats = useMemo(() => {
    const set = new Set<SubCategoryTab>();
    if (!options) return set;
    for (const cat of ["ai", "layer1", "layer2", "defi", "meme"] as const) {
      if (options.some((o) => o.categories?.includes(cat))) set.add(cat);
    }
    return set;
  }, [options]);

  const populatedTradfiSubCats = useMemo(() => {
    const set = new Set<SubCategoryTab>();
    if (!options) return set;
    for (const cat of ["stocks", "pre-ipo", "commodities", "indices", "fx"] as const) {
      if (options.some((o) => o.categories?.includes(cat))) set.add(cat);
    }
    return set;
  }, [options]);

  const cryptoSubCatTabs = useMemo<TabOption<SubCategoryTab>[]>(
    () =>
      cryptoSubCategoryOptions
        .filter((opt) => opt === "all" || populatedCryptoSubCats.has(opt))
        .map((opt) => ({
          value: opt,
          label: opt === "all" ? <Trans>All</Trans> : localizedSubCategoryLabels[opt],
        })),
    [populatedCryptoSubCats, localizedSubCategoryLabels]
  );

  const tradfiSubCatTabs = useMemo<TabOption<SubCategoryTab>[]>(
    () =>
      tradfiSubCategoryOptions
        .filter((opt) => opt === "all" || populatedTradfiSubCats.has(opt))
        .map((opt) => ({
          value: opt,
          label: opt === "all" ? <Trans>All</Trans> : localizedSubCategoryLabels[opt],
        })),
    [populatedTradfiSubCats, localizedSubCategoryLabels]
  );

  const { isMobile, isSmallMobile } = useBreakpoints();

  const close = useSelectorClose();

  const { orderBy, direction, getSorterProps } = useSorterHandlers<SortField>(
    `chart-token-selector-${isSwap ? "spot" : "perp"}`
  );

  const [searchKeyword, setSearchKeyword] = useState("");
  const query = searchKeyword.trim();

  const currentModeSearchResults = useMemo(
    () => getSearchMatchedTokens(options, searchKeyword, isSwap),
    [isSwap, options, searchKeyword]
  );

  const otherModeSearchResults = useMemo(() => {
    if (!query || currentModeSearchResults === undefined || currentModeSearchResults.length > 0) return undefined;
    return getSearchMatchedTokens(otherModeOptions, query, !isSwap);
  }, [currentModeSearchResults, isSwap, otherModeOptions, query]);

  const sortedDetails = useMemo(() => {
    const filtered = applySubCategoryFilter(
      applyTopLevelFilter(currentModeSearchResults ?? [], {
        topLevelTab,
        favoriteAddresses: favoriteTokens,
        recentlyListedAddresses: recentlyListedAddressesSet,
      }),
      { topLevelTab, subCategoryTab }
    );
    const addresses = new Set(filtered.map((token) => token.address));
    const value = (item: SolanaMarketItem): bigint | number => {
      switch (orderBy) {
        case "lastPrice":
          return item.tokenData ? getMidPrice(item.tokenData.prices) * BigInt(item.token.visualMultiplier ?? 1) : 0n;
        case "24hChange":
          return item.dayPriceDelta?.deltaPercentage ?? 0;
        case "24hVolume":
          return item.dayVolume ?? 0n;
        case "longLiquidity":
          return item.longLiquidity ?? 0n;
        case "shortLiquidity":
          return item.shortLiquidity ?? 0n;
        case "combinedAvailableLiquidity":
          return (item.longLiquidity ?? 0n) + (item.shortLiquidity ?? 0n);
        case "combinedOpenInterest":
          return (item.openInterestLong ?? 0n) + (item.openInterestShort ?? 0n);
        default:
          return 0n;
      }
    };
    return items
      .filter((item) => addresses.has(item.token.address))
      .sort((left, right) => {
        const favoriteOrder =
          Number(favoriteTokens.includes(right.token.address)) - Number(favoriteTokens.includes(left.token.address));
        if (favoriteOrder) return favoriteOrder;
        if (direction === "unspecified" || orderBy === "unspecified") return 0;
        const leftValue = value(left);
        const rightValue = value(right);
        return (leftValue === rightValue ? 0 : leftValue > rightValue ? 1 : -1) * (direction === "asc" ? 1 : -1);
      });
  }, [
    items,
    currentModeSearchResults,
    topLevelTab,
    subCategoryTab,
    favoriteTokens,
    recentlyListedAddressesSet,
    orderBy,
    direction,
  ]);
  const sortedTokens = sortedDetails.map((item) => item.token);

  const handleMarketSelect = useCallback(
    (tokenAddress: string, preferredTradeType?: PreferredTradeTypePickStrategy | undefined) => {
      setSearchKeyword("");
      close();

      onSelect?.(tokenAddress, preferredTradeType);
    },
    [onSelect, close]
  );

  const rowVerticalPadding = cx("px-12 py-4", {
    "group-last-of-type/row:pb-8": !isMobile,
  });
  const rowHorizontalPadding = cx("pr-8");
  const thClassName = cx(
    "sticky top-0 z-10 whitespace-nowrap bg-slate-900 text-left text-[11px] font-medium uppercase text-typography-secondary",
    "first-of-type:text-left",
    rowVerticalPadding,
    rowHorizontalPadding,
    "!py-10"
  );
  const favoriteThClassName = cx(thClassName, "w-0 !pr-0 text-center");
  const marketThClassName = cx(thClassName, "pl-12");

  const tdClassName = cx(
    "text-body-small",
    isMobile ? "align-top" : "align-middle",
    rowVerticalPadding,
    rowHorizontalPadding
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter" && sortedTokens && sortedTokens.length > 0) {
        const token = sortedTokens[0];
        handleMarketSelect(token.address);
      }
    },
    [sortedTokens, handleMarketSelect]
  );

  const placeholder = useMemo(() => {
    if (isSwap) {
      return t`Search token`;
    }

    return t`Search market`;
  }, [isSwap]);

  const availableLiquidityLabel = isMobile ? (isSmallMobile ? t`LIQ.` : t`AVAIL. LIQ.`) : t`AVAILABLE LIQUIDITY`;
  const marketTypeLabel = isSwap ? t`Swap tokens` : t`perpetual markets`;
  const { shouldOfferSearchAll, shouldOfferOtherMode } = getMarketSearchEmptyStateActions({
    hasActiveFilter: topLevelTab !== "all",
    hasCurrentModeMatches: Boolean(currentModeSearchResults?.length),
    hasOtherModeMatches: Boolean(otherModeSearchResults?.length),
  });

  return (
    <>
      <div className="flex flex-col">
        <div className="mb-4 flex items-center gap-12 px-12 pt-12 max-md:flex-col max-md:gap-8">
          <ModeTabs mode={mode} setMode={setMode} />
          <SearchInput
            className="w-full *:!text-body-medium"
            value={searchKeyword}
            setValue={setSearchKeyword}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            maxLength={MAX_MARKET_SEARCH_QUERY_LENGTH}
          />
        </div>

        <ButtonRowScrollFadeContainer>
          <FavoriteTabs
            favoritesKey="chart-token-selector"
            recentlyListedCount={recentlyListedCount}
            hasAvailableFavorites={hasAvailableFavorites}
            className="px-16"
            excludedTabs={isSwap ? SWAP_EXCLUDED_TOP_LEVEL_TABS : undefined}
            selectedValue={topLevelTab}
          />
        </ButtonRowScrollFadeContainer>
        {topLevelTab === "crypto" && populatedCryptoSubCats.size > 0 && (
          <ButtonRowScrollFadeContainer>
            <Tabs
              options={cryptoSubCatTabs}
              selectedValue={subCategoryTab}
              onChange={setSubCategoryTab}
              type="block"
              className="bg-slate-800/50 px-16"
              tabsWrapperClassName="!w-fit"
              regularOptionClassname="!px-8 !pb-9 !pt-11 text-13"
            />
          </ButtonRowScrollFadeContainer>
        )}
        {topLevelTab === "tradfi" && populatedTradfiSubCats.size > 0 && (
          <ButtonRowScrollFadeContainer>
            <Tabs
              options={tradfiSubCatTabs}
              selectedValue={subCategoryTab}
              onChange={setSubCategoryTab}
              type="block"
              className="bg-slate-800/50 px-16"
              tabsWrapperClassName="!w-fit"
              regularOptionClassname="!px-8 !pb-9 !pt-11 text-13"
            />
          </ButtonRowScrollFadeContainer>
        )}
      </div>
      <div
        className={cx({
          "max-h-[444px] overflow-x-auto": !isMobile,
        })}
      >
        <table className="text-body-small w-full border-separate border-spacing-0">
          <thead>
            <tr>
              <th className={favoriteThClassName} colSpan={1}></th>
              <th className={cx(marketThClassName, isMobile ? "min-w-[18ch]" : "min-w-[28ch]")} colSpan={1}>
                <Trans>MARKET</Trans>
              </th>
              {isSwap ? (
                <>
                  <th className={thClassName}>
                    <Sorter {...getSorterProps("lastPrice")}>
                      {isSmallMobile ? <Trans>PRICE</Trans> : <Trans>LAST PRICE</Trans>}
                    </Sorter>
                  </th>
                  {!isMobile && (
                    <th className={thClassName}>
                      <Sorter {...getSorterProps("24hChange")}>
                        <Trans>24H%</Trans>
                      </Sorter>
                    </th>
                  )}
                </>
              ) : (
                <>
                  <th className={thClassName}>
                    <Sorter {...getSorterProps("lastPrice")}>
                      {isSmallMobile ? <Trans>PRICE</Trans> : <Trans>LAST PRICE</Trans>}
                    </Sorter>
                  </th>
                  {!isMobile && (
                    <th className={thClassName}>
                      <Sorter {...getSorterProps("24hChange")}>
                        <Trans>24H%</Trans>
                      </Sorter>
                    </th>
                  )}
                  <th className={thClassName}>
                    <Sorter {...getSorterProps("24hVolume")}>
                      {isSmallMobile ? <Trans>VOL.</Trans> : <Trans>24H VOL.</Trans>}
                    </Sorter>
                  </th>
                  {!isMobile && (
                    <>
                      <th className={thClassName} colSpan={2}>
                        <Sorter {...getSorterProps("combinedOpenInterest")}>
                          <Trans>OPEN INTEREST</Trans>
                        </Sorter>
                      </th>
                      <th className={thClassName} colSpan={2}>
                        <Sorter {...getSorterProps("combinedAvailableLiquidity")}>{availableLiquidityLabel}</Sorter>
                      </th>
                    </>
                  )}
                </>
              )}
            </tr>
          </thead>

          <tbody>
            {sortedDetails?.map(
              ({
                token,
                tokenData,
                dayPriceDelta,
                dayVolume,
                openInterestLong,
                openInterestShort,
                maxLeverage,
                longLiquidity,
                shortLiquidity,
                listingDate,
              }) => (
                <MarketListItem
                  key={token.address}
                  token={token}
                  tokenData={tokenData}
                  dayPriceDelta={dayPriceDelta}
                  dayVolume={dayVolume}
                  openInterestLong={openInterestLong}
                  openInterestShort={openInterestShort}
                  maxLeverage={maxLeverage}
                  isSwap={isSwap}
                  isMobile={isMobile}
                  isFavorite={favoriteTokens?.includes(token.address)}
                  onFavorite={toggleFavoriteToken}
                  rowVerticalPadding={rowVerticalPadding}
                  rowHorizontalPadding={rowHorizontalPadding}
                  tdClassName={tdClassName}
                  onMarketSelect={handleMarketSelect}
                  listingDate={listingDate}
                  longLiquidity={longLiquidity}
                  shortLiquidity={shortLiquidity}
                />
              )
            )}
          </tbody>
        </table>
        {!sortedTokens.length && (
          <EmptyTableContent
            isLoading={false}
            isEmpty={true}
            emptyText={
              query ? (
                <div className="flex w-full flex-col items-center gap-12 px-16">
                  <span className="w-full min-w-0 text-center text-12 text-typography-secondary [overflow-wrap:anywhere]">
                    {shouldOfferSearchAll ? (
                      <Trans>No results with the selected filters.</Trans>
                    ) : (
                      <Trans>
                        No {marketTypeLabel} match "{query}".
                      </Trans>
                    )}
                  </span>
                  {shouldOfferSearchAll && (
                    <Button type="button" variant="secondary" onClick={() => setModeAndResetFilters(mode)}>
                      <Trans>Search in all {marketTypeLabel}</Trans>
                      <SearchIconComponent className="size-16" />
                    </Button>
                  )}
                  {shouldOfferOtherMode && (
                    <>
                      <span className="text-12 text-typography-secondary">
                        {isSwap ? (
                          <Trans>Results are available in Perpetuals.</Trans>
                        ) : (
                          <Trans>Results are available in Swap.</Trans>
                        )}
                      </span>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setModeAndResetFilters(isSwap ? "perp" : "swap")}
                      >
                        {isSwap ? <Trans>View results in Perpetuals</Trans> : <Trans>View results in Swap</Trans>}
                        <SearchIconComponent className="size-16" />
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <Trans>No markets matched.</Trans>
              )
            }
          />
        )}
      </div>
    </>
  );
}

const MarketLabel = ({ token }: { token: Token }) => {
  return (
    <span className="text-typography-secondary">
      <span className="text-typography-primary">{getMarketBaseName({ indexToken: token, isSpotOnly: false })}</span>
      {t`/USD`}
    </span>
  );
};

function MarketListItem({
  token,
  tokenData,
  dayPriceDelta,
  dayVolume,
  openInterestLong,
  openInterestShort,
  maxLeverage,
  isSwap,
  isMobile,
  isFavorite,
  onFavorite,
  rowVerticalPadding,
  rowHorizontalPadding,
  tdClassName,
  onMarketSelect,
  listingDate,
  longLiquidity,
  shortLiquidity,
}: {
  token: Token;
  tokenData: TokenData | undefined;
  dayPriceDelta: PriceDelta | undefined;
  dayVolume: bigint | undefined;
  openInterestLong: bigint | undefined;
  openInterestShort: bigint | undefined;
  maxLeverage: number | undefined;
  isSwap: boolean;
  isMobile: boolean;
  isFavorite?: boolean;
  onFavorite: (address: string) => void;
  rowVerticalPadding: string;
  rowHorizontalPadding: string;
  tdClassName: string;
  onMarketSelect: (address: string, preferredTradeType?: PreferredTradeTypePickStrategy | undefined) => void;
  listingDate?: number;
  longLiquidity?: bigint;
  shortLiquidity?: bigint;
}) {
  const handleFavoriteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onFavorite(token.address);
    },
    [onFavorite, token.address]
  );

  const handleSelectLargePosition = useCallback(
    (e: React.MouseEvent<HTMLTableCellElement | HTMLTableRowElement>) => {
      e.stopPropagation();
      onMarketSelect(token.address, "largestPosition");
    },
    [onMarketSelect, token.address]
  );

  const handleSelectLong = useCallback(
    (e: React.MouseEvent<HTMLTableCellElement>) => {
      e.stopPropagation();
      onMarketSelect(token.address, TradeType.Long);
    },
    [onMarketSelect, token.address]
  );

  const handleSelectShort = useCallback(
    (e: React.MouseEvent<HTMLTableCellElement>) => {
      e.stopPropagation();
      onMarketSelect(token.address, TradeType.Short);
    },
    [onMarketSelect, token.address]
  );

  const dayPriceDeltaComponent = useMemo(() => {
    return (
      <div
        className={cx("numbers", {
          positive: dayPriceDelta?.deltaPercentage && dayPriceDelta?.deltaPercentage > 0,
          negative: dayPriceDelta?.deltaPercentage && dayPriceDelta?.deltaPercentage < 0,
        })}
      >
        {dayPriceDelta?.deltaPercentageStr || "-"}
      </div>
    );
  }, [dayPriceDelta]);
  const isRecentlyListed = isMarketRecentlyListed(listingDate, Date.now());

  if (isSwap) {
    return (
      <tr key={token.symbol} className="group/row cursor-pointer hover:bg-fill-surfaceHover">
        <td className={cx("pl-12 pr-0 text-center text-typography-secondary", rowVerticalPadding)}>
          <Button variant="ghost" className="!h-20 !min-h-32 !w-32 !p-0" onClick={handleFavoriteClick}>
            <RecentlyListedFavoriteSlot isRecentlyListed={isRecentlyListed} isFavorite={isFavorite} />
          </Button>
        </td>
        <td
          className={cx("text-body-medium w-full", rowVerticalPadding, rowHorizontalPadding)}
          onClick={handleSelectLargePosition}
        >
          <span className="flex items-center gap-4">
            <TokenIcon className="ChartToken-list-icon -my-5 mr-6" symbol={token.symbol} displaySize={16} />
            <span>{token.name}</span>
            <span className="font-medium text-typography-secondary">{token.symbol}</span>
          </span>
        </td>
        <td className={tdClassName}>
          <div className="flex flex-col gap-4">
            <span className="numbers">
              {tokenData
                ? formatUsdPrice(getMidPrice(tokenData.prices), { visualMultiplier: tokenData.visualMultiplier, isSolana: true })
                : "-"}
            </span>
            {isMobile && <span>{dayPriceDeltaComponent}</span>}
          </div>
        </td>
        {!isMobile && <td className={tdClassName}>{dayPriceDeltaComponent}</td>}
      </tr>
    );
  }

  return (
    <tr
      key={token.symbol}
      className="group/row cursor-pointer hover:bg-fill-surfaceHover"
      onClick={handleSelectLargePosition}
    >
      <td className={cx("w-0 px-12 pr-0 text-center text-typography-secondary", rowVerticalPadding)}>
        <Button variant="ghost" className="!h-32 !min-h-32 !w-32 !p-0" onClick={handleFavoriteClick}>
          <RecentlyListedFavoriteSlot isRecentlyListed={isRecentlyListed} isFavorite={isFavorite} />
        </Button>
      </td>
      <td className={cx("pl-12 text-[13px]", rowVerticalPadding, isMobile ? "pr-2" : rowHorizontalPadding)}>
        <div className={cx("flex", isMobile ? "items-start" : "items-center")}>
          <TokenIcon className="ChartToken-list-icon mr-6" symbol={token.symbol} displaySize={16} />
          <span className={cx("flex flex-wrap items-center gap-6")}>
            <span className="font-medium leading-1">
              <MarketLabel token={token} />
            </span>
            <span className="rounded-full bg-slate-700 px-6 py-[1.5px] text-12 font-medium leading-[1.25] text-typography-secondary numbers">
              {maxLeverage ? `${maxLeverage.toFixed()}x` : "-"}
            </span>
          </span>
        </div>
      </td>

      <td className={tdClassName}>
        <div className="flex flex-col gap-4">
          <span className="numbers">
            {tokenData
              ? formatUsdPrice(getMidPrice(tokenData.prices), { visualMultiplier: tokenData.visualMultiplier, isSolana: true })
              : "-"}
          </span>
          {isMobile && <span>{dayPriceDeltaComponent}</span>}
        </div>
      </td>
      {!isMobile && <td className={tdClassName}>{dayPriceDeltaComponent}</td>}
      <td className={cx(tdClassName, "numbers")}>
        {dayVolume ? formatAmountHuman(dayVolume, SOLANA_USD_DECIMALS, true) : "-"}
      </td>
      {!isMobile && (
        <>
          <td className={cx(tdClassName, "pr-4 numbers")}>
            <span className="inline-flex items-center gap-6">
              <LongIcon width={12} className="relative top-1 mb-2 opacity-70" />
              {formatAmountHuman(openInterestLong ?? 0n, SOLANA_USD_DECIMALS, true)}
            </span>
          </td>
          <td className={cx(tdClassName, "pl-4 numbers")}>
            <span className="inline-flex items-center gap-6">
              <ShortIcon width={12} className="relative top-1 mb-2 opacity-70" />
              {formatAmountHuman(openInterestShort ?? 0n, SOLANA_USD_DECIMALS, true)}
            </span>
          </td>
        </>
      )}

      {!isMobile ? (
        <>
          <td className={cx(tdClassName, "group pr-4 numbers hover:bg-slate-800")} onClick={handleSelectLong}>
            <div className="inline-flex items-center justify-end gap-6">
              <LongIcon width={12} className="relative top-1 mb-2 opacity-70" />
              {formatAmountHuman(longLiquidity, SOLANA_USD_DECIMALS, true)}
            </div>
          </td>
          <td className={cx(tdClassName, "group pl-4 numbers hover:bg-slate-800")} onClick={handleSelectShort}>
            <div className="inline-flex items-center justify-end gap-6">
              <ShortIcon width={12} className="relative top-1 mb-2 opacity-70" />
              {formatAmountHuman(shortLiquidity, SOLANA_USD_DECIMALS, true)}
            </div>
          </td>
        </>
      ) : null}
    </tr>
  );
}
