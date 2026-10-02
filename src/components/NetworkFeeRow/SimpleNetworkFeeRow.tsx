import { Trans } from "@lingui/macro";

import type { NetworkFeeSource } from "domain/synthetics/fees/networkFeeSource";

import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";

import { NetworkFeeValue, type NetworkFeeDetails } from "./NetworkFeeValue";

type Props = {
  details: NetworkFeeDetails | undefined;
  isLoading: boolean;
  source: NetworkFeeSource | undefined;
  isExpress: boolean;
  className?: string;
};

export function SimpleNetworkFeeRow({ details, isLoading, source, isExpress, className }: Props) {
  let value: React.ReactNode;

  if (isLoading) {
    value = "...";
  } else if (!details) {
    value = "-";
  } else {
    value = (
      <NetworkFeeValue
        amount={details.amount}
        usd={details.usd}
        decimals={details.decimals}
        symbol={details.symbol}
        isStable={details.isStable}
        source={source}
        isExpress={isExpress}
      />
    );
  }

  return <SyntheticsInfoRow qa="network-fee" className={className} label={<Trans>Network fee</Trans>} value={value} />;
}
