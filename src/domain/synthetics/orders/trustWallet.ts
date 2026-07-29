export function getShouldShowTrustWalletSidePanelWarning({
  isTrustWallet,
  isUserRejectedError,
}: {
  isTrustWallet: boolean;
  isUserRejectedError: boolean;
}) {
  return isTrustWallet && isUserRejectedError;
}
