import { Trans } from "@lingui/macro";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import useSWR from "swr";

import { getUsdgConversionTokenAddress } from "config/usdgPools";
import type { PendingOrderData } from "context/SyntheticsEvents";
import { getReceivedTokenAmounts } from "domain/synthetics/paxosTransit/getReceivedTokenAmount";
import { getUsdgClosePayout } from "domain/synthetics/usdgPools/closePayout";
import { formatAmountFree, formatBalanceAmount } from "lib/numbers";
import { getToken } from "sdk/configs/tokens";

export function UsdgClosePayoutStatus({
  chainId,
  pendingOrderData,
  executedTxnHash,
  toastId,
  onKeepOpenChange,
}: {
  chainId: number;
  pendingOrderData: PendingOrderData;
  executedTxnHash: string;
  toastId: number;
  onKeepOpenChange?: (key: string, isKeptOpen: boolean) => void;
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

  const isUsdcRequested = usdcAddress !== undefined && pendingOrderData.requestedReceiveTokenAddress === usdcAddress;
  const payout =
    usdcAddress && receivedAmounts
      ? getUsdgClosePayout({
          receivedAmounts,
          usdgAddress,
          usdcAddress,
          isUsdcRequested,
          swapPathLength: pendingOrderData.swapPath.length,
        })
      : undefined;
  // the convert link is the only prompt to swap a USDG payout back, so the toast waits for it,
  // including while a receipt the RPC doesn't have yet is retried
  const isKeptOpen = isUsdcRequested && (receivedAmounts === undefined || Boolean(payout?.isConvertLinkShown));

  useEffect(
    function keepToastOpenForConvertLink() {
      onKeepOpenChange?.(executedTxnHash, isKeptOpen);
    },
    [executedTxnHash, isKeptOpen, onKeepOpenChange]
  );

  if (!usdcAddress || !payout) {
    return null;
  }

  const receivedToken = getToken(chainId, payout.receivedTokenAddress);
  const usdc = getToken(chainId, usdcAddress);
  const receivedSymbol = receivedToken.symbol;
  const usdcSymbol = usdc.symbol;
  const receivedText = formatBalanceAmount(payout.receivedAmount, receivedToken.decimals, receivedToken.symbol, {
    isStable: receivedToken.isStable,
  });

  return (
    <div className="mt-8 flex flex-col gap-4">
      {payout.isConversionFailed && (
        <div className="text-yellow-300">
          <Trans>
            Paid in {receivedSymbol}: the conversion to {usdcSymbol} couldn't fill
          </Trans>
        </div>
      )}
      <div>
        <Trans>Received {receivedText}</Trans>
      </div>
      {payout.isConvertLinkShown && (
        <Link
          className="text-blue-300 underline"
          to={`/trade/swap?mode=market&from=${receivedToken.symbol}&to=${usdc.symbol}&amount=${formatAmountFree(
            payout.receivedAmount,
            receivedToken.decimals
          )}`}
          onClick={() => toast.dismiss(toastId)}
        >
          <Trans>Convert to {usdcSymbol}</Trans>
        </Link>
      )}
    </div>
  );
}
