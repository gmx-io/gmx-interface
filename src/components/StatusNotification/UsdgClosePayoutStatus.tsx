import { Trans } from "@lingui/macro";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import useSWR from "swr";

import type { ContractsChainId } from "config/chains";
import type { PendingOrderData } from "context/SyntheticsEvents";
import { getUsdgClosePayout } from "domain/synthetics/usdgPools/closePayout";
import { fetchUsdgCloseReceiptAmounts } from "domain/synthetics/usdgPools/fetchUsdgCloseReceiptAmounts";
import { formatAmountFree, formatBalanceAmount } from "lib/numbers";
import { getToken } from "sdk/configs/tokens";

export function UsdgClosePayoutStatus({
  chainId,
  pendingOrderData,
  orderKey,
  executedTxnHash,
  outTokenAddress,
  toastId,
  onKeepOpenChange,
}: {
  chainId: ContractsChainId;
  pendingOrderData: PendingOrderData;
  orderKey: string;
  executedTxnHash: string;
  outTokenAddress: string;
  toastId: number;
  onKeepOpenChange?: (key: string, isKeptOpen: boolean) => void;
}) {
  const usdgAddress = pendingOrderData.initialCollateralTokenAddress;
  const requestedTokenAddress = pendingOrderData.requestedReceiveTokenAddress ?? outTokenAddress;

  const { data: receiptAmounts } = useSWR(
    ["usdgClosePayout", chainId, executedTxnHash, orderKey, pendingOrderData.account],
    () =>
      fetchUsdgCloseReceiptAmounts({
        chainId,
        txnHash: executedTxnHash,
        account: pendingOrderData.account,
        orderKey,
        usdgAddress,
        lastSwapMarketAddress: pendingOrderData.swapPath.at(-1),
      }),
    { refreshInterval: 0, revalidateOnFocus: false, revalidateOnReconnect: false, revalidateIfStale: false }
  );

  const payout = receiptAmounts
    ? getUsdgClosePayout({
        receiptAmounts,
        usdgAddress,
        outTokenAddress,
        requestedTokenAddress,
        swapPathLength: pendingOrderData.swapPath.length,
      })
    : undefined;
  // the convert link is the only prompt to swap a USDG payout back, so the toast waits for it,
  // including while a receipt the RPC doesn't have yet is retried
  const isKeptOpen =
    requestedTokenAddress !== usdgAddress &&
    (receiptAmounts === undefined || payout?.convertToTokenAddress !== undefined);

  useEffect(
    function keepToastOpenForConvertLink() {
      onKeepOpenChange?.(executedTxnHash, isKeptOpen);
    },
    [executedTxnHash, isKeptOpen, onKeepOpenChange]
  );

  if (!payout) {
    return null;
  }

  const receivedToken = getToken(chainId, payout.receivedTokenAddress);
  const receivedSymbol = receivedToken.symbol;
  const receivedText = formatBalanceAmount(payout.receivedAmount, receivedToken.decimals, receivedToken.symbol, {
    isStable: receivedToken.isStable,
  });
  const convertToToken =
    payout.convertToTokenAddress === undefined ? undefined : getToken(chainId, payout.convertToTokenAddress);
  const convertToSymbol = convertToToken?.symbol;

  return (
    <div className="mt-8 flex flex-col gap-4">
      {payout.isConversionFailed && (
        <div className="text-yellow-300">
          <Trans>
            Paid in {receivedSymbol}: the conversion to {convertToSymbol} couldn't fill
          </Trans>
        </div>
      )}
      <div>
        <Trans>Received {receivedText}</Trans>
      </div>
      {convertToToken && (
        <Link
          className="text-blue-300 underline"
          to={`/trade/swap?mode=market&from=${receivedToken.symbol}&to=${convertToToken.symbol}&amount=${formatAmountFree(
            payout.receivedAmount,
            receivedToken.decimals
          )}`}
          onClick={() => toast.dismiss(toastId)}
        >
          <Trans>Convert to {convertToSymbol}</Trans>
        </Link>
      )}
    </div>
  );
}
