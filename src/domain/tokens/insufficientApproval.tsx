import { Trans } from "@lingui/macro";

import { getMultichainTokenId } from "config/multichain";
import { isGlvAddress } from "domain/synthetics/markets/glv";
import { formatAmountFree } from "lib/numbers";
import type { AnyChainId } from "sdk/configs/chains";
import { isMarketTokenAddress } from "sdk/configs/markets";
import { getToken } from "sdk/configs/tokens";

export type ApprovalTokenDisplay = {
  symbol: string;
  decimals: number;
};

function getConfiguredToken(chainId: number, tokenAddress: string) {
  try {
    return getToken(chainId, tokenAddress);
  } catch {
    return undefined;
  }
}

function getPlatformTokenSymbol(multichainSymbol: string): string {
  return multichainSymbol.startsWith("<GLV") ? "GLV" : "GM";
}

export function getApprovalTokenDisplay(chainId: AnyChainId, tokenAddress: string): ApprovalTokenDisplay | undefined {
  if (isGlvAddress(chainId, tokenAddress)) {
    return { symbol: "GLV", decimals: 18 };
  }

  if (isMarketTokenAddress(chainId, tokenAddress)) {
    return { symbol: "GM", decimals: 18 };
  }

  const token = getConfiguredToken(chainId, tokenAddress);
  if (token) {
    return { symbol: token.symbol, decimals: token.decimals };
  }

  const multichainTokenId = getMultichainTokenId(chainId, tokenAddress);
  if (multichainTokenId) {
    return {
      symbol: multichainTokenId.isPlatformToken
        ? getPlatformTokenSymbol(multichainTokenId.symbol)
        : multichainTokenId.symbol,
      decimals: multichainTokenId.decimals,
    };
  }

  return undefined;
}

export function formatApprovalAmount(amount: bigint, display: ApprovalTokenDisplay): string {
  return `${formatAmountFree(amount, display.decimals)} ${display.symbol}`;
}

export function getInsufficientApprovalToastContent({
  chainId,
  tokenAddress,
  approvedAmount,
  requiredAmount,
}: {
  chainId: AnyChainId;
  tokenAddress: string;
  approvedAmount: bigint;
  requiredAmount: bigint;
}) {
  const display = getApprovalTokenDisplay(chainId, tokenAddress);

  if (!display) {
    return <Trans>The approved amount is lower than the required amount. Approve again or reduce the amount.</Trans>;
  }

  const approved = formatApprovalAmount(approvedAmount, display);
  const required = formatApprovalAmount(requiredAmount, display);

  return (
    <Trans>
      Approved {approved}, but {required} is required. Approve again or reduce the amount.
    </Trans>
  );
}
