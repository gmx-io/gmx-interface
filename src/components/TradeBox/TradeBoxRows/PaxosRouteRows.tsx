import { t, Trans } from "@lingui/macro";
import cx from "classnames";

import { selectTradeboxSwapAmounts } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getExternalSwapAggregatorLabel } from "domain/synthetics/externalSwaps/utils";
import {
  formatPaxosMinOrderSize,
  type TradeboxSwapRoute,
  type TradeboxSwapRouteOption,
  type TradeboxSwapRoutePreference,
} from "domain/synthetics/paxosTransit/tradeboxRoutes";
import type { TokenData } from "domain/synthetics/tokens";
import { formatDateTime } from "lib/dates";
import { formatBalanceAmount, formatUsd } from "lib/numbers";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import { EmbeddedActionButton } from "components/Button/EmbeddedActionButton";
import { TransitApprovalProposalAlert } from "components/PaxosTransit/TransitApprovalProposalAlert";
import { SelectorBase, useSelectorClose } from "components/SelectorBase/SelectorBase";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import type { TradeboxPaxosRoute } from "../hooks/useTradeboxPaxosRoute";

export function PaxosRouteSelectorRow({
  paxosRoute,
  fromToken,
  toToken,
}: {
  paxosRoute: TradeboxPaxosRoute;
  fromToken: TokenData;
  toToken: TokenData;
}) {
  const instantLabel = useInstantRouteLabel();
  const { routes, preference, setPreference } = paxosRoute;
  const minSaving = formatUsd(paxosRoute.minSavingUsd, { displayDecimals: 0 });
  const bestAmountOut = routes.options.reduce<bigint | undefined>(
    (best, option) =>
      option.amountOut !== undefined && (best === undefined || option.amountOut > best) ? option.amountOut : best,
    undefined
  );

  const activeLabel = routes.activeRoute ? getRouteLabel(routes.activeRoute, instantLabel) : t`Loading…`;
  const selectedLabel = preference === "auto" ? t`Auto · ${activeLabel}` : activeLabel;

  return (
    <SyntheticsInfoRow
      label={
        <TooltipWithPortal
          handle={t`Route`}
          position="left-start"
          variant="iconStroke"
          content={
            <div className="text-typography-primary">
              <Trans>
                Auto picks the best return after all fees, or the instant route when Paxos saves less than {minSaving}.
                Paxos converts {fromToken.symbol} to {toToken.symbol} in a separate transaction, and {toToken.symbol}{" "}
                arrives in your wallet in a separate step, usually within 2–10 minutes. GMX pool and external routes are
                instant.
              </Trans>
            </div>
          }
        />
      }
      value={
        <SelectorBase
          modalLabel={t`Route`}
          desktopPanelClassName="w-[320px]"
          wrapperClassName="text-typography-primary"
          label={selectedLabel}
          qa="swap-route"
        >
          <div className="flex flex-col py-6">
            <RouteOptionItem
              preference="auto"
              label={t`Auto`}
              description={t`Best return after fees, or instant when Paxos saves less than ${minSaving}`}
              isSelected={preference === "auto"}
              onSelect={setPreference}
            />
            {routes.options.map((option) => (
              <RouteOptionItem
                key={option.route}
                preference={option.route}
                label={getRouteLabel(option.route, instantLabel)}
                description={getRouteDescription({ option, fromToken, paxosRoute })}
                amountOut={option.amountOut}
                isBestReturn={option.amountOut !== undefined && option.amountOut === bestAmountOut}
                isFastest={option.route === "instant" && option.amountOut !== undefined}
                toToken={toToken}
                isSelected={preference === option.route}
                isDisabled={option.unavailableReason === "paused"}
                onSelect={setPreference}
              />
            ))}
          </div>
        </SelectorBase>
      }
    />
  );
}

