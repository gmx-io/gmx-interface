import { t } from "@lingui/macro";
import { ReactNode } from "react";

import {
  getNetworkFeeSourceExplanation,
  getNetworkFeeSourceLabel,
  type NetworkFeeDetails,
  type NetworkFeeSource,
} from "domain/synthetics/fees/networkFeeSource";
import { useChainId } from "lib/chains";

import { AmountWithUsdBalance } from "components/AmountWithUsd/AmountWithUsd";
import StandardTooltip from "components/Tooltip/StandardTooltip";
import {
  TooltipContent,
  TooltipFootnote,
  TooltipRow,
  TooltipRows,
  TooltipText,
} from "components/Tooltip/TooltipBlocks";

import { NetworkFeeSourceIcon } from "./NetworkFeeSourceIcon";

export type { NetworkFeeDetails };

type Props = {
  amount: bigint | undefined;
  usd: bigint | undefined;
  decimals: number;
  symbol: string;
  isStable?: boolean;
  source: NetworkFeeSource | undefined;
  isExpress?: boolean;
  tooltipContent?: ReactNode;
  warning?: ReactNode;
};

export function NetworkFeeValue({
  amount,
  usd,
  decimals,
  symbol,
  isStable,
  source,
  isExpress,
  tooltipContent,
  warning,
}: Props) {
  const { chainId } = useChainId();

  const content =
    tooltipContent ??
    (source && isExpress !== undefined ? getNetworkFeeSourceExplanation({ source, isExpress, chainId }) : undefined);

  const amountWithUsd = (
    <AmountWithUsdBalance
      amount={amount === undefined ? undefined : -amount}
      decimals={decimals}
      usd={usd === undefined ? undefined : -usd}
      symbol={symbol}
      isStable={isStable}
      allowWrap
      underline={Boolean(source || content)}
      suffix={source && <NetworkFeeSourceIcon source={source} />}
    />
  );

  const warningText = warning ? (
    <TooltipText>
      <span className="text-yellow-300">{warning}</span>
    </TooltipText>
  ) : null;

  if (!source) {
    if (!content && !warningText) {
      return amountWithUsd;
    }

    return (
      <StandardTooltip
        position="bottom-end"
        handleClassName="numbers"
        variant="none"
        content={
          warningText ? (
            <TooltipContent>
              {warningText}
              {content}
            </TooltipContent>
          ) : (
            content
          )
        }
      >
        {amountWithUsd}
      </StandardTooltip>
    );
  }

  return (
    <StandardTooltip
      position="bottom-end"
      handleClassName="numbers"
      variant="none"
      content={
        <TooltipContent>
          {warningText}
          <TooltipRows>
            <TooltipRow
              label={t`Paid from`}
              value={
                <span className="inline-flex items-center gap-4">
                  <NetworkFeeSourceIcon source={source} isDecorative />
                  {getNetworkFeeSourceLabel(source)}
                </span>
              }
            />
          </TooltipRows>
          {content && (typeof content === "string" ? <TooltipFootnote>{content}</TooltipFootnote> : content)}
        </TooltipContent>
      }
    >
      {amountWithUsd}
    </StandardTooltip>
  );
}
