/* eslint-disable react/no-unused-prop-types */
import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { BigNumber } from "ethers";
import React, { useCallback } from "react";
import { useMedia } from "react-use";

import { numberToState } from "components/Synthetics/TradeHistory/TradeHistoryRow/utils/shared";
import { getMarketPoolName } from "domain/synthetics/markets/utils";
import type { MarketStat } from "domain/synthetics/stats/marketsInfoDataToIndexTokensStats";
import { TradeType } from "domain/synthetics/trade";
import { formatPercentage, formatRatePercentage, formatUsd } from "lib/numbers";

import TokenIcon from "components/TokenIcon/TokenIcon";
import {
  NewSelectorBase,
  NewSelectorBaseDesktopRow,
  NewSelectorBaseMobileButton,
  NewSelectorBaseMobileList,
  NewSelectorBaseTableHeadRow,
  useNewSelectorClose,
} from "../NewSelectorBase/NewSelectorBase";

import "./NewPoolSelector.scss";

type Props = {
  selectedPoolName: string | undefined;
  options: MarketStat[] | undefined;
  openFees: { [marketTokenAddress: string]: BigNumber | undefined };
  tradeType: TradeType;
  onSelect: (marketAddress: string) => void;
};

export function NewPoolSelector(props: Props) {
  const isMobile = useMedia("(max-width: 1100px)");

  return (
    <NewSelectorBase label={props.selectedPoolName} modalLabel={t`Select pool`}>
      {isMobile ? <NewPoolSelectorMobile {...props} /> : <NewPoolSelectorDesktop {...props} />}
    </NewSelectorBase>
  );
}

function NewPoolSelectorDesktop(props: Props) {
  const close = useNewSelectorClose();

  return (
    <table className="NewPoolSelector-table">
      <thead>
        <NewSelectorBaseTableHeadRow>
          <th>
            <Trans>Pool</Trans>
          </th>
          <th>
            <Trans>Liquidity</Trans>
          </th>
          <th>
            <Trans>Net Rate</Trans>
          </th>
          <th>
            <Trans>Open Fees</Trans>
          </th>
        </NewSelectorBaseTableHeadRow>
      </thead>
      <tbody>
        {props.options?.map((option) => (
          <PoolListItemDesktop
            key={option.marketInfo.marketTokenAddress}
            marketStat={option}
            tradeType={props.tradeType}
            openFees={props.openFees[option.marketInfo.marketTokenAddress]}
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
  onSelect,
}: {
  marketStat: MarketStat;
  tradeType: TradeType;
  openFees: BigNumber | undefined;
  onSelect: () => void;
}) {
  const longTokenSymbol = marketStat.marketInfo.longToken.symbol;
  const shortTokenSymbol = marketStat.marketInfo.shortToken.symbol;
  const poolName = getMarketPoolName(marketStat.marketInfo);
  const formattedLiquidity = formatUsd(marketStat.maxLiquidity);
  const formattedNetRate = formatRatePercentage(
    tradeType === TradeType.Long ? marketStat.netFeeLong : marketStat.netFeeShort
  );
  const netRateState = numberToState(tradeType === TradeType.Long ? marketStat.netFeeLong : marketStat.netFeeShort);
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
    <NewSelectorBaseDesktopRow onClick={handleClick}>
      <td className="NewPoolSelector-column-pool">
        <div className="NewPoolSelector-collateral-logos">
          <>
            <TokenIcon
              symbol={longTokenSymbol}
              displaySize={24}
              importSize={24}
              className="NewPoolSelector-collateral-logo-first"
            />
            {shortTokenSymbol && (
              <TokenIcon
                symbol={shortTokenSymbol}
                displaySize={24}
                importSize={24}
                className="NewPoolSelector-collateral-logo-second"
              />
            )}
          </>
        </div>
        <div>{poolName}</div>
      </td>
      <td>{formattedLiquidity}</td>
      <td
        className={cx({
          "text-red": netRateState === "error",
          "text-green": netRateState === "success",
        })}
      >
        <Trans>{formattedNetRate} / 1h</Trans>
      </td>
      <td
        className={cx("NewPoolSelector-column-open-fees", {
          "text-red": openFeesState === "error",
          "text-green": openFeesState === "success",
        })}
      >
        {formattedOpenFees}
      </td>
    </NewSelectorBaseDesktopRow>
  );
}

function NewPoolSelectorMobile(props: Props) {
  const close = useNewSelectorClose();

  return (
    <NewSelectorBaseMobileList>
      {props.options?.map((option) => (
        <PoolListItemMobile
          key={option.marketInfo.marketTokenAddress}
          marketStat={option}
          tradeType={props.tradeType}
          openFees={props.openFees[option.marketInfo.marketTokenAddress]}
          onSelect={() => {
            props.onSelect(option.marketInfo.marketTokenAddress);
            close();
          }}
        />
      ))}
    </NewSelectorBaseMobileList>
  );
}

function PoolListItemMobile({
  marketStat,
  tradeType,
  openFees,
  onSelect,
}: {
  marketStat: MarketStat;
  tradeType: TradeType;
  openFees: BigNumber | undefined;
  onSelect: () => void;
}) {
  const longTokenSymbol = marketStat.marketInfo.longToken.symbol;
  const shortTokenSymbol = marketStat.marketInfo.shortToken.symbol;
  const poolName = getMarketPoolName(marketStat.marketInfo);
  const formattedLiquidity = formatUsd(marketStat.maxLiquidity);
  const formattedNetRate = formatRatePercentage(
    tradeType === TradeType.Long ? marketStat.netFeeLong : marketStat.netFeeShort
  );
  const netRateState = numberToState(tradeType === TradeType.Long ? marketStat.netFeeLong : marketStat.netFeeShort);
  const formattedOpenFees = openFees !== undefined ? formatPercentage(openFees, { signed: true }) : "-";
  const openFeesState = numberToState(openFees);

  return (
    <NewSelectorBaseMobileButton key={marketStat.marketInfo.marketTokenAddress} onSelect={onSelect}>
      <div className="NewPoolSelector-column-pool">
        <div className="NewPoolSelector-collateral-logos">
          <>
            <TokenIcon
              symbol={longTokenSymbol}
              displaySize={30}
              importSize={24}
              className="NewPoolSelector-collateral-logo-first"
            />
            {shortTokenSymbol && (
              <TokenIcon
                symbol={shortTokenSymbol}
                displaySize={30}
                importSize={24}
                className="NewPoolSelector-mobile-collateral-logo-second"
              />
            )}
          </>
        </div>
        <div>{poolName}</div>
      </div>
      <dl className="NewPoolSelector-mobile-info">
        <dt>
          <Trans>Liquidity</Trans>
        </dt>
        <dd>{formattedLiquidity}</dd>
        <dt>
          <Trans>Net Rate</Trans>
        </dt>
        <dd
          className={cx({
            "text-red": netRateState === "error",
            "text-green": netRateState === "success",
          })}
        >
          {formattedNetRate} / 1h
        </dd>
        <dt>
          <Trans>Open Fees</Trans>
        </dt>
        <dd
          className={cx({
            "text-red": openFeesState === "error",
            "text-green": openFeesState === "success",
          })}
        >
          {formattedOpenFees}
        </dd>
      </dl>
    </NewSelectorBaseMobileButton>
  );
}
