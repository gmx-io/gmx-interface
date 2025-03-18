import { Trans } from "@lingui/macro";

import ExternalLink from "components/ExternalLink/ExternalLink";
import Tooltip from "components/Tooltip/Tooltip";

import InfoCircleOutlineIcon from "img/ic_info_circle_outline.svg?react";

export default function TradeBoxLongShortInfoIcon({ isLong, isMobile }: { isLong: boolean; isMobile: boolean }) {
  const longMarketTooltipContent = (
    <ul className="text-body-medium flex list-disc flex-col gap-2">
      <li className="p-0">
        <Trans>Long Market: Increase a long position at the current price.</Trans>
      </li>
      <li className="p-0">
        <Trans>Long Limit: Increase a long position when the price is below the trigger price.</Trans>
        <ExternalLink className="!text-blue-300 !no-underline" href="https://docs.gmx.io/docs/trading/v2/#limit-orders">
          <Trans>Read more</Trans>
        </ExternalLink>
        .
      </li>
      <li className="p-0">
        <Trans>Long TP/SL: Decrease a long position when the trigger price is reached.</Trans>
        <ExternalLink
          className="!text-blue-300 !no-underline"
          href="https://docs.gmx.io/docs/trading/v2/#take-profit-and-stop-loss-orders"
        >
          <Trans>Read more</Trans>
        </ExternalLink>
        .
      </li>
      <li className="p-0">
        <Trans>Long Stop Market: Increase a long position when the price is above the trigger price.</Trans>
        <ExternalLink
          className="!text-blue-300 !no-underline"
          href="https://docs.gmx.io/docs/trading/v2/#stop-market-orders"
        >
          <Trans>Read more</Trans>
        </ExternalLink>
        .
      </li>
    </ul>
  );

  const shortMarketTooltipContent = (
    <ul className="text-body-medium flex list-disc flex-col gap-2">
      <li className="p-0">
        <Trans>Short Market: Increase a short position at the current price.</Trans>
      </li>
      <li className="p-0">
        <Trans>Short Limit: Increase a short position when the price is above the trigger price.</Trans>
        <ExternalLink className="!text-blue-300 !no-underline" href="https://docs.gmx.io/docs/trading/v2/#limit-orders">
          <Trans>Read more</Trans>
        </ExternalLink>
        .
      </li>
      <li className="p-0">
        <Trans>Short TP/SL: Decrease a short position when the trigger price is reached.</Trans>
        <ExternalLink
          className="!text-blue-300 !no-underline"
          href="https://docs.gmx.io/docs/trading/v2/#take-profit-and-stop-loss-orders"
        >
          <Trans>Read more</Trans>
        </ExternalLink>
        .
      </li>
      <li className="p-0">
        <Trans>Short Stop Market: Increase a short position when the price is below the trigger price.</Trans>
        <ExternalLink
          className="!text-blue-300 !no-underline"
          href="https://docs.gmx.io/docs/trading/v2/#stop-market-orders"
        >
          <Trans>Read more</Trans>
        </ExternalLink>
        .
      </li>
    </ul>
  );

  return (
    <Tooltip
      position={isMobile ? "bottom-end" : "top-end"}
      content={isLong ? longMarketTooltipContent : shortMarketTooltipContent}
      openDelay={0}
      closeDelay={10000}
      tooltipClassName="p-10"
    >
      <InfoCircleOutlineIcon className="h-24 w-24 cursor-pointer text-slate-100 gmx-hover:text-white" />
    </Tooltip>
  );
}
