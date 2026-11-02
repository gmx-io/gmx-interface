import { t, Trans } from "@lingui/macro";
import cx from "classnames";

import { formatDateTime } from "lib/dates";
import { formatUsd } from "lib/numbers";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import { TransitApprovalProposalAlert } from "components/PaxosTransit/TransitApprovalProposalAlert";
import { SelectorBase, useSelectorClose } from "components/SelectorBase/SelectorBase";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import type { ConversionRoute, ConversionRoutePreference } from "./types";
import type { PaxosTransitState } from "./usePaxosTransitState";

const ROUTE_PREFERENCES: ConversionRoutePreference[] = ["auto", "pool", "transit"];

export function ConversionRouteSelector({ transitState }: { transitState: PaxosTransitState }) {
  const {
    isTransitRoute,
    isRouteSelectable,
    conversionRoutePreference,
    setConversionRoutePreference,
    isApprovalProposalPending,
    onProposeNewApproval,
    thresholdUsd,
    isWhitelisted,
    isZeroFee,
    isZeroFeePaused,
    zeroFeeExpectedReopenAt,
  } = transitState;
  const route: ConversionRoute = isTransitRoute ? "transit" : "pool";
  const routeLabel = getRoutePreferenceLabel(route);
  const preference = isRouteSelectable ? conversionRoutePreference : "auto";
  const minAmount = formatUsd(thresholdUsd, { displayDecimals: 0 });
  const reopenTime = zeroFeeExpectedReopenAt !== undefined ? formatDateTime(zeroFeeExpectedReopenAt) : undefined;

  return (
    <>
      <SyntheticsInfoRow
        label={
          <TooltipWithPortal
            handle={t`Conversion`}
            position="left-start"
            variant="iconStroke"
            content={
              <div className="text-typography-primary">
                <Trans>
                  This pool holds USDG, so USDC is converted to USDG when you buy and back to USDC when you sell.
                  <br />
                  <br />
                  Instant swap goes through the GMX USDC/USDG pool within your buy or sell, in one transaction. You pay
                  its swap fee and price impact.
                  <br />
                  <br />
                  Direct with Paxos converts with Paxos, the issuer of USDG, in a separate transaction that usually
                  settles in 2–10 min. The converted tokens land in your wallet first.
                </Trans>
                <br />
                <br />
                {isWhitelisted ? (
                  <Trans>Auto picks the cheaper option. You can choose either option.</Trans>
                ) : (
                  <Trans>Auto picks the cheaper option. Direct with Paxos is only offered from {minAmount}.</Trans>
                )}
                <br />
                <br />
                <Trans>
                  The choice is fixed when only one option can handle the amount or a conversion is in progress.
                </Trans>
              </div>
            }
          />
        }
        value={
          <SelectorBase
            modalLabel={t`Conversion`}
            desktopPanelClassName="w-[300px]"
            wrapperClassName="text-typography-primary"
            label={preference === "auto" ? t`Auto · ${routeLabel}` : routeLabel}
            qa="conversion-route"
          >
            <div className="flex flex-col py-6">
              {ROUTE_PREFERENCES.map((option) => (
                <RoutePreferenceOption
                  key={option}
                  option={option}
                  isSelected={option === preference}
                  isDisabled={!isRouteSelectable && option !== "auto"}
                  isZeroFee={isZeroFee}
                  onSelect={setConversionRoutePreference}
                />
              ))}
            </div>
          </SelectorBase>
        }
      />

      {isZeroFeePaused && (
        <AlertInfoCard type="info" hideClose>
          {reopenTime ? (
            <Trans>Zero-fee conversion is paused until {reopenTime}.</Trans>
          ) : (
            <Trans>Zero-fee conversion is paused.</Trans>
          )}
        </AlertInfoCard>
      )}

      {isApprovalProposalPending && <TransitApprovalProposalAlert onProposeNewApproval={onProposeNewApproval} />}
    </>
  );
}

function RoutePreferenceOption({
  option,
  isSelected,
  isDisabled,
  isZeroFee,
  onSelect,
}: {
  option: ConversionRoutePreference;
  isSelected: boolean;
  isDisabled: boolean;
  isZeroFee: boolean;
  onSelect: (option: ConversionRoutePreference) => void;
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
        onSelect(option);
        close();
      }}
    >
      <span className="text-14">{getRoutePreferenceLabel(option)}</span>
      <span className="text-body-small text-typography-secondary">
        {getRoutePreferenceDescription(option, isZeroFee)}
      </span>
    </div>
  );
}

function getRoutePreferenceLabel(preference: ConversionRoutePreference): string {
  switch (preference) {
    case "auto":
      return t`Auto`;
    case "pool":
      return t`Instant swap`;
    case "transit":
      return t`Direct with Paxos`;
  }
}

function getRoutePreferenceDescription(preference: ConversionRoutePreference, isZeroFee: boolean): string {
  switch (preference) {
    case "auto":
      return t`Cheaper option for your amount`;
    case "pool":
      return t`GMX USDC/USDG pool, same transaction`;
    case "transit":
      return isZeroFee
        ? t`USDG issuer, separate transaction, usually 2–10 min. No Paxos fee.`
        : t`USDG issuer, separate transaction, usually 2–10 min`;
  }
}
