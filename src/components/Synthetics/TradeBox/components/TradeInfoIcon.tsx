import { Trans, t } from "@lingui/macro";

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
    [TradeMode.TWAP]: increase,
    [TradeMode.StopMarket]: increase,
  };

  return tradeTypeLabelByTradeMode[tradeMode];
};

const getReadMoreLink = (mode: TradeMode) => {
  const linkByTradeMode: Record<TradeMode, string> = {
    [TradeMode.Market]: "https://docs.gmx.io/docs/trading/v2/#market-orders",
    [TradeMode.Limit]: "https://docs.gmx.io/docs/trading/v2/#limit-orders",
    [TradeMode.Trigger]: "https://docs.gmx.io/docs/trading/v2/#take-profit-and-stop-loss-orders",
    [TradeMode.TWAP]: "https://docs.gmx.io/docs/trading/v2/#twap-orders",
    [TradeMode.StopMarket]: "https://docs.gmx.io/docs/trading/v2/#stop-market-orders",
  };

  return linkByTradeMode[mode];
};

const makeTooltipText = ({
  tradeMode,
  tradeType,
  tradePlace,
}: {
  tradeMode: TradeMode;
  tradeType: TradeType;
  tradePlace: TradePlace;
}) => {
  if (tradeType === TradeType.Swap) {
    const textByTradeMode: Record<TradeMode, string> = {
      [TradeMode.Market]: t`Swap tokens at the current market price.`,
      [TradeMode.Limit]: t`Swap tokens when the trigger price is reached.`,
      [TradeMode.Trigger]: t`Swap tokens when the trigger price is reached.`,
      [TradeMode.TWAP]: t`Swap tokens in evenly distributed parts over a specified time.`,
      [TradeMode.StopMarket]: t`Swap tokens when the price is below the trigger price.`,
    };

    return textByTradeMode[tradeMode];
  }

  const positionLabel = tradeType === TradeType.Long ? t`long` : t`short`;
  const tradeTypeLabel = getTradeTypeLabel(tradeMode, tradePlace);

  const textByTradeMode: Record<TradeMode, string> = {
    [TradeMode.Market]: t`${tradeTypeLabel} a ${positionLabel} position at the current price.`,
    [TradeMode.Limit]: t`${tradeTypeLabel} a ${positionLabel} position when the price is below the trigger price.`,
    [TradeMode.Trigger]: t`${tradeTypeLabel} a ${positionLabel} position when the trigger price is reached.`,
    [TradeMode.TWAP]: t`${tradeTypeLabel} a ${positionLabel} position in evenly distributed parts over a specified time.`,
    [TradeMode.StopMarket]: t`${tradeTypeLabel} a ${positionLabel} position when the price is below the trigger price.`,
  };

  return textByTradeMode[tradeMode];
};

interface Props {
  isMobile: boolean;
  tradeType: TradeType;
  tradeMode: TradeMode;
  tradePlace: TradePlace;
}

export default function TradeInfoIcon({ isMobile, tradeType, tradeMode, tradePlace }: Props) {
  return (
    <Tooltip
      position={isMobile ? "bottom-end" : "top-end"}
      content={
        <p className="text-body-medium">
          {makeTooltipText({ tradeMode: tradeMode, tradeType: tradeType, tradePlace: tradePlace })}
          {tradeType !== TradeType.Swap ? (
            <>
              {" "}
              <ExternalLink href={getReadMoreLink(tradeMode)}>
                <Trans>Read more</Trans>
              </ExternalLink>
              .
            </>
          ) : null}
        </p>
      }
      tooltipClassName="p-10"
    >
      <InfoCircleOutlineIcon className="h-24 w-24 cursor-pointer text-slate-100 gmx-hover:text-white" />
    </Tooltip>
  );
}
