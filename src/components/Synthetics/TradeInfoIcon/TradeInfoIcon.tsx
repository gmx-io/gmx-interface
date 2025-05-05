import { Trans, t } from "@lingui/macro";
import { ReactNode } from "react";

import { TradeMode, TradeType } from "sdk/types/trade";

import ExternalLink from "components/ExternalLink/ExternalLink";
import Tooltip from "components/Tooltip/Tooltip";

import InfoCircleOutlineIcon from "img/ic_info_circle_outline.svg?react";

type TradePlace = "tradebox" | "position-seller";

const getTradeTypeLabel = (tradeMode: TradeMode, tradePlace: TradePlace) => {
  const increase = t`Increase`;
  const decrease = t`Decrease`;

  const tradeTypeLabelByTradeMode: Record<TradeMode, string> = {
    [TradeMode.Market]: tradePlace === "tradebox" ? increase : decrease,
    [TradeMode.Limit]: increase,
    [TradeMode.Trigger]: decrease,
    [TradeMode.Twap]: tradePlace === "tradebox" ? increase : decrease,
    [TradeMode.StopMarket]: increase,
  };

  return tradeTypeLabelByTradeMode[tradeMode];
};

interface Props {
  isMobile: boolean;
  tradeType: TradeType;
  tradePlace: TradePlace;
}

const UL_CLASS_NAME = "text-body-medium flex list-disc flex-col gap-2";
const LI_CLASS_NAME = "p-0";

export default function TradeBoxLongShortInfoIcon({ tradePlace, tradeType, isMobile }: Props) {
  const isTradeBox = tradePlace === "tradebox";
  const typeString = isTradeBox ? "" : t`Close`;
  const contentByTradeType: Record<TradeType, ReactNode> = {
    [TradeType.Long]: (
      <ul className={UL_CLASS_NAME}>
        <li className={LI_CLASS_NAME}>
          <Trans>
            {typeString} Long Market: {getTradeTypeLabel(TradeMode.Market, tradePlace)} a long position at the current
            price.
          </Trans>
        </li>
        {isTradeBox ? (
          <li className={LI_CLASS_NAME}>
            <Trans>
              {typeString} Long Limit: {getTradeTypeLabel(TradeMode.Limit, tradePlace)} a long position when the price
              is below the trigger price.
            </Trans>{" "}
            <ExternalLink href="https://docs.gmx.io/docs/trading/v2/#limit-orders">
              <Trans>Read more</Trans>
            </ExternalLink>
            .
          </li>
        ) : null}
        <li className={LI_CLASS_NAME}>
          <Trans>
            {typeString} Long TP/SL: {getTradeTypeLabel(TradeMode.Trigger, tradePlace)} a long position when the trigger
            price is reached.
          </Trans>{" "}
          <ExternalLink href="https://docs.gmx.io/docs/trading/v2/#take-profit-and-stop-loss-orders">
            <Trans>Read more</Trans>
          </ExternalLink>
          .
        </li>
        {isTradeBox ? (
          <li className={LI_CLASS_NAME}>
            <Trans>
              {typeString} Long Stop Market: {getTradeTypeLabel(TradeMode.StopMarket, tradePlace)} a short position when
              the price is below the trigger price.
            </Trans>{" "}
            <ExternalLink href="https://docs.gmx.io/docs/trading/v2/#stop-market-orders">
              <Trans>Read more</Trans>
            </ExternalLink>
            .
          </li>
        ) : null}
        <li className={LI_CLASS_NAME}>
          <Trans>
            {typeString} Long TWAP: {getTradeTypeLabel(TradeMode.Twap, tradePlace)} a long position in evenly
            distributed parts over a specified time.
          </Trans>{" "}
          <ExternalLink href="https://docs.gmx.io/docs/trading/v2/#twap-orders">
            <Trans>Read more</Trans>
          </ExternalLink>
          .
        </li>
      </ul>
    ),
    [TradeType.Short]: (
      <ul className={UL_CLASS_NAME}>
        <li className={LI_CLASS_NAME}>
          <Trans>
            {typeString} Short Market: {getTradeTypeLabel(TradeMode.Market, tradePlace)} a short position at the current
            price.
          </Trans>
        </li>
        {isTradeBox ? (
          <li className={LI_CLASS_NAME}>
            <Trans>
              {typeString} Short Limit: {getTradeTypeLabel(TradeMode.Limit, tradePlace)} a short position when the price
              is above the trigger price.
            </Trans>{" "}
            <ExternalLink href="https://docs.gmx.io/docs/trading/v2/#limit-orders">
              <Trans>Read more</Trans>
            </ExternalLink>
            .
          </li>
        ) : null}
        <li className={LI_CLASS_NAME}>
          <Trans>
            {typeString} Short TP/SL: {getTradeTypeLabel(TradeMode.Trigger, tradePlace)} a short position when the
            trigger price is reached.
          </Trans>{" "}
          <ExternalLink href="https://docs.gmx.io/docs/trading/v2/#take-profit-and-stop-loss-orders">
            <Trans>Read more</Trans>
          </ExternalLink>
          .
        </li>
        {isTradeBox ? (
          <li className={LI_CLASS_NAME}>
            <Trans>
              {typeString} Short Stop Market: {getTradeTypeLabel(TradeMode.StopMarket, tradePlace)} a short position
              when the price is below the trigger price.
            </Trans>{" "}
            <ExternalLink href="https://docs.gmx.io/docs/trading/v2/#stop-market-orders">
              <Trans>Read more</Trans>
            </ExternalLink>
            .
          </li>
        ) : null}
        <li className={LI_CLASS_NAME}>
          <Trans>
            {typeString} Short TWAP: {getTradeTypeLabel(TradeMode.Twap, tradePlace)} a short position in evenly
            distributed parts over a specified time.
          </Trans>{" "}
          <ExternalLink href="https://docs.gmx.io/docs/trading/v2/#twap-orders">
            <Trans>Read more</Trans>
          </ExternalLink>
          .
        </li>
      </ul>
    ),
    [TradeType.Swap]: (
      <ul className={UL_CLASS_NAME}>
        <li className={LI_CLASS_NAME}>
          <Trans>Swap Market: Swap tokens at the current market price.</Trans>
        </li>
        <li className={LI_CLASS_NAME}>
          <Trans>Swap Limit: Swap tokens when the trigger price is reached.</Trans>
        </li>
        <li className={LI_CLASS_NAME}>
          <Trans>Swap TWAP: Swap tokens in evenly distributed parts over a specified time.</Trans>
        </li>
      </ul>
    ),
  };

  return (
    <Tooltip
      position={isMobile ? "bottom-end" : "top-end"}
      content={contentByTradeType[tradeType]}
      tooltipClassName="p-10"
    >
      <InfoCircleOutlineIcon className="h-24 w-24 cursor-pointer text-slate-100 gmx-hover:text-white" />
    </Tooltip>
  );
}
