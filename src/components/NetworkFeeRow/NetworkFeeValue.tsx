import { ReactNode } from "react";

import {
  getNetworkFeeSourceExplanation,
  getNetworkFeeSourceLabel,
  type NetworkFeeDetails,
  type NetworkFeeSource,
} from "domain/synthetics/fees/networkFeeSource";
import { useChainId } from "lib/chains";

import { AmountWithUsdBalance } from "components/AmountWithUsd/AmountWithUsd";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

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
  className?: string;
};

export function NetworkFeeSourceLabel({ source }: { source: NetworkFeeSource }) {
  return <span className="whitespace-nowrap text-typography-secondary"> · {getNetworkFeeSourceLabel(source)}</span>;
}

export function NetworkFeeValue({
  amount,
  usd,
  decimals,
  symbol,
  isStable,
  source,
  isExpress,
  tooltipContent,
  className,
}: Props) {
  const { chainId } = useChainId();

  const value = (
    <span className={className}>
      <AmountWithUsdBalance amount={amount} decimals={decimals} usd={usd} symbol={symbol} isStable={isStable} />
      {source && <NetworkFeeSourceLabel source={source} />}
    </span>
  );

  const content =
    tooltipContent ??
    (source && isExpress !== undefined ? getNetworkFeeSourceExplanation({ source, isExpress, chainId }) : undefined);

  if (!content) {
    return value;
  }

  return (
    <TooltipWithPortal position="left-start" handleClassName="numbers" content={content}>
      {value}
    </TooltipWithPortal>
  );
}
