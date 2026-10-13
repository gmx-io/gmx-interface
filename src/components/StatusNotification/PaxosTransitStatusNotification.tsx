import { t, Trans } from "@lingui/macro";
import { useHistory } from "react-router-dom";

import { getPaxosTransitConfig } from "config/paxosTransit";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { getGlvDisplayName, getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { Mode, type GlvOrMarketInfo } from "domain/synthetics/markets/types";
import { getIsTransitOrderFinal } from "domain/synthetics/paxosTransit/transitOrders";
import type { TransitRouteProgress } from "domain/synthetics/paxosTransit/transitRouteProgress";
import { formatBalanceAmount } from "lib/numbers";
import { getToken } from "sdk/configs/tokens";
import { bigMath } from "sdk/utils/bigmath";
import type { TransitOrder } from "sdk/utils/paxos/types";
import type { Token } from "sdk/utils/tokens/types";

import { ColorfulButtonLink } from "components/ColorfulBanner/ColorfulBanner";
import { TransactionStatus, TransactionStatusType } from "components/TransactionStatus/TransactionStatus";

import { PoolName } from "./GmStatusNotification";
import { StatusNotification } from "./StatusNotification";
import { useToastAutoClose } from "./useToastAutoClose";

const LONG_CONVERSION_MS = 15 * 60 * 1000;

export function PaxosTransitStatusNotification({
  toastTimestamp,
  glvOrMarketInfo,
}: {
  toastTimestamp: number;
  glvOrMarketInfo: GlvOrMarketInfo | undefined;
}) {
  const { transitRouteProgress } = useSyntheticsEvents();

  if (transitRouteProgress?.id !== toastTimestamp) {
    return null;
  }

  if (transitRouteProgress.glvOrMarketAddress === undefined) {
    return <TransitConversionProgressContent progress={transitRouteProgress} />;
  }

  if (!glvOrMarketInfo) {
    return null;
  }

  return <TransitRouteProgressContent progress={transitRouteProgress} glvOrMarketInfo={glvOrMarketInfo} />;
}

function TransitConversionProgressContent({ progress }: { progress: TransitRouteProgress }) {
  const { paxosTransitOrder, isPaxosTransitOrderStatusUnknown } = useSyntheticsEvents();
  const { conversion } = progress;
  const order = conversion ? paxosTransitOrder : undefined;

  const paxosTransitConfig = getPaxosTransitConfig(progress.chainId);
  const usdc = paxosTransitConfig ? getToken(progress.chainId, paxosTransitConfig.usdcAddress) : undefined;
  const usdg = paxosTransitConfig ? getToken(progress.chainId, paxosTransitConfig.usdgAddress) : undefined;
  const [tokenIn, tokenOut] = progress.direction === "usdcToUsdg" ? [usdc, usdg] : [usdg, usdc];

  useToastAutoClose(getIsTransitOrderFinal(order), progress.id);

  const offerAmount =
    conversion && tokenIn
      ? formatBalanceAmount(conversion.offerAmount, tokenIn.decimals, tokenIn.symbol, { isStable: true })
      : undefined;
  const isTakingLong = !getIsTransitOrderFinal(order) && Date.now() - progress.id > LONG_CONVERSION_MS;

  return (
    <StatusNotification title={<Trans>Converting {offerAmount} to {tokenOut?.symbol}</Trans>}>
      <div className="flex flex-col gap-8">
        <TransactionStatus status="success" txnHash={conversion?.txnHash} text={t`Conversion request sent`} />
        <TransactionStatus
          status={getConversionStatus(order)}
          text={getSwapConversionText({ order, isPaxosTransitOrderStatusUnknown, tokenOut })}
        />
        {isTakingLong && (
          <div className="text-body-small text-typography-secondary">
            <Trans>Taking longer than usual. Standard-fee conversions can take up to an hour and arrive in parts.</Trans>
          </div>
        )}
      </div>
    </StatusNotification>
  );
}

function getSwapConversionText(p: {
  order: TransitOrder | undefined;
  isPaxosTransitOrderStatusUnknown: boolean;
  tokenOut: Token | undefined;
}): React.ReactNode {
  const { order, isPaxosTransitOrderStatusUnknown, tokenOut } = p;

  if (order?.status === "PROCESSED" && tokenOut) {
    return t`${formatBalanceAmount(order.amountDue, tokenOut.decimals, tokenOut.symbol, { isStable: true })} received`;
  }

  const deliveredAmount = order ? bigMath.max(order.amountDue - order.remainingAmountDue, 0n) : 0n;

  if (order?.status === "PROCESSING" && deliveredAmount > 0n && tokenOut) {
    const delivered = formatBalanceAmount(deliveredAmount, tokenOut.decimals, undefined, { isStable: true });
    const due = formatBalanceAmount(order.amountDue, tokenOut.decimals, tokenOut.symbol, { isStable: true });

    return t`Receiving ${tokenOut.symbol}: ${delivered} of ${due}`;
  }

  return getConversionText({ order, isPaxosTransitOrderStatusUnknown, tokenOutSymbol: tokenOut?.symbol });
}

function TransitRouteProgressContent({
  progress,
  glvOrMarketInfo,
}: {
  progress: TransitRouteProgress;
  glvOrMarketInfo: GlvOrMarketInfo;
}) {
  const history = useHistory();
  const {
    withdrawalStatuses,
    depositStatuses,
    paxosTransitOrder,
    isPaxosTransitOrderStatusUnknown,
    setTransitRouteContinueRequested,
  } = useSyntheticsEvents();
  const { conversion, withdrawalExecutedTxnHash } = progress;
  const order = conversion ? paxosTransitOrder : undefined;

  const withdrawalStatus = progress.withdrawalTxnHash
    ? Object.values(withdrawalStatuses).find((status) => status.createdTxnHash === progress.withdrawalTxnHash)
    : undefined;
  const depositStatus = progress.depositTxnHash
    ? Object.values(depositStatuses).find((status) => status.createdTxnHash === progress.depositTxnHash)
    : undefined;

  const paxosTransitConfig = getPaxosTransitConfig(progress.chainId);
  const usdc = paxosTransitConfig ? getToken(progress.chainId, paxosTransitConfig.usdcAddress) : undefined;
  const usdg = paxosTransitConfig ? getToken(progress.chainId, paxosTransitConfig.usdgAddress) : undefined;
  const isBuy = progress.direction === "usdcToUsdg";
  const [tokenIn, tokenOut] = isBuy ? [usdc, usdg] : [usdg, usdc];

  const isConverted = order?.status === "PROCESSED";
  const isConversionRemoved = order?.status === "REMOVED";
  const isWithdrawalExecuted = progress.withdrawalTxnHash === undefined || withdrawalExecutedTxnHash !== undefined;
  const isWithdrawalCancelled = Boolean(withdrawalStatus?.cancelledTxnHash);

  const isCompleted = isBuy
    ? Boolean(depositStatus?.executedTxnHash || depositStatus?.cancelledTxnHash) || isConversionRemoved
    : isConverted || isConversionRemoved || isWithdrawalCancelled;

  useToastAutoClose(isCompleted, progress.id);

  const requestContinue = () => {
    setTransitRouteContinueRequested(progress.id, true);

    history.push(`/pools/details?market=${progress.glvOrMarketAddress}&mode=${Mode.Single}`);
  };

  const conversionRows = conversion ? (
    <>
      <TransactionStatus status="success" txnHash={conversion.txnHash} text={t`Conversion request sent`} />
      <TransactionStatus
        status={getConversionStatus(order)}
        text={getConversionText({ order, isPaxosTransitOrderStatusUnknown, tokenOutSymbol: tokenOut?.symbol })}
      />
    </>
  ) : undefined;

  const glvDisplayName = isGlvInfo(glvOrMarketInfo) ? getGlvDisplayName(glvOrMarketInfo) : undefined;
  const poolTokenSymbol = glvDisplayName ? "GLV" : "GM";
  const indexName = glvDisplayName ? undefined : getMarketIndexName(glvOrMarketInfo);
  const poolName = getMarketPoolName(glvOrMarketInfo);
  const offerAmount =
    conversion && tokenIn ? formatBalanceAmount(conversion.offerAmount, tokenIn.decimals, tokenIn.symbol) : undefined;

  const title = isBuy ? (
    <Trans>
      <div className="inline-flex">
        Buying {glvDisplayName ?? "GM:"}
        {indexName ? <span>&nbsp;{indexName}</span> : null}
        <PoolName>{poolName}</PoolName>
      </div>{" "}
      <span>with {offerAmount}</span>
    </Trans>
  ) : (
    <Trans>
      <div className="inline-flex">
        Selling {glvDisplayName ?? "GM"}
        {indexName && <span>:&nbsp;{indexName}</span>}
        <PoolName>{poolName}</PoolName>
      </div>
    </Trans>
  );

  return (
    <StatusNotification title={title}>
      <div className="flex flex-col gap-8">
        {isBuy ? (
          <>
            <StepLabel>
              <Trans>Step 1: Convert</Trans>
            </StepLabel>
            {conversionRows}
            <StepLabel>
              <Trans>Step 2: Buy</Trans>
            </StepLabel>
            {progress.depositTxnHash ? (
              <>
                <TransactionStatus status="success" txnHash={progress.depositTxnHash} text={t`Buy request sent`} />
                <TransactionStatus
                  status={getRequestStatus(depositStatus?.executedTxnHash, depositStatus?.cancelledTxnHash)}
                  txnHash={depositStatus?.executedTxnHash ?? depositStatus?.cancelledTxnHash}
                  text={getRequestText({
                    executed: t`Buy order executed`,
                    cancelled: t`Buy order cancelled`,
                    pending: t`Fulfilling buy request...`,
                    executedTxnHash: depositStatus?.executedTxnHash,
                    cancelledTxnHash: depositStatus?.cancelledTxnHash,
                  })}
                />
              </>
            ) : isConverted ? (
              <ColorfulButtonLink color="blue" onClick={requestContinue}>
                <Trans>Continue to buy</Trans>
              </ColorfulButtonLink>
            ) : (
              <TransactionStatus status="muted" text={t`Buy ${poolTokenSymbol}`} />
            )}
          </>
        ) : (
          <>
            <StepLabel>
              <Trans>Step 1: Sell</Trans>
            </StepLabel>
            {progress.withdrawalTxnHash ? (
              <>
                <TransactionStatus status="success" txnHash={progress.withdrawalTxnHash} text={t`Sell request sent`} />
                <TransactionStatus
                  status={getRequestStatus(withdrawalExecutedTxnHash, withdrawalStatus?.cancelledTxnHash)}
                  txnHash={withdrawalExecutedTxnHash ?? withdrawalStatus?.cancelledTxnHash}
                  text={getRequestText({
                    executed: t`${usdg?.symbol} received`,
                    cancelled: t`Sell order cancelled`,
                    pending: t`Fulfilling sell request...`,
                    executedTxnHash: withdrawalExecutedTxnHash,
                    cancelledTxnHash: withdrawalStatus?.cancelledTxnHash,
                  })}
                />
              </>
            ) : (
              <TransactionStatus status="success" text={t`${usdg?.symbol} received`} />
            )}
            <StepLabel>
              <Trans>Step 2: Convert</Trans>
            </StepLabel>
            {conversionRows ??
              (isWithdrawalExecuted ? (
                <ColorfulButtonLink color="blue" onClick={requestContinue}>
                  <Trans>Continue to convert</Trans>
                </ColorfulButtonLink>
              ) : (
                <TransactionStatus status="muted" text={t`Convert to ${usdc?.symbol}`} />
              ))}
          </>
        )}
      </div>
    </StatusNotification>
  );
}

function StepLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-body-small text-typography-secondary">{children}</div>;
}

