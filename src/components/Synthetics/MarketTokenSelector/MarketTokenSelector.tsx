import "./MarketTokenSelector.scss";
import React, { useMemo, useState } from "react";
import { Popover } from "@headlessui/react";
import cx from "classnames";
import { FaChevronDown } from "react-icons/fa";
import SearchInput from "components/SearchInput/SearchInput";
import {
  MarketInfo,
  MarketTokensAPRData,
  MarketsInfoData,
  getMarketIndexName,
  getMarketPoolName,
  getMintableMarketTokens,
  getSellableMarketToken,
} from "domain/synthetics/markets";
import { TokensData } from "domain/synthetics/tokens";
import useSortedMarketsWithIndexToken from "domain/synthetics/trade/useSortedMarketsWithIndexToken";
import { getByKey } from "lib/objects";
import { formatAmount, formatTokenAmount, formatUsd } from "lib/numbers";
import TokenIcon from "components/TokenIcon/TokenIcon";
import { useHistory } from "react-router-dom";

type Props = {
  marketsInfoData?: MarketsInfoData;
  marketTokensData?: TokensData;
  marketsTokensAPRData?: MarketTokensAPRData;
  currentMarketInfo?: MarketInfo;
};

export default function MarketTokenSelector(props: Props) {
  const { marketsTokensAPRData, marketsInfoData, marketTokensData, currentMarketInfo } = props;
  const { markets: sortedMarketsByIndexToken } = useSortedMarketsWithIndexToken(marketsInfoData, marketTokensData);
  const [searchKeyword, setSearchKeyword] = useState("");
  const history = useHistory();
  const indexName = currentMarketInfo && getMarketIndexName(currentMarketInfo);
  const poolName = currentMarketInfo && getMarketPoolName(currentMarketInfo);

  const filteredTokens = useMemo(() => {
    if (sortedMarketsByIndexToken.length < 1) {
      return [];
    }
    if (searchKeyword.length < 1) {
      return sortedMarketsByIndexToken;
    }

    return sortedMarketsByIndexToken.filter((market) => {
      const marketInfo = getByKey(marketsInfoData, market?.address)!;
      return marketInfo.name.toLowerCase().indexOf(searchKeyword.toLowerCase()) > -1;
    });
  }, [marketsInfoData, searchKeyword, sortedMarketsByIndexToken]);

  const filteredTokensInfo = useMemo(() => {
    return filteredTokens.map((market) => {
      const marketInfo = getByKey(marketsInfoData, market?.address)!;
      const mintableInfo = getMintableMarketTokens(marketInfo, market);
      const sellableInfo = getSellableMarketToken(marketInfo, market);
      const apr = getByKey(marketsTokensAPRData, market?.address);
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
      };
    });
  }, [filteredTokens, marketsInfoData, marketsTokensAPRData]);

  function handleSelectToken(marketTokenAddress: string) {
    history.push({
      pathname: "/pools",
      search: `?market=${marketTokenAddress}`,
    });
  }

  return (
    <Popover className="MarketTokenSelector">
      {({ open, close }) => {
        if (!open && searchKeyword.length > 0) setSearchKeyword("");
        return (
          <div>
            <Popover.Button as="div">
              <button className={cx("chart-token-selector")}>
                <span className="chart-token-selector--current inline-items-center">
                  {currentMarketInfo && (
                    <>
                      <TokenIcon
                        className="chart-token-current-icon"
                        symbol={currentMarketInfo.isSpotOnly ? "swap" : currentMarketInfo.indexToken.symbol}
                        displaySize={30}
                        importSize={40}
                      />
                      <div className="Market-index-name">
                        <div className="items-center">
                          <span>GM{indexName && `: ${indexName}`}</span>
                          <span className="subtext">{poolName && `[${poolName}]`}</span>
                        </div>
                        <div className="Market-subtext">GMX Market Tokens</div>
                      </div>
                    </>
                  )}
                </span>
                <FaChevronDown fontSize={14} />
              </button>
            </Popover.Button>
            <div className="chart-token-menu">
              <Popover.Panel as="div" className="menu-items chart-token-menu-items">
                <SearchInput
                  className="m-md"
                  value={searchKeyword}
                  setValue={({ target }) => setSearchKeyword(target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && filteredTokens.length > 0) {
                      handleSelectToken(filteredTokens[0].address);
                      close();
                    }
                  }}
                  placeholder="Search Market"
                />
                <div className="divider" />
                <div className="chart-token-list">
                  <table>
                    {sortedMarketsByIndexToken.length > 0 && (
                      <thead className="table-head">
                        <tr>
                          <th>MARKET</th>
                          <th>BUYABLE</th>
                          <th>SELLABLE</th>
                          <th>APR</th>
                        </tr>
                      </thead>
                    )}
                    <tbody>
                      {filteredTokensInfo.map(
                        ({ market, mintableInfo, sellableInfo, apr, marketInfo, poolName, indexName }) => {
                          return (
                            <Popover.Button
                              as="tr"
                              key={market.address}
                              onClick={() => handleSelectToken(market.address)}
                            >
                              <td className="token-item">
                                <span className="inline-items-center">
                                  {marketInfo && (
                                    <>
                                      <TokenIcon
                                        className="ChartToken-list-icon"
                                        symbol={marketInfo.isSpotOnly ? "swap" : marketInfo.indexToken.symbol}
                                        displaySize={16}
                                        importSize={24}
                                      />
                                      <div className="items-center">
                                        <span>{indexName && indexName}</span>
                                        <span className="subtext lh-1">{poolName && `[${poolName}]`}</span>
                                      </div>
                                    </>
                                  )}
                                </span>
                              </td>
                              <td>
                                {formatUsd(mintableInfo?.mintableUsd, {
                                  displayDecimals: 0,
                                  fallbackToZero: true,
                                })}
                              </td>
                              <td>
                                {formatTokenAmount(sellableInfo?.totalAmount, market?.decimals, market?.symbol, {
                                  displayDecimals: 0,
                                  useCommas: true,
                                })}
                              </td>
                              <td>{apr ? `${formatAmount(apr, 2, 2)}%` : "..."}</td>
                            </Popover.Button>
                          );
                        }
                      )}
                    </tbody>
                  </table>
                </div>
              </Popover.Panel>
            </div>
          </div>
        );
      }}
    </Popover>
  );
}
