import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useMemo, useState } from "react";
import { useMedia } from "react-use";

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
import { USD_DECIMALS } from "lib/legacy";
import { formatAmountHuman, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";

import SearchInput from "components/SearchInput/SearchInput";
import TokenIcon from "components/TokenIcon/TokenIcon";
import { SelectorBase, useSelectorBaseStateManager } from "../SelectorBase/SelectorBase";

type Props = {
  selectedToken: Token | undefined;
  options: Token[] | undefined;
};

export default function ChartTokenSelector(props: Props) {
  const { options, selectedToken } = props;

  const isMobile = useMedia("(max-width: 1100px)");
  const isSmallMobile = useMedia("(max-width: 400px)");

  const selectorStateManager = useSelectorBaseStateManager();

  const tradeType = useSelector(selectTradeboxTradeType);
  const [searchKeyword, setSearchKeyword] = useState("");
  const isSwap = tradeType === TradeType.Swap;

  const filteredTokens: Token[] | undefined = useMemo(
    () =>
      options?.filter(
        (item) =>
          item.name.toLowerCase().indexOf(searchKeyword.toLowerCase()) > -1 ||
          item.symbol.toLowerCase().indexOf(searchKeyword.toLowerCase()) > -1
      ),
    [options, searchKeyword]
  );

  const chooseSuitableMarket = useTradeboxChooseSuitableMarket();
  const marketsInfoData = useMarketsInfoData();

  const handleMarketSelect = useCallback(
    (tokenAddress: string, preferredTradeType?: PreferredTradeTypePickStrategy | undefined) => {
      setSearchKeyword("");
      selectorStateManager.close();

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
    [chooseSuitableMarket, marketsInfoData, selectorStateManager, tradeType]
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

  const SearchInputMemoized = useCallback(
    (props: { className?: string }) => (
      <SearchInput
        className={props.className}
        value={searchKeyword}
        setValue={({ target }) => setSearchKeyword(target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && filteredTokens && filteredTokens.length > 0) {
            const token = filteredTokens[0];
            handleMarketSelect(token.address);
          }
        }}
      />
    ),
    [filteredTokens, handleMarketSelect, searchKeyword]
  );

  return (
    <SelectorBase
      manager={selectorStateManager}
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
      modalLabel={t`Token`}
      mobileModalHeaderContent={isMobile ? <SearchInputMemoized className="mt-15" /> : null}
      mobileModalContentPadding={false}
    >
      <div
        className={cx("Synths-ChartTokenSelector", {
          "w-[448px]": !isMobile && !isSwap,
        })}
      >
        {!isMobile && (
          <>
            <SearchInputMemoized className="m-15" />
            <div className="divider" />
          </>
        )}

        <div
          className={cx({
            "max-h-svh overflow-x-auto": !isMobile,
          })}
        >
          <table className={cx("text-sm w-full")}>
            {filteredTokens && filteredTokens.length > 0 && (
              <thead className="bg-slate-800">
                <tr>
                  <th className={thClassName}>
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
            )}
            <tbody>
              {filteredTokens?.map((token) => {
                const { maxLongLiquidityPool, maxShortLiquidityPool } = getMaxLongShortLiquidityPool(token);

                let formattedMaxLongLiquidity = "";
                if (!isSwap && maxLongLiquidityPool) {
                  if (isSmallMobile) {
                    formattedMaxLongLiquidity = formatAmountHuman(
                      maxLongLiquidityPool.maxLongLiquidity,
                      USD_DECIMALS,
                      true
                    );
                  } else {
                    formattedMaxLongLiquidity = formatUsd(maxLongLiquidityPool.maxLongLiquidity)!;
                  }
                }

                let maxShortLiquidityPoolFormatted = "";
                if (!isSwap && maxShortLiquidityPool) {
                  if (isSmallMobile) {
                    maxShortLiquidityPoolFormatted = formatAmountHuman(
                      maxShortLiquidityPool.maxShortLiquidity,
                      USD_DECIMALS,
                      true
                    );
                  } else {
                    maxShortLiquidityPoolFormatted = formatUsd(maxShortLiquidityPool.maxShortLiquidity)!;
                  }
                }

                return (
                  <tr key={token.symbol} className="group/row">
                    <td className={tdClassName} onClick={() => handleMarketSelect(token.address, "largestPosition")}>
                      <span className="inline-flex items-center text-slate-100">
                        <TokenIcon
                          className="ChartToken-list-icon mr-8"
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
        </div>
      </div>
    </SelectorBase>
  );
}
