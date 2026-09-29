import { t, Trans } from "@lingui/macro";
import cx from "classnames";

import { GMX_PARTNER_TELEGRAM_URL } from "config/links";
import { formatUsd } from "lib/numbers";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import ExternalLink from "components/ExternalLink/ExternalLink";
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
    shouldShowWhitelistNote,
    thresholdUsd,
  } = transitState;
  const route: ConversionRoute = isTransitRoute ? "transit" : "pool";
  const routeLabel = getRoutePreferenceLabel(route);
  const preference = isRouteSelectable ? conversionRoutePreference : "auto";
  const minAmount = formatUsd(thresholdUsd, { displayDecimals: 0 });

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
                  Direct with Paxos converts with Paxos, the issuer of USDG, in a separate transaction that settles in a
                  few minutes. The converted tokens land in your wallet first.
                  <br />
                  <br />
                  Auto picks the cheaper option. Whitelisted addresses can choose either option and convert USDC to USDG
                  with no Paxos fee. Other addresses always use Auto, and Direct with Paxos is only offered from{" "}
                  {minAmount}.
                  <br />
                  <br />
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
                  onSelect={setConversionRoutePreference}
                />
              ))}
            </div>
          </SelectorBase>
        }
      />

      {shouldShowWhitelistNote && (
        <AlertInfoCard type="info" hideClose>
          <Trans>
            Whitelisted addresses convert USDC to USDG at 0 bps. To get whitelisted, message{" "}
            <ExternalLink href={GMX_PARTNER_TELEGRAM_URL}>@GMXPartners</ExternalLink> on Telegram and mention "USDG
            whitelist".
          </Trans>
        </AlertInfoCard>
      )}
    </>
  );
}

function RoutePreferenceOption({
  option,
  isSelected,
  isDisabled,
  onSelect,
}: {
  option: ConversionRoutePreference;
  isSelected: boolean;
  isDisabled: boolean;
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
      <span className="text-body-small text-typography-secondary">{getRoutePreferenceDescription(option)}</span>
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

function getRoutePreferenceDescription(preference: ConversionRoutePreference): string {
  switch (preference) {
    case "auto":
      return t`Cheaper option for your amount`;
    case "pool":
      return t`GMX USDC/USDG pool, same transaction`;
    case "transit":
      return t`USDG issuer, separate transaction, a few minutes. Zero fee for whitelisted addresses.`;
  }
}
