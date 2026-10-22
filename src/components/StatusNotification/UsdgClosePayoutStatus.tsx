import { Trans } from "@lingui/macro";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import useSWR from "swr";

import { getUsdgConversionTokenAddress } from "config/usdgPools";
import type { PendingOrderData } from "context/SyntheticsEvents";
import { getReceivedTokenAmounts } from "domain/synthetics/paxosTransit/getReceivedTokenAmount";
import { formatAmountFree, formatBalanceAmount } from "lib/numbers";
import { getToken } from "sdk/configs/tokens";

export function UsdgClosePayoutStatus({
  chainId,
  pendingOrderData,
  executedTxnHash,
  onConvertLinkShown,
}: {
  chainId: number;
  pendingOrderData: PendingOrderData;
  executedTxnHash: string;
  onConvertLinkShown?: () => void;
}) {
  const usdgAddress = pendingOrderData.initialCollateralTokenAddress;
  const usdcAddress = getUsdgConversionTokenAddress(chainId, usdgAddress);

  const { data: receivedAmounts } = useSWR(
    usdcAddress ? ["usdgClosePayout", chainId, executedTxnHash, pendingOrderData.account] : null,
    () =>
      getReceivedTokenAmounts({
        chainId,
        txnHash: executedTxnHash,
        tokenAddresses: [usdgAddress, usdcAddress!],
        account: pendingOrderData.account,
      }),
    { refreshInterval: 0, revalidateOnFocus: false, revalidateOnReconnect: false, revalidateIfStale: false }
  );

  const receivedTokenAddress =
    usdcAddress && receivedAmounts ? (receivedAmounts[usdcAddress] > 0n ? usdcAddress : usdgAddress) : undefined;
  const receivedAmount = receivedTokenAddress && receivedAmounts ? receivedAmounts[receivedTokenAddress] : 0n;
  const isUsdcRequested = usdcAddress !== undefined && pendingOrderData.requestedReceiveTokenAddress === usdcAddress;
  const isPaidInUsdg = receivedTokenAddress === usdgAddress;
  const isConvertLinkShown = isUsdcRequested && isPaidInUsdg && receivedAmount > 0n;

  useEffect(
    function keepToastWithConvertLink() {
      if (isConvertLinkShown) {
        onConvertLinkShown?.();
      }
    },
    [isConvertLinkShown, onConvertLinkShown]
  );

  // payouts to the GMX Account go to the multichain vault, not to the account
  if (!usdcAddress || !receivedTokenAddress || receivedAmount === 0n) {
    return null;
  }

  const receivedToken = getToken(chainId, receivedTokenAddress);
  const usdc = getToken(chainId, usdcAddress);
  const isConversionFailed = isUsdcRequested && isPaidInUsdg && pendingOrderData.swapPath.length > 0;
  const receivedSymbol = receivedToken.symbol;
  const usdcSymbol = usdc.symbol;
  const receivedText = formatBalanceAmount(receivedAmount, receivedToken.decimals, receivedToken.symbol, {
    isStable: receivedToken.isStable,
  });

  return (
    <div className="mt-8 flex flex-col gap-4">
      {isConversionFailed && (
        <div className="text-yellow-300">
          <Trans>
            Paid in {receivedSymbol}: the conversion to {usdcSymbol} couldn't fill
          </Trans>
        </div>
      )}
      <div>
        <Trans>Received {receivedText}</Trans>
      </div>
      {isConvertLinkShown && (
        <Link
          className="text-blue-300 underline"
          to={`/trade/swap?mode=market&from=${receivedToken.symbol}&to=${usdc.symbol}&amount=${formatAmountFree(
            receivedAmount,
            receivedToken.decimals
          )}`}
        >
          <Trans>Convert to {usdcSymbol}</Trans>
        </Link>
      )}
    </div>
  );
}