function RouteOptionItem({
  preference,
  label,
  description,
  amountOut,
  isBestReturn,
  isFastest,
  toToken,
  isSelected,
  isDisabled,
  onSelect,
}: {
  preference: TradeboxSwapRoutePreference;
  label: string;
  description: string;
  amountOut?: bigint;
  isBestReturn?: boolean;
  isFastest?: boolean;
  toToken?: TokenData;
  isSelected: boolean;
  isDisabled?: boolean;
  onSelect: (preference: TradeboxSwapRoutePreference) => void;
}) {
  const close = useSelectorClose();

  return (
    <div
      className={cx("flex flex-col px-12 py-6", {
        "bg-slate-700": isSelected,
        "cursor-pointer hover:bg-fill-surfaceHover": !isDisabled,
        "cursor-not-allowed opacity-50": isDisabled,
      })}
      onClick={() => {
        if (isDisabled) return;
        onSelect(preference);
        close();
      }}
      data-qa={`swap-route-${preference}`}
    >
      <div className="flex items-baseline justify-between gap-8">
        <span className="text-14">{label}</span>
        {amountOut !== undefined && toToken && (
          <span className="text-14 numbers">
            {formatBalanceAmount(amountOut, toToken.decimals, undefined, { isStable: true })}
          </span>
        )}
      </div>
      <div className="flex items-baseline justify-between gap-8">
        <span className="text-body-small text-typography-secondary">{description}</span>
        {(isBestReturn || isFastest) && (
          <span className="text-body-small flex shrink-0 gap-6">
            {isBestReturn && (
              <span className="text-green-500">
                <Trans>Best return</Trans>
              </span>
            )}
            {isFastest && (
              <span className="text-blue-300">
                <Trans>Fastest</Trans>
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}

export function PaxosPendingLabel({ amount, token }: { amount: bigint; token: TokenData }) {
  return (
    <TooltipWithPortal
      className="ml-4"
      handleClassName="text-typography-secondary"
      handle={<Trans>· {formatBalanceAmount(amount, token.decimals, undefined, { isStable: true })} pending</Trans>}
      content={
        <Trans>
          {token.symbol} on its way from Paxos. It arrives in your wallet in a separate step, sometimes in parts.
        </Trans>
      }
    />
  );
}

export function PaxosRouteDetailsRows({
  paxosRoute,
  fromToken,
  toToken,
}: {
  paxosRoute: TradeboxPaxosRoute;
  fromToken: TokenData;
  toToken: TokenData;
}) {
  const instantLabel = useInstantRouteLabel();
  const { activePaxosRoute, activeOption, instantAmountOut, zeroFeeAvailableCapacity } = paxosRoute;

  if (!activePaxosRoute) {
    return null;
  }

  const feeAmount = activeOption?.feeAmount;
  const amountOut = activeOption?.amountOut;
  const saving = amountOut !== undefined && instantAmountOut !== undefined ? amountOut - instantAmountOut : undefined;

  return (
    <>
      <SyntheticsInfoRow
        label={t`Paxos fee`}
        valueClassName={cx("numbers", { "text-green-500": feeAmount === 0n })}
        value={
          feeAmount !== undefined
            ? formatBalanceAmount(feeAmount, fromToken.decimals, fromToken.symbol, { isStable: true, showZero: true })
            : activeOption?.unavailableReason === "loading"
              ? "..."
              : "-"
        }
      />
      <SyntheticsInfoRow
        label={t`Arrives`}
        value={
          activePaxosRoute === "paxosZeroFee"
            ? t`~2–10 min, separate step`
            : t`~2–10 min or longer, may arrive in parts`
        }
      />
      {instantAmountOut !== undefined && (
        <SyntheticsInfoRow
          label={t`Instant via ${instantLabel}`}
          valueClassName="numbers text-typography-secondary"
          value={formatBalanceAmount(instantAmountOut, toToken.decimals, toToken.symbol, { isStable: true })}
        />
      )}
      {saving !== undefined && saving > 0n && (
        <SyntheticsInfoRow
          label={t`You save vs instant`}
          valueClassName="numbers text-green-500"
          value={`+${formatBalanceAmount(saving, toToken.decimals, toToken.symbol, { isStable: true })}`}
        />
      )}
      {activePaxosRoute === "paxosZeroFee" && zeroFeeAvailableCapacity !== undefined && (
        <SyntheticsInfoRow
          label={t`Zero-fee capacity left`}
          valueClassName="numbers"
          value={formatBalanceAmount(zeroFeeAvailableCapacity, toToken.decimals, toToken.symbol, { isStable: true })}
        />
      )}
    </>
  );
}

export function PaxosRouteAlerts({
  paxosRoute,
  fromToken,
  toToken,
}: {
  paxosRoute: TradeboxPaxosRoute;
  fromToken: TokenData;
  toToken: TokenData;
}) {
  const {
    routes,
    activePaxosRoute,
    isPayAmountHintShown,
    isSmartWallet,
    zeroFeeCapacity,
    zeroFeeCapacityShortBy,
    onReduceToZeroFeeCapacity,
    onUsePayAmount,
    isApprovalProposalPending,
    onProposeNewApproval,
  } = paxosRoute;

  return (
    <>
      {isPayAmountHintShown && (
        <AlertInfoCard type="info" hideClose>
          <Trans>Paxos routes are quoted from the Pay amount.</Trans>{" "}
          <EmbeddedActionButton onClick={onUsePayAmount}>
            <Trans>Use the Pay amount</Trans>
          </EmbeddedActionButton>
        </AlertInfoCard>
      )}

      {zeroFeeCapacity !== undefined && routes.isPaxosOffered && (
        <AlertInfoCard type="warning" hideClose>
          <div className="flex flex-col gap-6 [overflow-wrap:anywhere]">
            <span>
              <Trans>
                Not enough zero-fee capacity for this amount. Capacity left now:{" "}
                {formatBalanceAmount(zeroFeeCapacity, toToken.decimals, toToken.symbol, { isStable: true })}. Your
                amount is{" "}
                {formatBalanceAmount(zeroFeeCapacityShortBy ?? 0n, fromToken.decimals, fromToken.symbol, {
                  isStable: true,
                })}{" "}
                over.
              </Trans>
            </span>
            {zeroFeeCapacity > 0n && (
              <EmbeddedActionButton onClick={onReduceToZeroFeeCapacity}>
                <Trans>
                  Convert{" "}
                  {formatBalanceAmount(zeroFeeCapacity, fromToken.decimals, fromToken.symbol, { isStable: true })} with
                  no fee
                </Trans>
              </EmbeddedActionButton>
            )}
            <span>
              <Trans>Or pick Paxos standard with a fee or an instant route in Route.</Trans>
            </span>
          </div>
        </AlertInfoCard>
      )}

      {activePaxosRoute && (
        <AlertInfoCard type="info" hideClose>
          {activePaxosRoute === "paxosZeroFee" ? (
            <Trans>
              Paxos sends {toToken.symbol} to your wallet in a separate step, usually within 2–10 minutes. Large orders
              can arrive in parts.
            </Trans>
          ) : (
            <Trans>
              Paxos sends {toToken.symbol} to your wallet in a separate step. Standard-fee orders are filled from Paxos
              inventory, so they can take longer and arrive in parts. For instant delivery, pick another route.
            </Trans>
          )}
        </AlertInfoCard>
      )}

      {isApprovalProposalPending && <TransitApprovalProposalAlert onProposeNewApproval={onProposeNewApproval} />}

      {activePaxosRoute && isSmartWallet && (
        <AlertInfoCard type="warning" hideClose>
          <Trans>
            The Paxos quote is valid for 15 minutes from when the conversion goes to your wallet for signing. The
            transaction must execute within that time, or it fails and needs a new quote.
          </Trans>
        </AlertInfoCard>
      )}
    </>
  );
}

function useInstantRouteLabel() {
  const swapStrategy = useSelector(selectTradeboxSwapAmounts)?.swapStrategy;

  return swapStrategy?.type === "externalSwap"
    ? t`${getExternalSwapAggregatorLabel(swapStrategy.externalSwapQuote.aggregator)} (external)`
    : t`GMX pool`;
}

function getRouteLabel(route: TradeboxSwapRoute, instantLabel: string): string {
  switch (route) {
    case "paxosZeroFee":
      return t`Paxos zero-fee`;
    case "paxosStandard":
      return t`Paxos standard`;
    case "instant":
      return instantLabel;
  }
}

function getRouteDescription({
  option,
  fromToken,
  paxosRoute,
}: {
  option: TradeboxSwapRouteOption;
  fromToken: TokenData;
  paxosRoute: TradeboxPaxosRoute;
}): string {
  switch (option.unavailableReason) {
    case "loading":
      return t`Loading quote…`;
    case "noRoute":
      return t`No instant route for this amount`;
    case "paused": {
      const state = paxosRoute.paxosRouteStates.paxosZeroFee;
      const expectedReopenAt = state.status === "paused" ? state.expectedReopenAt : undefined;

      if (expectedReopenAt === undefined) {
        return t`Paused for now`;
      }

      const reopenTime = formatDateTime(expectedReopenAt);

      return t`Paused until ${reopenTime}`;
    }
    case "capacityShort":
      return t`Not enough zero-fee capacity`;
    case "quoteError":
      return t`Quote is unavailable`;
    case "belowMinOrderSize": {
      const state = paxosRoute.paxosRouteStates[option.route as Exclude<TradeboxSwapRoute, "instant">];
      const minOrderSize = state.status === "belowMinOrderSize" ? state.minOrderSize : 0n;

      return t`Minimum ${formatPaxosMinOrderSize(minOrderSize, fromToken.decimals)} ${fromToken.symbol}`;
    }
  }

  const fee = formatBalanceAmount(option.feeAmount ?? 0n, fromToken.decimals, fromToken.symbol, { isStable: true });

  switch (option.route) {
    case "paxosZeroFee":
      return option.feeAmount !== undefined && option.feeAmount > 0n
        ? t`Paxos fee ${fee} · ~2–10 min, separate step`
        : t`No fee · ~2–10 min, separate step`;
    case "paxosStandard":
      return t`Paxos fee ${fee} · ~2–10 min, can be longer`;
    case "instant":
      return t`Instant`;
  }
}
