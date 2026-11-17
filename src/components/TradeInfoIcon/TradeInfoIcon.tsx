import { Trans, t } from "@lingui/macro";
import { ReactNode } from "react";

import { TradeMode, TradeType } from "sdk/utils/trade/types";

import StandardTooltip from "components/Tooltip/StandardTooltip";
import { TooltipContent, TooltipLink, TooltipTitledText } from "components/Tooltip/TooltipBlocks";

import InfoCircleIcon from "img/ic_info_circle_stroke.svg?react";

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
  tradeType: TradeType;
  tradePlace: TradePlace;
}

export default function TradeBoxLongShortInfoIcon({ tradePlace, tradeType }: Props) {
  const isTradeBox = tradePlace === "tradebox";
  const typeString = isTradeBox ? "" : t`Close`;
  const contentByTradeType: Record<TradeType, ReactNode> = {
    [TradeType.Long]: (
      <TooltipContent>
        <TooltipTitledText title={<Trans>{typeString} Long Market</Trans>}>
          <Trans>{getTradeTypeLabel(TradeMode.Market, tradePlace)} a long position at the current price</Trans>
        </TooltipTitledText>
        {isTradeBox ? (
          <TooltipTitledText title={<Trans>{typeString} Long Limit</Trans>}>
            <Trans>
              {getTradeTypeLabel(TradeMode.Limit, tradePlace)} a long position when the price is below the trigger
              price.
            </Trans>
          </TooltipTitledText>
        ) : null}
        {isTradeBox ? (
          <TooltipTitledText title={<Trans>{typeString} Long Stop Market</Trans>}>
            <Trans>
              {getTradeTypeLabel(TradeMode.StopMarket, tradePlace)} a long position when the price is above the trigger
              price.
            </Trans>
          </TooltipTitledText>
        ) : null}
        <TooltipTitledText title={<Trans>{typeString} Long TWAP</Trans>}>
          <Trans>
            {getTradeTypeLabel(TradeMode.Twap, tradePlace)} a long position in evenly distributed parts over a specified
            time.
          </Trans>
        </TooltipTitledText>
        <TooltipLink href="https://docs.gmx.io/docs/trading/order-types/">
          <Trans>Read more</Trans>
        </TooltipLink>
      </TooltipContent>
    ),
    [TradeType.Short]: (
      <TooltipContent>
        <TooltipTitledText title={<Trans>{typeString} Short Market</Trans>}>
          <Trans>{getTradeTypeLabel(TradeMode.Market, tradePlace)} a short position at the current price</Trans>
        </TooltipTitledText>
        {isTradeBox ? (
          <TooltipTitledText title={<Trans>{typeString} Short Limit</Trans>}>
            <Trans>
              {getTradeTypeLabel(TradeMode.Limit, tradePlace)} a short position when the price is above the trigger
              price.
            </Trans>
          </TooltipTitledText>
        ) : null}
        {isTradeBox ? (
          <TooltipTitledText title={<Trans>{typeString} Short Stop Market</Trans>}>
            <Trans>
              {getTradeTypeLabel(TradeMode.StopMarket, tradePlace)} a short position when the price is below the trigger
              price.
            </Trans>
          </TooltipTitledText>
        ) : null}
        <TooltipTitledText title={<Trans>{typeString} Short TWAP</Trans>}>
          <Trans>
            {getTradeTypeLabel(TradeMode.Twap, tradePlace)} a short position in evenly distributed parts over a
            specified time.
          </Trans>
        </TooltipTitledText>
        <TooltipLink href="https://docs.gmx.io/docs/trading/order-types/">
          <Trans>Read more</Trans>
        </TooltipLink>
      </TooltipContent>
    ),
    [TradeType.Swap]: (
      <TooltipContent>
        <TooltipTitledText title={<Trans>Swap Market</Trans>}>
          <Trans>Swap tokens at the current market price</Trans>
        </TooltipTitledText>
        <TooltipTitledText title={<Trans>Swap Limit</Trans>}>
          <Trans>Swap tokens when the trigger price is reached</Trans>
        </TooltipTitledText>
        <TooltipTitledText title={<Trans>Swap TWAP</Trans>}>
          <Trans>Swap tokens in evenly distributed parts over a specified time</Trans>
        </TooltipTitledText>
      </TooltipContent>
    ),
  };

  return (
    <StandardTooltip position="bottom-end" content={contentByTradeType[tradeType]} className="flex" variant="none">
      <InfoCircleIcon className="box-content h-16 w-16 p-8 text-typography-secondary gmx-hover:text-typography-primary" />
    </StandardTooltip>
  );
}
