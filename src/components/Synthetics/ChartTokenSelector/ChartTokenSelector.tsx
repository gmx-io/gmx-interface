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
import { getMaxReservedUsd } from "domain/synthetics/markets";
import { BigNumber } from "ethers";
import { formatUsd } from "lib/numbers";

type Label = {
  label: string;
  value: string;
};

type TokenOption = Token & {
  maxLongLiquidity: BigNumber;
  maxShortLiquidity: BigNumber;
  marketTokenAddress: string;
  indexTokenAddress: string;
};

type Props = {
  chainId: number;
  selectedToken: Label | undefined;
  onSelectToken: (address: string) => void;
  tradeFlags?: TradeFlags;
  options: Token[] | undefined;
  className?: string;
  avaialbleTokenOptions: AvailableTokenOptions;
  onSelectMarketAddress: (marketAddress?: string) => void;
};

export default function ChartTokenSelector(props: Props) {
  const { options, selectedToken, onSelectToken, tradeFlags, avaialbleTokenOptions } = props;
  const { sortedAllMarkets } = avaialbleTokenOptions;
  const { isSwap } = tradeFlags || {};
  const [searchKeyword, setSearchKeyword] = useState("");

  const onSelect = (token: { indexTokenAddress: string; marketTokenAddress?: string }) => {
    onSelectToken(token.indexTokenAddress);

    // if (token.marketTokenAddress) {
    //   onSelectMarketAddress(token.marketTokenAddress);
    // }
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
      const maxLongLiquidity = getMaxReservedUsd(marketInfo, true);
      const maxShortLiquidity = getMaxReservedUsd(marketInfo, false);

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
                    <TokenIcon className="chart-token-current-icon" symbol={"ETH"} displaySize={20} importSize={24} />
                    {selectedToken.label}
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
                          <th>{!isSwap && t`Long Liquidity`}</th>
                          <th>{!isSwap && t`Short Liquidity`}</th>
                        </tr>
                      </thead>
                    )}
                    <tbody>
                      {filteredTokens?.map((option) => {
                        const currentMarkets = groupedIndexMarkets[option.address];
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
                            <td>{!isSwap ? formatUsd(maxLongLiquidityPool?.maxLongLiquidity) : ""}</td>
                            <td>{!isSwap ? formatUsd(maxShortLiquidityPool?.maxShortLiquidity) : ""}</td>
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
