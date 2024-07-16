import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import React, { useCallback } from "react";
import { useMedia } from "react-use";

import { numberToState } from "components/Synthetics/TradeHistory/TradeHistoryRow/utils/shared";
import { getMarketPoolName } from "domain/synthetics/markets/utils";
import type { MarketStat } from "domain/synthetics/stats/marketsInfoDataToIndexTokensStats";
import { TradeType } from "domain/synthetics/trade";
import { formatPercentage, formatRatePercentage, formatUsd } from "lib/numbers";
import type { MarketLiquidityAndFeeStat } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";

import TokenIcon from "components/TokenIcon/TokenIcon";
import {
  SelectorBase,
  SelectorBaseDesktopRow,
  SelectorBaseMobileButton,
  SelectorBaseMobileList,
  SelectorBaseTableHeadRow,
  useSelectorClose,
} from "../SelectorBase/SelectorBase";

import "./PoolSelector2.scss";

type Props = {
  // eslint-disable-next-line react/no-unused-prop-types
  selectedPoolName: string | undefined;
  options: MarketStat[] | undefined;
  positionStats: {
    [marketTokenAddress: string]: MarketLiquidityAndFeeStat;
  };
  tradeType: TradeType;
  onSelect: (marketAddress: string) => void;
};

export function PoolSelector2(props: Props) {
  const isMobile = useMedia("(max-width: 1100px)");
  const disabled = props.options?.length === 1;

  return (
    <SelectorBase label={props.selectedPoolName} modalLabel={t`Select pool`} disabled={disabled}>
      {isMobile ? <PoolSelector2Mobile {...props} /> : <PoolSelector2Desktop {...props} />}
    </SelectorBase>
  );
}

function PoolSelector2Desktop(props: Props) {
  const close = useSelectorClose();
  const isLong = props.tradeType === TradeType.Long;

  return (
    <table className="PoolSelector2-table">
      <thead>
        <SelectorBaseTableHeadRow>
          <th>
            <Trans>Pool</Trans>
          </th>
          <th>{isLong ? <Trans>Long Liq.</Trans> : <Trans>Short Liq.</Trans>}</th>
          <th>
            <Trans>Net Rate</Trans>
          </th>
          <th>
            <Trans>Open Fees</Trans>
          </th>
        </SelectorBaseTableHeadRow>
      </thead>
      <tbody>
        {props.options?.map((option) => (
          <PoolListItemDesktop
            key={option.marketInfo.marketTokenAddress}
            marketStat={option}
            tradeType={props.tradeType}
            openFees={props.positionStats[option.marketInfo.marketTokenAddress].openFees}
            isEnoughLiquidity={props.positionStats[option.marketInfo.marketTokenAddress].isEnoughLiquidity}
            liquidity={props.positionStats[option.marketInfo.marketTokenAddress].liquidity}
            onSelect={() => {
              props.onSelect(option.marketInfo.marketTokenAddress);
              close();
            }}
          />
        ))}
      </tbody>
    </table>
  );
}

function PoolListItemDesktop({
  marketStat,
  tradeType,
  openFees,
  isEnoughLiquidity,
  liquidity,
  onSelect,
}: {
  marketStat: MarketStat;
  tradeType: TradeType;
  onSelect: () => void;
} & MarketLiquidityAndFeeStat) {
  const isLong = tradeType === TradeType.Long;
  const longTokenSymbol = marketStat.marketInfo.longToken.symbol;
  const shortTokenSymbol = marketStat.marketInfo.shortToken.symbol;
  const poolName = getMarketPoolName(marketStat.marketInfo);
  const formattedLiquidity = formatUsd(liquidity);

  const formattedNetRate = formatRatePercentage(isLong ? marketStat.netFeeLong : marketStat.netFeeShort);
  const netRateState = numberToState(isLong ? marketStat.netFeeLong : marketStat.netFeeShort);
  const formattedOpenFees = openFees !== undefined ? formatPercentage(openFees, { signed: true }) : "-";
  const openFeesState = numberToState(openFees);
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onSelect();
    },
    [onSelect]
  );

  return (
    <SelectorBaseDesktopRow onClick={handleClick}>
      <td className="PoolSelector2-column-pool">
        <div className="PoolSelector2-collateral-logos">
          <>
            <TokenIcon
              symbol={longTokenSymbol}
              displaySize={24}
              importSize={24}
              className="PoolSelector2-collateral-logo-first"
            />
            {shortTokenSymbol && (
              <TokenIcon
                symbol={shortTokenSymbol}
                displaySize={24}
                importSize={24}
                className="PoolSelector2-collateral-logo-second"
              />
            )}
          </>
        </div>
        <div>{poolName}</div>
      </td>
      <td
        className={cx({
          "text-red-500": !isEnoughLiquidity,
        })}
      >
        {formattedLiquidity}
      </td>
      <td
        className={cx({
          "text-red-500": netRateState === "error",
          "text-green-500": netRateState === "success",
        })}
      >
        <Trans>{formattedNetRate} / 1h</Trans>
      </td>
      <td
        className={cx("PoolSelector2-column-open-fees", {
          "text-red-500": openFeesState === "error",
          "text-green-500": openFeesState === "success",
        })}
      >
        {formattedOpenFees}
      </td>
    </SelectorBaseDesktopRow>
  );
}

