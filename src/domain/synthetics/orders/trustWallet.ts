export function getShouldShowTrustWalletSidePanelWarning({
  isExpress,
  isTrustWallet,
  isUserRejectedError,
}: {
  isExpress: boolean;
  isTrustWallet: boolean;
  isUserRejectedError: boolean;
}) {
  return isExpress && isTrustWallet && isUserRejectedError;
}
