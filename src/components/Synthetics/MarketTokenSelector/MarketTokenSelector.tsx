import { Trans, msg, t } from "@lingui/macro";
import cx from "classnames";
import { useMemo, useState } from "react";
import { FaRegStar, FaStar } from "react-icons/fa";
import { useHistory } from "react-router-dom";
import { useMedia } from "react-use";

import { GM_TOKEN_SELECTOR_FAVORITE_TOKENS_KEY, GM_TOKEN_SELECTOR_FILTER_TAB_KEY } from "config/localStorage";
import { getNormalizedTokenSymbol } from "config/tokens";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import {
  MarketInfo,
  MarketTokensAPRData,
  MarketsInfoData,
  getMarketIndexName,
  getMarketPoolName,
  getMintableMarketTokens,
  getSellableMarketToken,
} from "domain/synthetics/markets";
import { TokenData, TokensData } from "domain/synthetics/tokens";
import useSortedPoolsWithIndexToken from "domain/synthetics/trade/useSortedPoolsWithIndexToken";
import { useLocalizedMap } from "lib/i18n";
import { USD_DECIMALS } from "lib/legacy";
import { useLocalStorageByChainId } from "lib/localStorage";
import { formatAmountHuman, formatTokenAmount, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";

import { AprInfo } from "components/AprInfo/AprInfo";
import SearchInput from "components/SearchInput/SearchInput";
import Tab from "components/Tab/Tab";
import TokenIcon from "components/TokenIcon/TokenIcon";
import {
  SELECTOR_BASE_MOBILE_THRESHOLD,
  SelectorBase,
  SelectorBaseMobileHeaderContent,
  useSelectorClose,
} from "../SelectorBase/SelectorBase";

type Props = {
  marketsInfoData?: MarketsInfoData;
  marketTokensData?: TokensData;
  marketsTokensAPRData?: MarketTokensAPRData;
  marketsTokensIncentiveAprData?: MarketTokensAPRData;
  // eslint-disable-next-line react/no-unused-prop-types
  currentMarketInfo?: MarketInfo;
};

type TabOption = "all" | "favorites";
const tabOptions = ["all", "favorites"];
const tabOptionLabels = {
  all: msg({
    message: "All",
    comment: "GM market token selector all markets filter",
  }),
  favorites: msg`Favorites`,
};

export default function MarketTokenSelector(props: Props) {
  const { marketsTokensIncentiveAprData, marketsTokensAPRData, marketsInfoData, marketTokensData, currentMarketInfo } =
    props;
  const indexName = currentMarketInfo && getMarketIndexName(currentMarketInfo);
  const poolName = currentMarketInfo && getMarketPoolName(currentMarketInfo);

  const iconName = currentMarketInfo?.isSpotOnly
    ? getNormalizedTokenSymbol(currentMarketInfo.longToken.symbol) +
      getNormalizedTokenSymbol(currentMarketInfo.shortToken.symbol)
    : currentMarketInfo?.indexToken.symbol;

  return (
    <SelectorBase
      handleClassName="inline-block"
      popoverYOffset={18}
      popoverXOffset={-8}
      popoverPlacement="bottom-start"
      label={
        <div className="inline-flex items-center">
          {currentMarketInfo ? (
            <>
              <TokenIcon className="mr-8" symbol={iconName} displaySize={30} importSize={40} />
              <div>
                <div className="flex items-center text-16">
                  <span>GM{indexName && `: ${indexName}`}</span>
                  <span className="ml-3 text-12 text-gray-300 group-hover/selector-base:text-[color:inherit]">
                    {poolName && `[${poolName}]`}
                  </span>
                </div>
                <div className="text-12 text-gray-400 group-hover/selector-base:text-[color:inherit]">
                  GMX Market Tokens
                </div>
              </div>
            </>
          ) : (
            "..."
          )}
        </div>
      }
      modalLabel={t`GMX Market Tokens`}
      mobileModalContentPadding={false}
    >
      <MarketTokenSelectorInternal
        marketsTokensIncentiveAprData={marketsTokensIncentiveAprData}
        marketsTokensAPRData={marketsTokensAPRData}
        marketsInfoData={marketsInfoData}
        marketTokensData={marketTokensData}
        currentMarketInfo={currentMarketInfo}
      />
    </SelectorBase>
  );
}

function MarketTokenSelectorInternal(props: Props) {
  const chainId = useSelector(selectChainId);
  const { marketsTokensIncentiveAprData, marketsTokensAPRData, marketsInfoData, marketTokensData } = props;
  const { markets: sortedMarketsByIndexToken } = useSortedPoolsWithIndexToken(marketsInfoData, marketTokensData);
  const [searchKeyword, setSearchKeyword] = useState("");
  const history = useHistory();

  const [tab, setTab] = useLocalStorageByChainId<TabOption>(chainId, GM_TOKEN_SELECTOR_FILTER_TAB_KEY, "all");
  const [favoriteTokens, setFavoriteTokens] = useLocalStorageByChainId<string[]>(
    chainId,
    GM_TOKEN_SELECTOR_FAVORITE_TOKENS_KEY,
    []
  );

  const filteredTokensInfo = useMemo(() => {
    if (sortedMarketsByIndexToken.length < 1) {
      return [];
    }

    let filteredTokens: TokenData[];
    if (searchKeyword.length < 1 && tab === "all") {
      filteredTokens = sortedMarketsByIndexToken;
    } else {
      filteredTokens = sortedMarketsByIndexToken.filter((market) => {
        const marketInfo = getByKey(marketsInfoData, market?.address)!;
        let textSearchMatch = false;
        if (!searchKeyword.trim()) {
          textSearchMatch = true;
        } else {
          textSearchMatch = marketInfo.name.toLowerCase().includes(searchKeyword.toLowerCase());
        }

        const favoriteMatch = tab === "favorites" ? favoriteTokens?.includes(market.address) : true;

        return textSearchMatch && favoriteMatch;
      });
    }

    return filteredTokens.map((market) => {
      const marketInfo = getByKey(marketsInfoData, market?.address)!;
      const mintableInfo = getMintableMarketTokens(marketInfo, market);
      const sellableInfo = getSellableMarketToken(marketInfo, market);
      const apr = getByKey(marketsTokensAPRData, market?.address);
      const incentiveApr = getByKey(marketsTokensIncentiveAprData, marketInfo?.marketTokenAddress);
      const indexName = getMarketIndexName(marketInfo);
      const poolName = getMarketPoolName(marketInfo);
      return {
        market,
        mintableInfo,
        sellableInfo,
        marketInfo,
        indexName,
        poolName,
        apr,
        incentiveApr,
      };
    });
  }, [
    favoriteTokens,
    marketsInfoData,
    marketsTokensAPRData,
    marketsTokensIncentiveAprData,
    searchKeyword,
    sortedMarketsByIndexToken,
    tab,
  ]);

  const close = useSelectorClose();

  function handleSelectToken(marketTokenAddress: string) {
    close();
    history.push({
      pathname: "/pools",
      search: `?market=${marketTokenAddress}`,
    });
  }

  const isMobile = useMedia(`(max-width: ${SELECTOR_BASE_MOBILE_THRESHOLD}px)`);
  const isSmallMobile = useMedia("(max-width: 400px)");

  const rowVerticalPadding = isMobile ? "py-8" : cx("py-4 group-last-of-type/row:pb-8");
  const rowHorizontalPadding = isSmallMobile ? cx("px-6 first-of-type:pl-15 last-of-type:pr-15") : "px-15";
  const thClassName = cx(
    "sticky top-0 bg-slate-800 text-left font-normal uppercase text-gray-400",
    rowVerticalPadding,
    rowHorizontalPadding
  );
  const tdClassName = cx(rowVerticalPadding, rowHorizontalPadding);

  const localizedTabOptionLabels = useLocalizedMap(tabOptionLabels);

  return (
    <div>
      <SelectorBaseMobileHeaderContent>
        <SearchInput
          className="mt-15"
          value={searchKeyword}
          setValue={({ target }) => setSearchKeyword(target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && filteredTokensInfo.length > 0) {
              handleSelectToken(filteredTokensInfo[0].market.address);
            }
          }}
          placeholder="Search Market"
        />
      </SelectorBaseMobileHeaderContent>
      {!isMobile && (
        <>
          <SearchInput
            className="m-15"
            value={searchKeyword}
            setValue={({ target }) => setSearchKeyword(target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && filteredTokensInfo.length > 0) {
                handleSelectToken(filteredTokensInfo[0].market.address);
              }
            }}
            placeholder="Search Market"
          />
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

      <div>
        <table className="w-full">
          {sortedMarketsByIndexToken.length > 0 && (
            <thead>
              <tr>
                <th className={thClassName} colSpan={2}>
                  MARKET
                </th>
                <th className={cx(thClassName, "relative")}>
                  <span
                    className={cx("absolute inset-0 truncate", isSmallMobile ? "px-6" : "px-15", rowVerticalPadding)}
                  >
                    BUYABLE
                  </span>
                </th>
                <th className={cx(thClassName, "relative")}>
                  <span
                    className={cx("absolute inset-0 truncate", isSmallMobile ? "px-6" : "px-15", rowVerticalPadding)}
                  >
                    SELLABLE
                  </span>
                </th>
                <th className={thClassName}>APY</th>
              </tr>
            </thead>
          )}
          <tbody>
            {filteredTokensInfo.map(
              ({ market, mintableInfo, sellableInfo, apr, incentiveApr, marketInfo, poolName, indexName }) => {
                const { indexToken, longToken, shortToken } = marketInfo;
                const iconName = marketInfo.isSpotOnly
                  ? getNormalizedTokenSymbol(longToken.symbol) + getNormalizedTokenSymbol(shortToken.symbol)
                  : getNormalizedTokenSymbol(indexToken.symbol);

                const isFavorite = favoriteTokens?.includes(market.address);
                const handleFavoriteClick = () => {
                  if (isFavorite) {
                    setFavoriteTokens((favoriteTokens || []).filter((item) => item !== market.address));
                  } else {
                    setFavoriteTokens([...(favoriteTokens || []), market.address]);
                  }
                };

                const handleSelect = () => handleSelectToken(market.address);

                const formattedMintableUsd = isSmallMobile
                  ? formatAmountHuman(mintableInfo?.mintableUsd, USD_DECIMALS, true)
                  : formatUsd(mintableInfo?.mintableUsd, {
                      displayDecimals: 0,
                      fallbackToZero: true,
                    });

                const formattedSellableAmount = isSmallMobile
                  ? formatAmountHuman(sellableInfo?.totalAmount, market?.decimals, true)
                  : formatTokenAmount(sellableInfo?.totalAmount, market?.decimals, market?.symbol, {
                      displayDecimals: 0,
                      useCommas: true,
                    });

                return (
                  <tr key={market.address} className="group/row cursor-pointer hover:bg-cold-blue-900">
                    <td
                      className={cx("rounded-4 pl-15 pr-4 hover:bg-cold-blue-700", rowVerticalPadding)}
                      onClick={handleFavoriteClick}
                    >
                      {isFavorite ? <FaStar className="text-gray-400" /> : <FaRegStar className="text-gray-400" />}
                    </td>
                    <td
                      className={cx("rounded-4 pl-6", rowVerticalPadding, isSmallMobile ? "pr-6" : "pr-15")}
                      onClick={handleSelect}
                    >
                      <span className="inline-flex items-center">
                        {marketInfo && (
                          <>
                            <TokenIcon className="-my-5 mr-8" symbol={iconName} displaySize={16} importSize={40} />
                            <div className="inline-flex flex-wrap items-center">
                              <span>{indexName && indexName}</span>
                              <span className="subtext leading-1">{poolName && `[${poolName}]`}</span>
                            </div>
                          </>
                        )}
                      </span>
                    </td>
                    <td className={tdClassName} onClick={handleSelect}>
                      {formattedMintableUsd}
                    </td>
                    <td className={tdClassName} onClick={handleSelect}>
                      {formattedSellableAmount}
                    </td>
                    <td className={tdClassName} onClick={handleSelect}>
                      <AprInfo apy={apr} incentiveApr={incentiveApr} showTooltip={false} />
                    </td>
                  </tr>
                );
              }
            )}
          </tbody>
        </table>
        {sortedMarketsByIndexToken.length > 0 && !filteredTokensInfo?.length && (
          <div className="py-15 text-center text-gray-400">
            <Trans>No markets matched.</Trans>
          </div>
        )}
      </div>
    </div>
  );
}