function getConversionStatus(order: TransitOrder | undefined): TransactionStatusType {
  if (order?.status === "PROCESSED") return "success";
  if (order?.status === "REMOVED") return "error";
  return "loading";
}

function getConversionText(p: {
  order: TransitOrder | undefined;
  isPaxosTransitOrderStatusUnknown: boolean;
  tokenOutSymbol: string | undefined;
}): React.ReactNode {
  const { order, isPaxosTransitOrderStatusUnknown, tokenOutSymbol } = p;

  if (order?.status === "PROCESSED") return t`${tokenOutSymbol} received`;
  if (order?.status === "REMOVED") return t`Conversion cancelled`;
  if (isPaxosTransitOrderStatusUnknown) {
    return <span className="text-yellow-300">{t`Conversion status unavailable`}</span>;
  }

  return t`Converting with Paxos, usually 2–10 min...`;
}

function getRequestStatus(
  executedTxnHash: string | undefined,
  cancelledTxnHash: string | undefined
): TransactionStatusType {
  if (executedTxnHash) return "success";
  if (cancelledTxnHash) return "error";
  return "loading";
}

function getRequestText(p: {
  executed: string;
  cancelled: string;
  pending: string;
  executedTxnHash: string | undefined;
  cancelledTxnHash: string | undefined;
}): string {
  if (p.executedTxnHash) return p.executed;
  if (p.cancelledTxnHash) return p.cancelled;
  return p.pending;
}
