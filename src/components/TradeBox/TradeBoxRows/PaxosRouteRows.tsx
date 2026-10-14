import { t, Trans } from "@lingui/macro";
import cx from "classnames";

import { GMX_PARTNER_TELEGRAM_URL } from "config/links";
import { selectTradeboxSwapAmounts } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getExternalSwapAggregatorLabel } from "domain/synthetics/externalSwaps/utils";
import type {
  TradeboxSwapRoute,
  TradeboxSwapRouteOption,
  TradeboxSwapRoutePreference,
} from "domain/synthetics/paxosTransit/tradeboxRoutes";
import type { TokenData } from "domain/synthetics/tokens";
import { formatAmountFree, formatBalanceAmount, formatUsd } from "lib/numbers";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import { EmbeddedActionButton } from "components/Button/EmbeddedActionButton";
import ExternalLink from "components/ExternalLink/ExternalLink";
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

  const activeLabel = routes.activeRoute
    ? getRouteLabel(routes.activeRoute, instantLabel)
    : routes.isRouteChoiceRequired
      ? t`Choose a route`
      : t`Loading…`;
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
  onSelect: (preference: TradeboxSwapRoutePreference) => void;
}) {
  const close = useSelectorClose();

  return (
    <div
      className={cx("flex cursor-pointer flex-col px-12 py-6 hover:bg-fill-surfaceHover", {
        "bg-slate-700": isSelected,
      })}
      onClick={() => {
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
          feeAmount === undefined
            ? "..."
            : formatBalanceAmount(feeAmount, fromToken.decimals, fromToken.symbol, { isStable: true, showZero: true })
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
    isWhitelisted,
    isPayAmountHintShown,
    isSmartWallet,
    isZeroFeeCapacityShort,
    zeroFeeCapacity,
    zeroFeeCapacityShortBy,
    onReduceToZeroFeeCapacity,
    onUsePayAmount,
  } = paxosRoute;
  const isStandardOfferedToNonWhitelisted =
    !isWhitelisted && routes.options.some((option) => option.route === "paxosStandard");

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

      {isZeroFeeCapacityShort && routes.isPaxosOffered && (
        <AlertInfoCard type="warning" hideClose>
          <div className="flex flex-col gap-6">
            <span>
              {zeroFeeCapacity === undefined ? (
                <Trans>
                  Zero-fee capacity dropped below your amount a moment ago. The new capacity shows here within a minute.
                </Trans>
              ) : (
                <Trans>
                  Not enough zero-fee capacity for this amount. Capacity left now:{" "}
                  {formatBalanceAmount(zeroFeeCapacity, toToken.decimals, toToken.symbol, { isStable: true })}. Your
                  amount is{" "}
                  {formatBalanceAmount(zeroFeeCapacityShortBy ?? 0n, fromToken.decimals, fromToken.symbol, {
                    isStable: true,
                  })}{" "}
                  over.
                </Trans>
              )}
            </span>
            {zeroFeeCapacity !== undefined && zeroFeeCapacity > 0n && (
              <EmbeddedActionButton onClick={onReduceToZeroFeeCapacity}>
                <Trans>
                  Convert{" "}
                  {formatBalanceAmount(zeroFeeCapacity, fromToken.decimals, fromToken.symbol, { isStable: true })} with
                  no fee
                </Trans>
              </EmbeddedActionButton>
            )}
            <span>
              {routes.isRouteChoiceRequired ? (
                <Trans>
                  Or pick Paxos standard with a fee or an instant route in Route. No route is picked for you.
                </Trans>
              ) : (
                <Trans>Or pick Paxos standard with a fee or an instant route in Route.</Trans>
              )}
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

      {activePaxosRoute && isSmartWallet && (
        <AlertInfoCard type="warning" hideClose>
          <Trans>
            The Paxos quote is valid for 15 minutes from when the conversion goes to your wallet for signing. The
            transaction must execute within that time, or it fails and needs a new quote.
          </Trans>
        </AlertInfoCard>
      )}

      {isStandardOfferedToNonWhitelisted && (
        <div className="text-body-small text-typography-secondary">
          <Trans>
            Large LP or balancer? Ask <ExternalLink href={GMX_PARTNER_TELEGRAM_URL}>@GMXPartners</ExternalLink> about
            zero-fee access.
          </Trans>
        </div>
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
    case "capacityShort":
      return t`Not enough zero-fee capacity`;
    case "quoteError":
      return t`Quote is unavailable`;
    case "belowMinOrderSize": {
      const state = paxosRoute.paxosRouteStates[option.route as Exclude<TradeboxSwapRoute, "instant">];
      const minOrderSize = state.status === "belowMinOrderSize" ? state.minOrderSize : 0n;

      return t`Minimum ${formatAmountFree(minOrderSize, fromToken.decimals)} ${fromToken.symbol}`;
    }
  }

  const fee = formatBalanceAmount(option.feeAmount ?? 0n, fromToken.decimals, fromToken.symbol, { isStable: true });

  switch (option.route) {
    case "paxosZeroFee":
      return option.feeAmount ? t`Paxos fee ${fee} · ~2–10 min, separate step` : t`No fee · ~2–10 min, separate step`;
    case "paxosStandard":
      return t`Paxos fee ${fee} · ~2–10 min, can be longer`;
    case "instant":
      return t`Instant`;
  }
}
