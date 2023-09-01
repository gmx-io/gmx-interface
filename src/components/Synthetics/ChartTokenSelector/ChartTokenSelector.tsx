import React, { useMemo, useState } from "react";
import { Popover } from "@headlessui/react";
import cx from "classnames";
import groupBy from "lodash/groupBy";
import { FaChevronDown } from "react-icons/fa";
import "./ChartTokenSelector.scss";
import { Token } from "domain/tokens";
import SearchInput from "components/SearchInput/SearchInput";
import TokenIcon from "components/TokenIcon/TokenIcon";
import { t } from "@lingui/macro";
import { TradeFlags } from "domain/synthetics/trade/useTradeFlags";
import { AvailableTokenOptions } from "domain/synthetics/trade";
import { getAvailableUsdLiquidityForPosition } from "domain/synthetics/markets";
import { BigNumber } from "ethers";
import { formatUsd } from "lib/numbers";

type TokenOption = Token & {
  maxLongLiquidity: BigNumber;
  maxShortLiquidity: BigNumber;
  marketTokenAddress: string;
  indexTokenAddress: string;
};

type Props = {
  chainId: number;
  selectedToken: Token | undefined;
  onSelectToken: (address: string, marketAddress?: string) => void;
  tradeFlags?: TradeFlags;
  options: Token[] | undefined;
  className?: string;
  avaialbleTokenOptions: AvailableTokenOptions;
};

export default function ChartTokenSelector(props: Props) {
  const { options, selectedToken, onSelectToken, tradeFlags, avaialbleTokenOptions } = props;
  const { sortedAllMarkets } = avaialbleTokenOptions;
  const { isSwap, isLong } = tradeFlags || {};
  const [searchKeyword, setSearchKeyword] = useState("");

  const onSelect = (token: { indexTokenAddress: string; marketTokenAddress?: string }) => {
    onSelectToken(token.indexTokenAddress, token.marketTokenAddress);
    setSearchKeyword("");
  };

  const filteredTokens: Token[] | undefined = options?.filter((item) => {
    return (
      item.name.toLowerCase().indexOf(searchKeyword.toLowerCase()) > -1 ||
      item.symbol.toLowerCase().indexOf(searchKeyword.toLowerCase()) > -1
    );
  });

  const groupedIndexMarkets = useMemo(() => {
    const marketsWithMaxReservedUsd = sortedAllMarkets.map((marketInfo) => {
      const maxLongLiquidity = getAvailableUsdLiquidityForPosition(marketInfo, true);
      const maxShortLiquidity = getAvailableUsdLiquidityForPosition(marketInfo, false);

      return {
        maxLongLiquidity,
        maxShortLiquidity,
        marketTokenAddress: marketInfo.marketTokenAddress,
        indexTokenAddress: marketInfo.indexTokenAddress,
      };
    });
    const groupedMarketsWithIndex: { [marketAddress: string]: TokenOption[] } = groupBy(
      marketsWithMaxReservedUsd,
      (market) => market.indexTokenAddress
    );

    return groupedMarketsWithIndex;
  }, [sortedAllMarkets]);

  return (
    <Popover>
      {({ open, close }) => {
        if (!open) setSearchKeyword("");
        return (
          <>
            <Popover.Button as="div">
              <button className={cx("chart-token-selector", { "chart-token-label--active": open })}>
                {selectedToken && (
                  <span className="chart-token-selector--current inline-items-center">
                    <TokenIcon
                      className="chart-token-current-icon"
                      symbol={selectedToken.symbol}
                      displaySize={20}
                      importSize={24}
                    />
                    {selectedToken.symbol} {!isSwap && "/ USD"}
                  </span>
                )}
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
                    if (e.key === "Enter" && filteredTokens && filteredTokens.length > 0) {
                      onSelect({
                        indexTokenAddress: filteredTokens[0].address,
                      });
                      close();
                    }
                  }}
                />
                <div className="divider" />
                <div className="chart-token-list">
                  <table>
                    {filteredTokens && filteredTokens.length > 0 && (
                      <thead className="table-head">
                        <tr>
                          <th>Market</th>
                          <th>{!isSwap && t`LONG LIQ.`}</th>
                          <th>{!isSwap && t`SHORT LIQ.`}</th>
                        </tr>
                      </thead>
                    )}
                    <tbody>
                      {filteredTokens?.map((option) => {
                        const indexTokenAddress = option.isNative ? option.wrappedAddress : option.address;
                        const currentMarkets = groupedIndexMarkets[indexTokenAddress!];
                        const maxLongLiquidityPool = currentMarkets?.reduce((prev, current) => {
                          if (!prev.maxLongLiquidity || !current.maxLongLiquidity) return current;
                          return prev.maxLongLiquidity.gt(current.maxLongLiquidity) ? prev : current;
                        });

                        const maxShortLiquidityPool = currentMarkets?.reduce((prev, current) => {
                          if (!prev.maxShortLiquidity || !current.maxShortLiquidity) return current;
                          return prev.maxShortLiquidity.gt(current.maxShortLiquidity) ? prev : current;
                        });

                        return (
                          <Popover.Button
                            as="tr"
                            key={option.symbol}
                            onClick={() =>
                              onSelect({
                                indexTokenAddress: option.address,
                                marketTokenAddress: isLong
                                  ? maxLongLiquidityPool?.marketTokenAddress
                                  : maxShortLiquidityPool?.marketTokenAddress,
                              })
                            }
                          >
                            <td className="token-item">
                              <span className="inline-items-center">
                                <TokenIcon
                                  className="ChartToken-list-icon"
                                  symbol={option.symbol}
                                  displaySize={16}
                                  importSize={24}
                                />
                                {option.symbol} {!isSwap && "/ USD"}
                              </span>
                            </td>
                            <td>
                              {!isSwap && maxLongLiquidityPool ? formatUsd(maxLongLiquidityPool?.maxLongLiquidity) : ""}
                            </td>
                            <td>
                              {!isSwap && maxShortLiquidityPool
                                ? formatUsd(maxShortLiquidityPool?.maxShortLiquidity)
                                : ""}
                            </td>
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
