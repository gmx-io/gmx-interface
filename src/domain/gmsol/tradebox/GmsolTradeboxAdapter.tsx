import { t } from "@lingui/macro";
import { useCallback, useEffect, useMemo, useRef } from "react";
import useSWR from "swr";

import {
  selectFeeDiscountError,
  selectIsAccountDataSyncing,
  selectIsOrdersLoading,
  selectIsPositionsLoading,
  selectMarketsInfoError,
  selectOrdersInfoError,
  selectPositionsInfoError,
  selectFeeDiscountFactor,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectTradeboxAllowedSlippage,
  selectTradeboxCollateralToken,
  selectTradeboxFormState,
  selectTradeboxFromToken,
  selectTradeboxFromTokenAddress,
  selectTradeboxDecreasePositionAmounts,
  selectTradeboxExistingPositionForPreview,
  selectTradeboxSelectedPosition,
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxIsFromTokenGmxAccount,
  selectTradeboxIsTPSLEnabled,
  selectTradeboxMarginPayTokens,
  selectTradeboxMarketAddress,
  selectTradeboxMarketInfo,
  selectTradeboxTradeFlags,
  selectTradeboxTradeMode,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { selectTradeboxTradeTypeError } from "context/SyntheticsStateContext/selectors/tradeboxSelectors/selectTradeboxTradeErrors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useGmsolWalletBalances } from "domain/gmsol/useGmsolWalletBalances";
import type { SolanaTradeboxState } from "domain/solana/solanaTradebox";
import { useSidecarEntries } from "domain/synthetics/sidecarOrders/useSidecarEntries";
import { useSidecarOrders } from "domain/synthetics/sidecarOrders/useSidecarOrders";
import { fetchSolanaRentExemptMinimums } from "lib/solana/networkCosts";
import { useHasOutdatedUi } from "lib/useHasOutdatedUi";
import { retryAtRefreshCadence } from "lib/useSWRWithFreshness";
import { useSolanaWalletSession } from "lib/wallets/solanaWalletSession";
import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";

import { GmsolMarketsUnavailableError } from "../markets/gmsolMarketsUnavailable";
import { getPreparedWrappedLamports } from "../orderTracking/classifyOrderFailure";
import { getGmsolCreateOrderTitles } from "../orderTracking/orderStatusTitles";
import { useSolanaOrderNotifications } from "../orderTracking/useSolanaOrderNotifications";
import { getPendingGmsolSubmission } from "../transactions/pendingSubmission";
import { GMSOL_RENT_ACCOUNT_SIZES, getGmsolIncreaseSolCosts, getGmsolSolReserve } from "../transactions/solReserve";
import { useGmsolOrderTransactions } from "../transactions/useGmsolOrderTransactions";
import { useSolanaTradingEnabled } from "../useSolanaTradingEnabled";
import {
  buildGmsolTradeboxOrderAction,
  buildGmsolTradeboxTriggerAction,
  getGmsolTradeboxTriggerEntries,
  GmsolTradeboxError,
} from "./buildTradeboxOrderAction";
import { getGmsolTradeboxErrorMessage } from "./tradeboxErrorMessages";

/** Headless lazy adapter: the shared TradeBox owns all inputs, layout and previews. */
export default function GmsolTradeboxAdapter({
  onChange,
  sessionId,
}: {
  onChange: (state: SolanaTradeboxState) => void;
  sessionId: object;
}) {
  const wallet = useSolanaWalletSession();
  const { acquire, isSubmitting, hasPendingSubmission } = useGmsolOrderTransactions();
  const { begin } = useSolanaOrderNotifications();
  const { isSolanaTradingEnabled, isLoading: isTradingLoading } = useSolanaTradingEnabled({ enabled: true });
  const balances = useGmsolWalletBalances(wallet.address);
  const marketInfo = useSelector(selectTradeboxMarketInfo);
  const fromToken = useSelector(selectTradeboxFromToken);
  const collateralToken = useSelector(selectTradeboxCollateralToken);
  const allowedSlippage = useSelector(selectTradeboxAllowedSlippage);
  const amounts = useSelector(selectTradeboxIncreasePositionAmounts);
  const tradeMode = useSelector(selectTradeboxTradeMode);
  const { isLong, isIncrease, isLimit, isMarket, isTrigger } = useSelector(selectTradeboxTradeFlags);
  const decreaseAmounts = useSelector(selectTradeboxDecreasePositionAmounts);
  const selectedPosition = useSelector(selectTradeboxSelectedPosition);
  const existingPosition = useSelector(selectTradeboxExistingPositionForPreview);
  const tradeError = useSelector(selectTradeboxTradeTypeError);
  const isFromTokenGmxAccount = useSelector(selectTradeboxIsFromTokenGmxAccount);
  const feeDiscountError = useSelector(selectFeeDiscountError);
  const feeDiscountFactor = useSelector(selectFeeDiscountFactor);
  const marketsError = useSelector(selectMarketsInfoError);
  const isAccountDataSyncing = useSelector(selectIsAccountDataSyncing);
  const positionsError = useSelector(selectPositionsInfoError);
  const ordersError = useSelector(selectOrdersInfoError);
  const positionsLoading = useSelector(selectIsPositionsLoading);
  const ordersLoading = useSelector(selectIsOrdersLoading);
  const isTpSlEnabled = useSelector(selectTradeboxIsTPSLEnabled) && !isLimit;
  const entries = useSidecarEntries();
  const sidecars = useSidecarOrders();
  const hasOutdatedUi = useHasOutdatedUi();
  const payTokens = useSelector(selectTradeboxMarginPayTokens);
  const fromTokenAddress = useSelector(selectTradeboxFromTokenAddress);
  const selectedMarketAddress = useSelector(selectTradeboxMarketAddress);
  const { setFromTokenAddress, setFromTokenInputValue } = useSelector(selectTradeboxFormState);

  // The builder takes no swap, so Pay follows the collateral; a typed amount would change token, so it is cleared.
  useEffect(() => {
    if (!isIncrease || marketInfo?.tradeMath !== "gmsol" || payTokens.length === 0) return;
    if (payTokens.some((token) => token.address === fromTokenAddress)) return;
    setFromTokenAddress((payTokens.find((token) => token.isNative) ?? payTokens[0]).address);
    setFromTokenInputValue("");
  }, [fromTokenAddress, isIncrease, marketInfo?.tradeMath, payTokens, setFromTokenAddress, setFromTokenInputValue]);

  const payWithNativeSol = fromToken?.isNative === true && fromToken.address === NATIVE_TOKEN_ADDRESS;
  // A native SOL payment is checked against lamports only, so it cannot spend WSOL that a preparation wrapped.
  const wrappedCollateralAddress =
    isIncrease && payWithNativeSol && collateralToken && collateralToken.address === fromToken.wrappedAddress
      ? collateralToken.address
      : undefined;
  const rent = useSWR(
    wallet.address && payWithNativeSol ? ["gmsolRentExemptMinimums"] : null,
    () => fetchSolanaRentExemptMinimums(GMSOL_RENT_ACCOUNT_SIZES),
    { onErrorRetry: retryAtRefreshCadence }
  );
  const orderCount = 1 + (isTpSlEnabled ? getGmsolTradeboxTriggerEntries(entries).length : 0);
  const isPureMarket = marketInfo !== undefined && marketInfo.longTokenAddress === marketInfo.shortTokenAddress;
  const hasPosition = selectedPosition !== undefined;
  const solHoldback = useMemo(
    () =>
      rent.data
        ? getGmsolSolReserve(getGmsolIncreaseSolCosts({ orderCount, isPureMarket, hasPosition }), rent.data)
        : undefined,
    [hasPosition, isPureMarket, orderCount, rent.data]
  );
  const isShortOfSol =
    isIncrease &&
    payWithNativeSol &&
    solHoldback !== undefined &&
    amounts !== undefined &&
    fromToken?.balance !== undefined &&
    amounts.initialCollateralAmount + solHoldback > fromToken.balance;

  const intent = useMemo(() => {
    try {
      if (isTrigger) {
        if (!selectedPosition || selectedPosition.account !== wallet.address) return { error: t`Select a position` };
        const action = buildGmsolTradeboxTriggerAction({
          marketInfo,
          collateralToken,
          amounts: decreaseAmounts,
          isLong,
        });
        return { action, orders: getGmsolCreateOrderTitles(action, { marketInfo, collateralToken }) };
      }
      if (!isIncrease) return { error: t`This order type is not supported on Solana` };
      if (isTpSlEnabled && (sidecars.takeProfit.error || sidecars.stopLoss.error))
        return { error: t`Review your TP/SL orders` };
      const action = buildGmsolTradeboxOrderAction({
        marketInfo,
        fromToken,
        collateralToken,
        amounts,
        tradeMode,
        allowedSlippage,
        isLong,
        sidecarEntries: isTpSlEnabled ? entries : [],
        existingPositionSizeUsd: existingPosition?.sizeInUsd,
      });
      return {
        action,
        orders: getGmsolCreateOrderTitles(action, { marketInfo, collateralToken, payToken: fromToken }),
      };
    } catch (error) {
      return {
        error:
          error instanceof GmsolTradeboxError ? getGmsolTradeboxErrorMessage(error.code) : t`Unable to prepare order`,
      };
    }
  }, [
    amounts,
    allowedSlippage,
    decreaseAmounts,
    existingPosition?.sizeInUsd,
    selectedPosition,
    wallet.address,
    isTrigger,
    collateralToken,
    entries,
    fromToken,
    isIncrease,
    isLong,
    isTpSlEnabled,
    marketInfo,
    sidecars.stopLoss.error,
    sidecars.takeProfit.error,
    tradeMode,
  ]);

  // A coverage gap blocks only its markets; the stored address still names a market that lost its marketInfo.
  const isBlocking = (dataError: Error | undefined) =>
    dataError !== undefined &&
    !(
      dataError instanceof GmsolMarketsUnavailableError &&
      dataError.reason === "coverage" &&
      (selectedMarketAddress === undefined || !dataError.marketAddresses.includes(selectedMarketAddress))
    );

  let error: string | undefined;
  if (hasOutdatedUi) error = t`Page outdated. Refresh`;
  else if (wallet.isRestoring) error = t`Connecting wallet...`;
  else if (isFromTokenGmxAccount) error = t`Select wallet balance to trade on Solana`;
  else if (isTradingLoading) error = t`Loading...`;
  else if (!isSolanaTradingEnabled) error = t`Solana trading is unavailable`;
  else if ([marketsError, positionsError, ordersError, balances.error].some(isBlocking))
    error = t`Unable to load trading data`;
  else if (
    wallet.address &&
    (isAccountDataSyncing ||
      balances.isLoading ||
      !balances.data ||
      positionsLoading ||
      ordersLoading ||
      // Without the discount the previews only overstate the fee, and the order never reads it.
      (feeDiscountFactor === undefined && !feeDiscountError))
  )
    error = t`Loading...`;
  else
    error =
      tradeError.buttonErrorMessage ??
      intent.error ??
      (isShortOfSol ? t`Not enough SOL for network fees, keeper fees and account rent` : undefined);

  const current = useRef({ error, intent, owner: wallet.address, hasPendingSubmission, wrappedCollateralAddress });
  current.current = { error, intent, owner: wallet.address, hasPendingSubmission, wrappedCollateralAddress };
  const onSubmit = useCallback(async () => {
    const { error, intent, owner, hasPendingSubmission } = current.current;
    if (!owner) return false;
    // Read at click time: the last render can trail another tab or a send that has just ended.
    const pending = getPendingGmsolSubmission(owner);
    if (!pending && (hasPendingSubmission || error || !intent.action)) return false;
    const submission = acquire(owner);
    if (!submission) return false;
    try {
      const notification = begin({
        owner,
        operation: pending ? pending.operation : "create",
        orders: pending ? [] : intent.orders ?? [],
        trackExecution: pending?.trackExecution ?? isMarket,
      });
      try {
        const result = await submission.submit(pending ? undefined : intent.action, {
          onSubmitted: notification.submitted,
        });
        notification.submitted(result);
        return true;
      } catch (error) {
        // Read after the wallet prompt, so a Pay changed meanwhile is kept; WSOL is a listed Pay, so the amount stays.
        const { wrappedCollateralAddress } = current.current;
        const isPaySetToWsol =
          wrappedCollateralAddress !== undefined && submission.isActive() && getPreparedWrappedLamports(error) > 0n;
        if (isPaySetToWsol) setFromTokenAddress(wrappedCollateralAddress);
        notification.failed(error, isPaySetToWsol);
        return false;
      }
    } finally {
      submission.release();
    }
  }, [acquire, begin, isMarket, setFromTokenAddress]);

  const text = isSubmitting
    ? hasPendingSubmission
      ? t`Checking transaction status...`
      : t`Sending order request...`
    : !wallet.address
      ? t`Connect wallet`
      : hasPendingSubmission
        ? t`Check transaction status`
        : error ?? (isTrigger ? t`Create TP/SL order` : isLong ? t`Long` : t`Short`);
  const isSolHoldbackUnavailable = rent.error !== undefined;
  useEffect(() => {
    onChange({
      sessionId,
      owner: wallet.address,
      text,
      disabled: isSubmitting || Boolean(wallet.address && error && !hasPendingSubmission) || wallet.isRestoring,
      isSubmitting,
      onSubmit,
      solHoldback,
      isSolHoldbackUnavailable,
    });
  }, [
    error,
    hasPendingSubmission,
    isSolHoldbackUnavailable,
    isSubmitting,
    onChange,
    onSubmit,
    sessionId,
    solHoldback,
    text,
    wallet.address,
    wallet.isRestoring,
  ]);
  return null;
}