function PoolSelector2Mobile(props: Props) {
  const close = useSelectorClose();

  return (
    <SelectorBaseMobileList>
      {props.options?.map((option) => (
        <PoolListItemMobile
          key={option.marketInfo.marketTokenAddress}
          marketStat={option}
          tradeType={props.tradeType}
          openFees={props.positionStats[option.marketInfo.marketTokenAddress].openFees}
          isEnoughLiquidity={props.positionStats[option.marketInfo.marketTokenAddress].isEnoughLiquidity}
          liquidity={props.positionStats[option.marketInfo.marketTokenAddress].liquidity}
          onSelect={() => {
            props.onSelect(option.marketInfo.marketTokenAddress);
            close();
          }}
        />
      ))}
    </SelectorBaseMobileList>
  );
}

function PoolListItemMobile({
  marketStat,
  tradeType,
  openFees,
  isEnoughLiquidity,
  liquidity,
  onSelect,
}: {
  marketStat: MarketStat;
  tradeType: TradeType;
  onSelect: () => void;
} & MarketLiquidityAndFeeStat) {
  const isLong = tradeType === TradeType.Long;
  const longTokenSymbol = marketStat.marketInfo.longToken.symbol;
  const shortTokenSymbol = marketStat.marketInfo.shortToken.symbol;
  const poolName = getMarketPoolName(marketStat.marketInfo);
  const formattedLiquidity = formatUsd(liquidity);
  const formattedNetRate = formatRatePercentage(isLong ? marketStat.netFeeLong : marketStat.netFeeShort);

  const netRateState = numberToState(isLong ? marketStat.netFeeLong : marketStat.netFeeShort);
  const formattedOpenFees = openFees !== undefined ? formatPercentage(openFees, { signed: true }) : "-";
  const openFeesState = numberToState(openFees);

  return (
    <SelectorBaseMobileButton key={marketStat.marketInfo.marketTokenAddress} onSelect={onSelect}>
      <div className="PoolSelector2-column-pool">
        <div className="PoolSelector2-collateral-logos">
          <>
            <TokenIcon
              symbol={longTokenSymbol}
              displaySize={30}
              importSize={24}
              className="PoolSelector2-collateral-logo-first"
            />
            {shortTokenSymbol && (
              <TokenIcon
                symbol={shortTokenSymbol}
                displaySize={30}
                importSize={24}
                className="PoolSelector2-mobile-collateral-logo-second"
              />
            )}
          </>
        </div>
        <div>{poolName}</div>
      </div>
      <dl className="PoolSelector2-mobile-info">
        <dt>{isLong ? <Trans>Long Liq.</Trans> : <Trans>Short Liq.</Trans>}</dt>
        <dd
          className={cx({
            "text-red-500": !isEnoughLiquidity,
          })}
        >
          {formattedLiquidity}
        </dd>
        <dt>
          <Trans>Net Rate</Trans>
        </dt>
        <dd
          className={cx({
            "text-red-500": netRateState === "error",
            "text-green-500": netRateState === "success",
          })}
        >
          {formattedNetRate} / 1h
        </dd>
        <dt>
          <Trans>Open Fees</Trans>
        </dt>
        <dd
          className={cx({
            "text-red-500": openFeesState === "error",
            "text-green-500": openFeesState === "success",
          })}
        >
          {formattedOpenFees}
        </dd>
      </dl>
    </SelectorBaseMobileButton>
  );
}
