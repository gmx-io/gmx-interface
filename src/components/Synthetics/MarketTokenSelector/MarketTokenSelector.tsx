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
} from "domain/synthetics/markets";
import { TokensData } from "domain/synthetics/tokens";
import useSortedMarketsWithIndexToken from "domain/synthetics/trade/useSortedMarketsWithIndexToken";
import { getByKey } from "lib/objects";
import { formatAmount, formatTokenAmount } from "lib/numbers";
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
  const sortedMarketsByIndexToken = useSortedMarketsWithIndexToken(marketsInfoData, marketTokensData);
  const [searchKeyword, setSearchKeyword] = useState("");
  const history = useHistory();

  const filteredTokens = useMemo(() => {
    return sortedMarketsByIndexToken.filter((market) => {
      const marketInfo = getByKey(marketsInfoData, market?.address)!;
      return marketInfo.name.toLowerCase().indexOf(searchKeyword.toLowerCase()) > -1;
    });
  }, [marketsInfoData, searchKeyword, sortedMarketsByIndexToken]);

  return (
    <Popover className="MarketTokenSelector">
      {({ open }) => {
        if (!open && searchKeyword.length > 0) setSearchKeyword("");
        return (
          <>
            <Popover.Button as="div" className="Market-dropdown-btn">
              <button className={cx("chart-token-selector", { "chart-token-label--active": open })}>
                <span className="chart-token-selector--current inline-items-center">
                  {currentMarketInfo && (
                    <>
                      <TokenIcon
                        className="chart-token-current-icon"
                        symbol={currentMarketInfo.isSpotOnly ? "swap" : currentMarketInfo.indexToken.symbol}
                        displaySize={20}
                        importSize={24}
                      />
                      {currentMarketInfo.name}
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
                  onKeyDown={(e) => {}}
                  placeholder="Search Market"
                />
                <div className="divider" />
                <div className="chart-token-list">
                  <table>
                    {sortedMarketsByIndexToken.length > 0 && (
                      <thead className="table-head">
                        <tr>
                          <th>MARKET</th>
                          <th>MINTABLE</th>
                          <th>SELLABLE</th>
                          <th>APR</th>
                        </tr>
                      </thead>
                    )}
                    <tbody>
                      {filteredTokens.map((market) => {
                        const marketInfoData = getByKey(marketsInfoData, market?.address)!;
                        const mintableInfo =
                          market && marketInfoData ? getMintableMarketTokens(marketInfoData, market) : undefined;
                        const apr = getByKey(marketsTokensAPRData, market?.address);
                        const indexToken = marketInfoData?.indexToken;
                        const indexName = getMarketIndexName(marketInfoData);
                        const poolName = getMarketPoolName(marketInfoData);
                        return (
                          <Popover.Button
                            as="tr"
                            key={market.address}
                            onClick={() => {
                              history.push({
                                pathname: "/pools",
                                search: `?market=${market.address}`,
                              });
                            }}
                          >
                            <td className="token-item">
                              <span className="inline-items-center">
                                <TokenIcon
                                  className="ChartToken-list-icon"
                                  symbol={marketInfoData.isSpotOnly ? "swap" : indexToken.symbol}
                                  displaySize={16}
                                  importSize={24}
                                />
                                <div className="items-center">
                                  <span>{indexName && indexName}</span>
                                  <span className="subtext lh-1">{poolName && `[${poolName}]`}</span>
                                </div>
                              </span>
                            </td>
                            <td>
                              {formatTokenAmount(mintableInfo?.mintableAmount, market.decimals, "GM", {
                                useCommas: true,
                                displayDecimals: 0,
                              })}
                            </td>
                            <td>
                              {formatTokenAmount(mintableInfo?.mintableAmount, market.decimals, "GM", {
                                useCommas: true,
                                displayDecimals: 0,
                              })}
                            </td>
                            <td>{apr ? `${formatAmount(apr, 2, 2)}%` : "..."}</td>
                          </Popover.Button>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Popover.Panel>
            </div>
          </>
        );
      }}
    </Popover>
  );
}
