import { Popover } from "@headlessui/react";
import { t } from "@lingui/macro";
import cx from "classnames";
import SearchInput from "components/SearchInput/SearchInput";
import TokenIcon from "components/TokenIcon/TokenIcon";
import { convertTokenAddress } from "config/tokens";
import { getAvailableUsdLiquidityForPosition } from "domain/synthetics/markets";
import { PositionsInfoData } from "domain/synthetics/positions";
import { AvailableTokenOptions, TradeType } from "domain/synthetics/trade";
import { Token } from "domain/tokens";
import { BigNumber } from "ethers";
import { formatUsd } from "lib/numbers";
import groupBy from "lodash/groupBy";
import { useMemo, useState } from "react";
import { FaChevronDown } from "react-icons/fa";
import "./ChartTokenSelector.scss";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { selectTradeboxTradeFlags } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";

type TokenOption = Token & {
  maxLongLiquidity: BigNumber;
  maxShortLiquidity: BigNumber;
  marketTokenAddress: string;
  indexTokenAddress: string;
};

type Props = {
  chainId: number;
  selectedToken: Token | undefined;
  onSelectToken: (address: string, marketAddress?: string, tradeType?: TradeType) => void;
  options: Token[] | undefined;
  avaialbleTokenOptions: AvailableTokenOptions;
  positionsInfo?: PositionsInfoData;
};

export default function ChartTokenSelector(props: Props) {
  const { chainId, options, selectedToken, onSelectToken, avaialbleTokenOptions, positionsInfo } = props;
  const { sortedAllMarkets } = avaialbleTokenOptions;
  const { isSwap, isLong, isShort } = useSelector(selectTradeboxTradeFlags);
  const [searchKeyword, setSearchKeyword] = useState("");

  const onSelect = (token: { indexTokenAddress: string; marketTokenAddress?: string; tradeType?: TradeType }) => {
    onSelectToken(token.indexTokenAddress, token.marketTokenAddress, token.tradeType);
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
        maxLongLiquidity: maxLongLiquidity.gt(0) ? maxLongLiquidity : BigNumber.from(0),
        maxShortLiquidity: maxShortLiquidity.gt(0) ? maxShortLiquidity : BigNumber.from(0),
        marketTokenAddress: marketInfo.marketTokenAddress,
        indexTokenAddress: marketInfo.indexTokenAddress,
      };
    });
    const groupedMarketsWithIndex: { [marketAddress: string]: TokenOption[] } = groupBy(
      marketsWithMaxReservedUsd as any,
      (market) => market.indexTokenAddress
    );

    return groupedMarketsWithIndex;
  }, [sortedAllMarkets]);

  function handleMarketSelect(token: Token, maxLongLiquidityPool: TokenOption, maxShortLiquidityPool: TokenOption) {
    const tokenAddress = convertTokenAddress(chainId, token.address, "wrapped");

    if (tokenAddress === selectedToken?.address) return;

    if (isSwap) {
      onSelect({
        indexTokenAddress: token.address,
      });
      return;
    }

    const currentExistingPositions = Object.values(positionsInfo || {}).filter((position) => {
      if (position.isLong === isLong) {
        return convertTokenAddress(chainId, position.marketInfo.indexTokenAddress, "wrapped") === tokenAddress;
      }
      return false;
    });

    let marketTokenAddress;
    const largestExistingPosition =
      Array.isArray(currentExistingPositions) && currentExistingPositions.length
        ? currentExistingPositions.reduce((max, current) => (max.sizeInUsd.gt(current.sizeInUsd) ? max : current))
        : undefined;

    if (largestExistingPosition) {
      marketTokenAddress = largestExistingPosition?.marketInfo.marketTokenAddress;
    } else {
      if (isLong) {
        marketTokenAddress = maxLongLiquidityPool?.marketTokenAddress;
      }

      if (isShort) {
        marketTokenAddress = maxShortLiquidityPool?.marketTokenAddress;
      }
    }

    onSelect({
      indexTokenAddress: token.address,
      marketTokenAddress,
    });
  }

  function getMaxLongShortLiquidityPool(token: Token) {
    const indexTokenAddress = token.isNative ? token.wrappedAddress : token.address;
    const currentMarkets = groupedIndexMarkets[indexTokenAddress!];
    const maxLongLiquidityPool = currentMarkets?.reduce((prev, current) => {
      if (!prev.maxLongLiquidity || !current.maxLongLiquidity) return current;
      return prev.maxLongLiquidity.gt(current.maxLongLiquidity) ? prev : current;
    });

    const maxShortLiquidityPool = currentMarkets?.reduce((prev, current) => {
      if (!prev.maxShortLiquidity || !current.maxShortLiquidity) return current;
      return prev.maxShortLiquidity.gt(current.maxShortLiquidity) ? prev : current;
    });
    return {
      maxLongLiquidityPool,
      maxShortLiquidityPool,
    };
  }

  return (
    <Popover className="Synths-ChartTokenSelector">
      {({ open, close }) => {
        if (!open && searchKeyword.length > 0) setSearchKeyword("");
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
                    {selectedToken.symbol} {"/ USD"}
                  </span>
                )}
                <FaChevronDown fontSize={14} />
              </button>
            </Popover.Button>
            <div className="chart-token-menu">
              <Popover.Panel as="div" className={cx("menu-items chart-token-menu-items", { isSwap: isSwap })}>
                <SearchInput
                  className="m-md"
                  value={searchKeyword}
                  setValue={({ target }) => setSearchKeyword(target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && filteredTokens && filteredTokens.length > 0) {
                      const token = filteredTokens[0];
                      const { maxLongLiquidityPool, maxShortLiquidityPool } = getMaxLongShortLiquidityPool(token);
                      handleMarketSelect(token, maxLongLiquidityPool, maxShortLiquidityPool);
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
                      {filteredTokens?.map((token) => {
                        const { maxLongLiquidityPool, maxShortLiquidityPool } = getMaxLongShortLiquidityPool(token);
                        return (
                          <Popover.Button
                            as="tr"
                            key={token.symbol}
                            className={isSwap ? "Swap-token-list" : "Position-token-list"}
                          >
                            <td
                              className="token-item"
                              onClick={() => handleMarketSelect(token, maxLongLiquidityPool, maxShortLiquidityPool)}
                            >
                              <span className="inline-items-center">
                                <TokenIcon
                                  className="ChartToken-list-icon"
                                  symbol={token.symbol}
                                  displaySize={16}
                                  importSize={24}
                                />
                                {token.symbol} {!isSwap && "/ USD"}
                              </span>
                            </td>

                            <td
                              onClick={() => {
                                onSelect({
                                  indexTokenAddress: token.address,
                                  marketTokenAddress: maxLongLiquidityPool?.marketTokenAddress,
                                  tradeType: TradeType.Long,
                                });
                              }}
                            >
                              {!isSwap && maxLongLiquidityPool ? formatUsd(maxLongLiquidityPool?.maxLongLiquidity) : ""}
                            </td>
                            <td
                              onClick={() => {
                                onSelect({
                                  indexTokenAddress: token.address,
                                  marketTokenAddress: maxShortLiquidityPool?.marketTokenAddress,
                                  tradeType: TradeType.Short,
                                });
                              }}
                            >
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
