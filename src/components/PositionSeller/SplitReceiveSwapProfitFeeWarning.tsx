import { Trans } from "@lingui/macro";
import type { ReactNode } from "react";

import type { FeeItem } from "domain/synthetics/fees";
import { formatPercentage, formatUsd } from "lib/numbers";
import { bigMath } from "sdk/utils/bigmath";

import { getTokenDisplaySymbol } from "components/DecreaseReceiveOutput/DecreaseReceiveOutput";
import ExternalLink from "components/ExternalLink/ExternalLink";

const RECEIVE_TOKEN_DOCS_URL = "https://docs.gmx.io/docs/trading/order-types/#receive-token";

type TokenWithSymbol = {
  address: string;
  symbol: string;
};

type SplitReceiveSwapProfitFeeWarningProps = {
  shouldShow: boolean;
  receiveToken: TokenWithSymbol | undefined;
  profitToken: TokenWithSymbol | undefined;
  collateralToken: TokenWithSymbol | undefined;
  swapProfitFee: FeeItem | undefined;
};

type SplitReceiveSwapProfitFeeWarningContentProps = {
  receiveTokenSymbol: string;
  profitTokenSymbol: string;
  collateralTokenSymbol: string;
  swapProfitFeePercentage: string;
  swapProfitFeeUsd: string;
};

export function getSplitReceiveSwapProfitFeeWarning({
  shouldShow,
  receiveToken,
  profitToken,
  collateralToken,
  swapProfitFee,
}: SplitReceiveSwapProfitFeeWarningProps): ReactNode | undefined {
  if (!shouldShow || swapProfitFee?.precisePercentage === undefined || swapProfitFee.deltaUsd === undefined) {
    return undefined;
  }

  const receiveTokenSymbol = getTokenDisplaySymbol(receiveToken);
  const profitTokenSymbol = getTokenDisplaySymbol(profitToken);
  const collateralTokenSymbol = getTokenDisplaySymbol(collateralToken);

  if (!receiveTokenSymbol || !profitTokenSymbol || !collateralTokenSymbol) {
    return undefined;
  }

  const swapProfitFeePercentage = formatPercentage(bigMath.abs(swapProfitFee.precisePercentage), {
    displayDecimals: 2,
    bps: false,
  });
  const swapProfitFeeUsd = formatUsd(bigMath.abs(swapProfitFee.deltaUsd));

  if (!swapProfitFeePercentage || !swapProfitFeeUsd) {
    return undefined;
  }

  return (
    <SplitReceiveSwapProfitFeeWarning
      receiveTokenSymbol={receiveTokenSymbol}
      profitTokenSymbol={profitTokenSymbol}
      collateralTokenSymbol={collateralTokenSymbol}
      swapProfitFeePercentage={swapProfitFeePercentage}
      swapProfitFeeUsd={swapProfitFeeUsd}
    />
  );
}

function SplitReceiveSwapProfitFeeWarning({
  receiveTokenSymbol,
  profitTokenSymbol,
  collateralTokenSymbol,
  swapProfitFeePercentage,
  swapProfitFeeUsd,
}: SplitReceiveSwapProfitFeeWarningContentProps) {
  return (
    <Trans>
      Receiving as {receiveTokenSymbol} will swap your profit and cost {swapProfitFeePercentage} (
      <span className="font-medium text-yellow-300">{swapProfitFeeUsd}</span>). Receive {profitTokenSymbol} and{" "}
      {collateralTokenSymbol} separately to skip the swap.{" "}
      <ExternalLink href={RECEIVE_TOKEN_DOCS_URL}>Read more</ExternalLink>
    </Trans>
  );
}
