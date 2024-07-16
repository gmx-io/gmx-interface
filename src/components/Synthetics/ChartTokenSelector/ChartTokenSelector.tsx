import { Popover } from "@headlessui/react";
import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import SearchInput from "components/SearchInput/SearchInput";
import TokenIcon from "components/TokenIcon/TokenIcon";
import { useMarketsInfoData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import {
  useTradeboxChooseSuitableMarket,
  useTradeboxGetMaxLongShortLiquidityPool,
} from "context/SyntheticsStateContext/hooks/tradeboxHooks";
import { selectTradeboxTradeType } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { PreferredTradeTypePickStrategy } from "domain/synthetics/markets/chooseSuitableMarket";
import { getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets/utils";
import { TradeType } from "domain/synthetics/trade";
import { Token } from "domain/tokens";
import { helperToast } from "lib/helperToast";
import { formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import { useCallback, useState } from "react";
import { FaChevronDown } from "react-icons/fa";
import "./ChartTokenSelector.scss";

type Props = {
  selectedToken: Token | undefined;
  options: Token[] | undefined;
};

export default function ChartTokenSelector(props: Props) {
  const { options, selectedToken } = props;

  const tradeType = useSelector(selectTradeboxTradeType);
  const [searchKeyword, setSearchKeyword] = useState("");

  const isSwap = tradeType === TradeType.Swap;

  const filteredTokens: Token[] | undefined = options?.filter((item) => {
    return (
      item.name.toLowerCase().indexOf(searchKeyword.toLowerCase()) > -1 ||
      item.symbol.toLowerCase().indexOf(searchKeyword.toLowerCase()) > -1
    );
  });

  const chooseSuitableMarket = useTradeboxChooseSuitableMarket();
  const marketsInfoData = useMarketsInfoData();

  const handleMarketSelect = useCallback(
    (tokenAddress: string, preferredTradeType?: PreferredTradeTypePickStrategy | undefined) => {
      setSearchKeyword("");
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
    [chooseSuitableMarket, marketsInfoData, tradeType]
  );

  const getMaxLongShortLiquidityPool = useTradeboxGetMaxLongShortLiquidityPool();

  return (
    <Popover className="Synths-ChartTokenSelector">
      {({ open, close }) => {
        if (!open && searchKeyword.length > 0) setSearchKeyword("");
        return (
          <>
            <Popover.Button as="div">
              <button className={cx("chart-token-selector", { "chart-token-label--active": open })}>
                {selectedToken && (
                  <span className="chart-token-selector--current inline-flex items-center">
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
                  className="m-15"
                  value={searchKeyword}
                  setValue={({ target }) => setSearchKeyword(target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && filteredTokens && filteredTokens.length > 0) {
                      const token = filteredTokens[0];
                      handleMarketSelect(token.address);
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
                          <th>
                            <Trans>Market</Trans>
                          </th>
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
                              onClick={() => handleMarketSelect(token.address, "largestPosition")}
                            >
                              <span className="inline-flex items-center">
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
                                handleMarketSelect(token.address, TradeType.Long);
                              }}
                            >
                              {!isSwap && maxLongLiquidityPool ? formatUsd(maxLongLiquidityPool?.maxLongLiquidity) : ""}
                            </td>
                            <td
                              onClick={() => {
                                handleMarketSelect(token.address, TradeType.Short);
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
