import { Trans, msg, t } from "@lingui/macro";
import cx from "classnames";
import React, { useCallback, useMemo, useState } from "react";
import { FaRegStar, FaStar } from "react-icons/fa";
import { useMedia } from "react-use";

import { useMarketsInfoData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import {
  useTradeboxChooseSuitableMarket,
  useTradeboxGetMaxLongShortLiquidityPool,
} from "context/SyntheticsStateContext/hooks/tradeboxHooks";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectTradeboxTradeType } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { PreferredTradeTypePickStrategy } from "domain/synthetics/markets/chooseSuitableMarket";
import { getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets/utils";
import { TradeType } from "domain/synthetics/trade";
import { Token } from "domain/tokens";
import { helperToast } from "lib/helperToast";
import { useLocalizedMap } from "lib/i18n";
import { USD_DECIMALS } from "lib/legacy";
import { useLocalStorageByChainId } from "lib/localStorage";
import { formatAmountHuman, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";

import SearchInput from "components/SearchInput/SearchInput";
import Tab from "components/Tab/Tab";
import TokenIcon from "components/TokenIcon/TokenIcon";
import { CHART_TOKEN_SELECTOR_FILTER_TAB_KEY, CHART_TOKEN_SELECTOR_FAVORITE_TOKENS_KEY } from "config/localStorage";
import { SelectorBase, SelectorBaseMobileHeaderContent, useSelectorClose } from "../SelectorBase/SelectorBase";

type Props = {
  selectedToken: Token | undefined;
  options: Token[] | undefined;
};

type TabOption = "all" | "favorites";
const tabOptions = ["all", "favorites"];
const tabOptionLabels = {
  all: msg({
    message: "All",
    comment: "Chart token selector all markets filter",
  }),
  favorites: msg`Favorites`,
};

export default function ChartTokenSelector(props: Props) {
  const { options, selectedToken } = props;

  return (
    <SelectorBase
      popoverPlacement="bottom-start"
      popoverYOffset={16}
      popoverXOffset={-12}
      label={
        selectedToken ? (
          <span className="inline-flex items-center py-5 pl-5 text-[20px] font-bold">
            <TokenIcon className="mr-8" symbol={selectedToken.symbol} displaySize={20} importSize={24} />
            {selectedToken.symbol} {"/ USD"}
          </span>
        ) : (
          "..."
        )
      }
      modalLabel={t`Market`}
      mobileModalContentPadding={false}
    >
      <MarketsList options={options} />
    </SelectorBase>
  );
}

function MarketsList(props: { options: Token[] | undefined }) {
  const { options } = props;
  const chainId = useSelector(selectChainId);

  const [tab, setTab] = useLocalStorageByChainId<TabOption>(chainId, CHART_TOKEN_SELECTOR_FILTER_TAB_KEY, "all");
  const [favoriteTokens, setFavoriteTokens] = useLocalStorageByChainId<string[]>(
    chainId,
    CHART_TOKEN_SELECTOR_FAVORITE_TOKENS_KEY,
    []
  );

  const isMobile = useMedia("(max-width: 1100px)");
  const isSmallMobile = useMedia("(max-width: 400px)");

  const close = useSelectorClose();

  const tradeType = useSelector(selectTradeboxTradeType);
  const [searchKeyword, setSearchKeyword] = useState("");
  const isSwap = tradeType === TradeType.Swap;

  const filteredTokens: Token[] | undefined = useMemo(
    () =>
      options?.filter((item) => {
        const textSearchMatch =
          item.name.toLowerCase().indexOf(searchKeyword.toLowerCase()) > -1 ||
          item.symbol.toLowerCase().indexOf(searchKeyword.toLowerCase()) > -1;

        const favoriteMatch = tab === "favorites" ? favoriteTokens?.includes(item.address) : true;

        return textSearchMatch && favoriteMatch;
      }),
    [favoriteTokens, options, searchKeyword, tab]
  );

  const chooseSuitableMarket = useTradeboxChooseSuitableMarket();
  const marketsInfoData = useMarketsInfoData();

  const handleMarketSelect = useCallback(
    (tokenAddress: string, preferredTradeType?: PreferredTradeTypePickStrategy | undefined) => {
      setSearchKeyword("");
      close();

      const chosenMarket = chooseSuitableMarket(tokenAddress, preferredTradeType, tradeType);

      if (chosenMarket?.marketTokenAddress && chosenMarket.tradeType !== TradeType.Swap) {
        const marketInfo = getByKey(marketsInfoData, chosenMarket.marketTokenAddress);
        const nextTradeType = chosenMarket.tradeType;
        if (marketInfo) {
          const indexName = getMarketIndexName(marketInfo);
          const poolName = getMarketPoolName(marketInfo);
          helperToast.success(
            <Trans>
              <span>{nextTradeType === TradeType.Long ? t`Long` : t`Short`}</span>{" "}
              <div className="inline-flex">
                <span>{indexName}</span>
                <span className="subtext gm-toast leading-1">[{poolName}]</span>
              </div>{" "}
              <span>market selected</span>
            </Trans>
          );
        }
      }
    },
    [chooseSuitableMarket, close, marketsInfoData, tradeType]
  );

  const getMaxLongShortLiquidityPool = useTradeboxGetMaxLongShortLiquidityPool();

  const rowVerticalPadding = isMobile ? "py-8" : cx("py-4 group-last-of-type/row:pb-8");
  const rowHorizontalPadding = isSmallMobile ? cx("px-6 first-of-type:pl-15 last-of-type:pr-15") : "px-15";
  const thClassName = cx(
    "sticky top-0 bg-slate-800 text-left font-normal uppercase text-gray-400",
    rowVerticalPadding,
    rowHorizontalPadding
  );
  const tdClassName = cx("cursor-pointer rounded-4 hover:bg-cold-blue-900", rowVerticalPadding, rowHorizontalPadding);

  const localizedTabOptionLabels = useLocalizedMap(tabOptionLabels);

  const handleSetValue = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSearchKeyword(event.target.value);
    },
    [setSearchKeyword]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter" && filteredTokens && filteredTokens.length > 0) {
        const token = filteredTokens[0];
        handleMarketSelect(token.address);
      }
    },
    [filteredTokens, handleMarketSelect]
  );

  return (
    <>
      <SelectorBaseMobileHeaderContent>
        <SearchInput className="mt-15" value={searchKeyword} setValue={handleSetValue} onKeyDown={handleKeyDown} />
      </SelectorBaseMobileHeaderContent>
      <div
        className={cx("Synths-ChartTokenSelector", {
          "w-[448px]": !isMobile && !isSwap,
        })}
      >
        {!isMobile && (
          <>
            <SearchInput className="m-15" value={searchKeyword} setValue={handleSetValue} onKeyDown={handleKeyDown} />
            <div className="divider" />
          </>
        )}
        <Tab
          className="px-15 py-4"
          options={tabOptions}
          optionLabels={localizedTabOptionLabels}
          type="inline"
          option={tab}
          setOption={setTab}
        />

        <div
          className={cx({
            "max-h-svh overflow-x-auto": !isMobile,
          })}
        >
          <table className={cx("text-sm w-full")}>
            <thead className="bg-slate-800">
              <tr>
                <th className={thClassName} colSpan={2}>
                  <Trans>Market</Trans>
                </th>
                {!isSwap && (
                  <>
                    <th className={thClassName}>
                      <Trans>LONG LIQ.</Trans>
                    </th>
                    <th className={thClassName}>
                      <Trans>SHORT LIQ.</Trans>
                    </th>
                  </>
                )}
              </tr>
            </thead>

            <tbody>
              {filteredTokens?.map((token) => {
                const { maxLongLiquidityPool, maxShortLiquidityPool } = getMaxLongShortLiquidityPool(token);

                let formattedMaxLongLiquidity = formatUsdWithMobile(
                  !isSwap && maxLongLiquidityPool?.maxLongLiquidity,
                  isSmallMobile
                );

                let maxShortLiquidityPoolFormatted = formatUsdWithMobile(
                  !isSwap && maxShortLiquidityPool?.maxShortLiquidity,
                  isSmallMobile
                );

                const isFavorite = favoriteTokens?.includes(token.address);
                const handleFavoriteClick = () => {
                  if (isFavorite) {
                    setFavoriteTokens((favoriteTokens || []).filter((item) => item !== token.address));
                  } else {
                    setFavoriteTokens([...(favoriteTokens || []), token.address]);
                  }
                };

                return (
                  <tr key={token.symbol} className="group/row">
                    <td
                      className={cx("cursor-pointer rounded-4 pl-15 pr-4 hover:bg-cold-blue-900", rowVerticalPadding)}
                      onClick={handleFavoriteClick}
                    >
                      {isFavorite ? <FaStar className="text-gray-400" /> : <FaRegStar className="text-gray-400" />}
                    </td>
                    <td
                      className={cx(
                        "cursor-pointer rounded-4 pl-6 hover:bg-cold-blue-900",
                        rowVerticalPadding,
                        isSmallMobile ? "pr-6" : "pr-15"
                      )}
                      onClick={() => handleMarketSelect(token.address, "largestPosition")}
                    >
                      <span className="inline-flex items-center text-slate-100">
                        <TokenIcon
                          className="ChartToken-list-icon -my-5 mr-8"
                          symbol={token.symbol}
                          displaySize={16}
                          importSize={24}
                        />
                        {token.symbol} {!isSwap && "/ USD"}
                      </span>
                    </td>

                    {!isSwap && (
                      <>
                        <td
                          className={tdClassName}
                          onClick={() => {
                            handleMarketSelect(token.address, TradeType.Long);
                          }}
                        >
                          {formattedMaxLongLiquidity}
                        </td>
                        <td
                          className={tdClassName}
                          onClick={() => {
                            handleMarketSelect(token.address, TradeType.Short);
                          }}
                        >
                          {maxShortLiquidityPoolFormatted}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {options && options.length > 0 && !filteredTokens?.length && (
            <div className="py-15 text-center text-gray-400">
              <Trans>No markets matched.</Trans>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function formatUsdWithMobile(amount: bigint | undefined | false, isSmallMobile: boolean) {
  if (amount === undefined || amount === false) {
    return "";
  }

  if (isSmallMobile) {
    return formatAmountHuman(amount, USD_DECIMALS, true);
  }

  return formatUsd(amount)!;
}
