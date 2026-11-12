import { t } from "@lingui/macro";
import { useCallback, useEffect, useMemo, useRef } from "react";

import {
  selectFeeDiscountError,
  selectIsOrdersLoading,
  selectIsPositionsLoading,
  selectMarketsInfoError,
  selectOrdersInfoError,
  selectPositionsInfoError,
  selectProDiscountFactor,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectTradeboxAllowedSlippage,
  selectTradeboxCollateralToken,
  selectTradeboxFromToken,
  selectTradeboxDecreasePositionAmounts,
  selectTradeboxSelectedPosition,
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxIsFromTokenGmxAccount,
  selectTradeboxIsTPSLEnabled,
  selectTradeboxMarketInfo,
  selectTradeboxTradeFlags,
  selectTradeboxTradeMode,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { selectTradeboxTradeTypeError } from "context/SyntheticsStateContext/selectors/tradeboxSelectors/selectTradeboxTradeErrors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import type { SolanaTradeboxState } from "domain/solana/solanaTradebox";
import { useSolanaBalances } from "domain/solana/useSolanaBalances";
import { useSolanaOrderNotifications } from "domain/solanaOrderTracking/useSolanaOrderNotifications";
import { useSidecarEntries } from "domain/synthetics/sidecarOrders/useSidecarEntries";
import { useSidecarOrders } from "domain/synthetics/sidecarOrders/useSidecarOrders";
import { useHasOutdatedUi } from "lib/useHasOutdatedUi";
import { useSolanaWalletSession } from "lib/wallets/solanaWalletSession";

import { useGmsolOrderTransactions } from "../transactions/useGmsolOrderTransactions";
import { useSolanaTradingEnabled } from "../useSolanaTradingEnabled";
import {
  buildGmsolTradeboxOrderAction,
  buildGmsolTradeboxTriggerAction,
  GmsolTradeboxError,
  type GmsolTradeboxErrorCode,
} from "./buildTradeboxOrderAction";

function getEntryError(code: GmsolTradeboxErrorCode) {
  switch (code) {
    case "market":
      return t`Select a market`;
    case "math":
      return t`Solana market calculations are unavailable`;
    case "mode":
      return t`This order type is not supported on Solana`;
    case "amounts":
      return t`Enter an amount`;
    case "swap":
      return t`Pay with the selected collateral token`;
    case "tokenProgram":
      return t`This collateral token is not supported for trading yet`;
    case "tpsl":
      return t`Review your TP/SL orders`;
  }
}

/** Headless lazy adapter: the shared TradeBox owns all inputs, layout and previews. */
export default function GmsolTradeboxAdapter({
  onChange,
  sessionId,
}: {
  onChange: (state: SolanaTradeboxState) => void;
  sessionId: object;
}) {
  const wallet = useSolanaWalletSession();
  const { submit, isSubmitting } = useGmsolOrderTransactions();
  const { begin } = useSolanaOrderNotifications();
  const { isSolanaTradingEnabled, isLoading: isTradingLoading } = useSolanaTradingEnabled({ enabled: true });
  const balances = useSolanaBalances(wallet.address);
  const marketInfo = useSelector(selectTradeboxMarketInfo);
  const fromToken = useSelector(selectTradeboxFromToken);
  const collateralToken = useSelector(selectTradeboxCollateralToken);
  const allowedSlippage = useSelector(selectTradeboxAllowedSlippage);
  const amounts = useSelector(selectTradeboxIncreasePositionAmounts);
  const tradeMode = useSelector(selectTradeboxTradeMode);
  const { isLong, isIncrease, isMarket, isTrigger } = useSelector(selectTradeboxTradeFlags);
  const decreaseAmounts = useSelector(selectTradeboxDecreasePositionAmounts);
  const selectedPosition = useSelector(selectTradeboxSelectedPosition);
  const tradeError = useSelector(selectTradeboxTradeTypeError);
  const isFromTokenGmxAccount = useSelector(selectTradeboxIsFromTokenGmxAccount);
  const feeDiscountError = useSelector(selectFeeDiscountError);
  const feeDiscountFactor = useSelector(selectProDiscountFactor);
  const marketsError = useSelector(selectMarketsInfoError);
  const positionsError = useSelector(selectPositionsInfoError);
  const ordersError = useSelector(selectOrdersInfoError);
  const positionsLoading = useSelector(selectIsPositionsLoading);
  const ordersLoading = useSelector(selectIsOrdersLoading);
  const isTpSlEnabled = useSelector(selectTradeboxIsTPSLEnabled);
  const entries = useSidecarEntries();
  const sidecars = useSidecarOrders();
  const hasOutdatedUi = useHasOutdatedUi();

  const intent = useMemo(() => {
    try {
      if (isTrigger) {
        if (!selectedPosition || selectedPosition.account !== wallet.address) return { error: t`Select a position` };
        return {
          action: buildGmsolTradeboxTriggerAction({ marketInfo, collateralToken, amounts: decreaseAmounts, isLong }),
        };
      }
      if (!isIncrease) return { error: t`This order type is not supported on Solana` };
      if (isTpSlEnabled && (sidecars.takeProfit.error || sidecars.stopLoss.error))
        return { error: t`Review your TP/SL orders` };
      return {
        action: buildGmsolTradeboxOrderAction({
          marketInfo,
          fromToken,
          collateralToken,
          amounts,
          tradeMode,
          allowedSlippage,
          isLong,
          sidecarEntries: isTpSlEnabled ? entries : [],
        }),
      };
    } catch (error) {
      return { error: error instanceof GmsolTradeboxError ? getEntryError(error.code) : t`Unable to prepare order` };
    }
  }, [
    amounts,
    allowedSlippage,
    decreaseAmounts,
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

  let error: string | undefined;
  if (hasOutdatedUi) error = t`Page outdated. Refresh`;
  else if (wallet.isRestoring) error = t`Connecting wallet...`;
  else if (isFromTokenGmxAccount) error = t`Select wallet balance to trade on Solana`;
  else if (isTradingLoading) error = t`Loading...`;
  else if (!isSolanaTradingEnabled) error = t`Solana trading is unavailable`;
  else if (marketsError || positionsError || ordersError || feeDiscountError || balances.error)
    error = t`Unable to load trading data`;
  else if (
    wallet.address &&
    (balances.isLoading || !balances.data || positionsLoading || ordersLoading || feeDiscountFactor === undefined)
  )
    error = t`Loading...`;
  else error = tradeError.buttonErrorMessage ?? intent.error;

  const current = useRef({ error, intent, owner: wallet.address });
  current.current = { error, intent, owner: wallet.address };
  const onSubmit = useCallback(async () => {
    const { error, intent, owner } = current.current;
    if (error || !intent.action || !owner) return false;
    const notification = begin({ title: t`Order request`, trackExecution: isMarket });
    try {
      const result = await submit(intent.action, { onSubmitted: notification.submitted });
      notification.submitted(result);
      return true;
    } catch (error) {
      notification.failed(error);
      return false;
    }
  }, [begin, isMarket, submit]);

  const text = isSubmitting
    ? t`Sending order request...`
    : !wallet.address
      ? t`Connect wallet`
      : error ?? (isTrigger ? t`Create TP/SL order` : isLong ? t`Long` : t`Short`);
  useEffect(() => {
    onChange({
      sessionId,
      owner: wallet.address,
      text,
      disabled: isSubmitting || Boolean(wallet.address && error) || wallet.isRestoring,
      isSubmitting,
      onSubmit,
    });
  }, [error, isSubmitting, onChange, onSubmit, sessionId, text, wallet.address, wallet.isRestoring]);
  return null;
}
