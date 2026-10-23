import { Trans } from "@lingui/macro";
import { ReactNode, useCallback } from "react";
import { useHistory } from "react-router-dom";

import { getChainName } from "config/chains";
import { useSubaccountContext } from "context/SubaccountContext/SubaccountContextProvider";
import { selectChainId, selectTokensData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectExternalSwapBlockReason,
  selectTradeboxCollateralTokenAddress,
  selectTradeboxFromToken,
  selectTradeboxFromTokenAmount,
  selectTradeboxIsFromTokenGmxAccount,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import {
  selectTradeboxIsUsdgConversionTooLarge,
  selectTradeboxUsdgMaxInstantAmount,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors/tradeboxUsdgConversionSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useIsSwapTabPaxosOffered } from "domain/synthetics/paxosTransit/useIsSwapTabPaxosOffered";
import { convertToUsd, getMidPrice } from "domain/synthetics/tokens";
import { formatMaxInstantAmount } from "domain/synthetics/usdgPools/usdcConversion";
import { formatAmountFree } from "lib/numbers";

import { EmbeddedActionButton } from "components/Button/EmbeddedActionButton";

export type TradeboxUsdgConversion = ReturnType<typeof useTradeboxUsdgConversion>;

/**
 * USDG pools take only USDG: a USDC margin converts inside the order through our pool or the aggregator,
 * and when neither can fill the trader needs the instant limit instead of a bare "No swap path found"
 */
export function useTradeboxUsdgConversion({
  setFromTokenInputValue,
  setFocusedInput,
}: {
  setFromTokenInputValue: (value: string, resetPriceImpactAndSwapSlippage?: boolean) => void;
  setFocusedInput: (input: "from" | "to") => void;
}) {
  const history = useHistory();
  const chainId = useSelector(selectChainId);
  const tokensData = useSelector(selectTokensData);
  const collateralTokenAddress = useSelector(selectTradeboxCollateralTokenAddress);
  const fromToken = useSelector(selectTradeboxFromToken);
  const fromTokenAmount = useSelector(selectTradeboxFromTokenAmount);
  const isFromTokenGmxAccount = useSelector(selectTradeboxIsFromTokenGmxAccount);
  const isTooLarge = useSelector(selectTradeboxIsUsdgConversionTooLarge);
  const maxInstantAmount = useSelector(selectTradeboxUsdgMaxInstantAmount);
  const usdgToken = collateralTokenAddress ? tokensData?.[collateralTokenAddress] : undefined;

  const onUseMaxInstant = useCallback(() => {
    if (maxInstantAmount === undefined || !fromToken) return;

    setFocusedInput("from");
    setFromTokenInputValue(formatAmountFree(maxInstantAmount, fromToken.decimals), true);
  }, [fromToken, maxInstantAmount, setFocusedInput, setFromTokenInputValue]);

  const onConvertWithPaxos = useCallback(() => {
    if (!fromToken || !usdgToken || fromTokenAmount === undefined) return;

    history.push(
      `/trade/swap?mode=market&from=${fromToken.symbol}&to=${usdgToken.symbol}&amount=${formatAmountFree(
        fromTokenAmount,
        fromToken.decimals
      )}`
    );
  }, [fromToken, fromTokenAmount, history, usdgToken]);

  const maxInstantText =
    maxInstantAmount !== undefined && fromToken ? formatMaxInstantAmount(fromToken, maxInstantAmount) : undefined;
  const fromTokenUsd =
    isTooLarge && fromToken && fromTokenAmount !== undefined
      ? convertToUsd(fromTokenAmount, fromToken.decimals, getMidPrice(fromToken.prices))
      : undefined;
  const {
    isOffered: isPaxosOffered,
    minimumText: paxosMinimumText,
    isWalletOnly: isPaxosWalletOnly,
  } = useIsSwapTabPaxosOffered({
    amount: fromTokenAmount,
    amountUsd: fromTokenUsd,
    // the banner shows only when no instant route can fill the amount
    instantAmountOut: undefined,
    isGmxAccount: isFromTokenGmxAccount,
    enabled: isTooLarge,
  });
  const settlementChainName = getChainName(chainId);
  let paxosHint: ReactNode = null;

  if (isPaxosWalletOnly) {
    paxosHint = (
      <div className="mt-4">
        <Trans>Paxos converts USDC from your wallet on {settlementChainName}.</Trans>
      </div>
    );
  } else if (!isPaxosOffered && paxosMinimumText) {
    paxosHint = (
      <div className="mt-4">
        <Trans>Paxos converts amounts from {paxosMinimumText}.</Trans>
      </div>
    );
  }

  const externalSwapBlockReason = useSelector(selectExternalSwapBlockReason);
  const subaccountContext = useSubaccountContext();
  const onDisableOneClickTrading = useCallback(() => {
    void subaccountContext.tryDisableSubaccount();
  }, [subaccountContext]);
  // the too-large check can't ask the aggregator while One-Click Trading is on, and its own card is hidden here
  const oneClickTradingHint =
    externalSwapBlockReason === "oneClickTrading" ? (
      <div className="mt-4">
        <Trans>
          One-Click Trading skips external routes, which may convert the full amount.{" "}
          <EmbeddedActionButton tone="link" onClick={onDisableOneClickTrading}>
            Disable One-Click Trading
          </EmbeddedActionButton>
          .
        </Trans>
      </div>
    ) : null;

  let tooLargeAlert: ReactNode = undefined;

  if (isTooLarge && maxInstantAmount !== undefined && maxInstantAmount > 0n && isPaxosOffered) {
    tooLargeAlert = (
      <Trans>
        Up to {maxInstantText} can be converted instantly.{" "}
        <EmbeddedActionButton tone="link" onClick={onUseMaxInstant}>
          Use max instant
        </EmbeddedActionButton>
        , or{" "}
        <EmbeddedActionButton tone="link" onClick={onConvertWithPaxos}>
          convert with Paxos first
        </EmbeddedActionButton>{" "}
        in the Swap tab: a one-time conversion, 2 to 10 min or longer. Trades paid in USDG need no conversion.
      </Trans>
    );
  } else if (isTooLarge && maxInstantAmount !== undefined && maxInstantAmount > 0n) {
    tooLargeAlert = (
      <>
        <Trans>
          Up to {maxInstantText} can be converted instantly.{" "}
          <EmbeddedActionButton tone="link" onClick={onUseMaxInstant}>
            Use max instant
          </EmbeddedActionButton>
          . Trades paid in USDG need no conversion.
        </Trans>
        {paxosHint}
      </>
    );
  } else if (isTooLarge && maxInstantAmount !== undefined && isPaxosOffered) {
    tooLargeAlert = (
      <Trans>
        Nothing can be converted instantly right now.{" "}
        <EmbeddedActionButton tone="link" onClick={onConvertWithPaxos}>
          Convert with Paxos first
        </EmbeddedActionButton>{" "}
        in the Swap tab: a one-time conversion, 2 to 10 min or longer. Trades paid in USDG need no conversion.
      </Trans>
    );
  } else if (isTooLarge && maxInstantAmount !== undefined) {
    tooLargeAlert = (
      <>
        <Trans>Nothing can be converted instantly right now. Trades paid in USDG need no conversion.</Trans>
        {paxosHint}
      </>
    );
  }

  if (tooLargeAlert !== undefined && oneClickTradingHint !== null) {
    tooLargeAlert = (
      <>
        {tooLargeAlert}
        {oneClickTradingHint}
      </>
    );
  }

  return {
    tooLargeAlert,
  };
}
