import { t } from "@lingui/macro";

export function getIsGasPaymentTokenApproval({
  tokenAddress,
  gasPaymentTokenAddress,
  payTokenAddress,
}: {
  tokenAddress: string;
  gasPaymentTokenAddress: string | undefined;
  payTokenAddress: string | undefined;
}): boolean {
  return tokenAddress === gasPaymentTokenAddress && tokenAddress !== payTokenAddress;
}

export function getApproveButtonText({
  tokenSymbol,
  isGasPaymentToken,
}: {
  tokenSymbol: string;
  isGasPaymentToken: boolean;
}): string {
  return isGasPaymentToken ? t`Approve ${tokenSymbol} for Express fees` : t`Approve ${tokenSymbol}`;
}

export function getGasPaymentTokenApprovalTooltip(tokenSymbol: string): string {
  return t`${tokenSymbol} is your Wallet gas payment token. One-time approval so Express fees can be paid in ${tokenSymbol}. Change it in Settings.`;
}
