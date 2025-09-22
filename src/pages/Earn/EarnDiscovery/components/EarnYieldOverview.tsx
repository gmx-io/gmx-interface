import { Trans } from "@lingui/macro";
import cx from "classnames";
import uniq from "lodash/uniq";
import { ReactNode, useMemo } from "react";
import { FaChevronRight } from "react-icons/fa6";
import { Link } from "react-router-dom";

import { ARBITRUM, AVALANCHE, BOTANIX } from "config/chains";
import { getIcon } from "config/icons";
import type { MarketTokensAPRData } from "domain/synthetics/markets/types";
import { useGmMarketsApy } from "domain/synthetics/markets/useGmMarketsApy";
import { formatPercentage } from "lib/numbers";

import APRLabel from "components/APRLabel/APRLabel";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import glvIcon from "img/ic_glv_24.svg";
import gmIcon from "img/ic_gm_24.svg";
import gmxIcon from "img/ic_gmx_24.svg";

const PERIOD = "90d";

function calculateMaxApr(
  base?: MarketTokensAPRData,
  ...extra: (MarketTokensAPRData | undefined)[]
): bigint | undefined {
  const sources = [base, ...extra].filter(Boolean) as MarketTokensAPRData[];

  if (!sources.length) {
    return undefined;
  }

  const keys = uniq(sources.flatMap((item) => Object.keys(item)));
  let maxValue: bigint | undefined;

  for (const key of keys) {
    const total = sources.reduce((acc, item) => acc + (item[key] ?? 0n), 0n);

    if (maxValue === undefined || total > maxValue) {
      maxValue = total;
    }
  }

  return maxValue;
}

function formatAprValue(value?: bigint) {
  if (value === undefined) {
    return "...%";
  }

  return formatPercentage(value, { bps: false });
}

function YieldMetric({
  value,
  suffix,
  tooltip,
  disabled,
}: {
  value: ReactNode;
  suffix: string;
  tooltip?: ReactNode;
  disabled?: boolean;
}) {
  const metricNode = (
    <div className="flex items-center gap-6 text-13">
      <span className={cx("text-typography-primary", { "group-hover:text-blue-300": !disabled })}>{value}</span>
      {!disabled && <span className="uppercase text-typography-secondary">{suffix}</span>}
    </div>
  );

  if (!tooltip) {
    return metricNode;
  }

  return <TooltipWithPortal handle={metricNode} content={tooltip} position="top" />;
}

type YieldRowProps = {
  token: "GMX" | "GLV" | "GM";
  metric: ReactNode;
  to?: string;
  disabled?: boolean;
};

type NetworkYieldCardProps = {
  chainId: number;
  title: ReactNode;
  children: ReactNode;
};

const ASSET_ICONS: Record<YieldRowProps["token"], string> = {
  GMX: gmxIcon,
  GLV: glvIcon,
  GM: gmIcon,
};

function NetworkYieldCard({ chainId, title, children }: NetworkYieldCardProps) {
  return (
    <div className="flex flex-col gap-8 rounded-8 bg-slate-900 p-16">
      <div className="flex items-center justify-center gap-8 text-13 font-medium text-typography-primary">
        <img src={getIcon(chainId, "network")} alt="network" className="h-20 w-20" />
        {title}
      </div>

      <div className="flex flex-col">{children}</div>
    </div>
  );
}

function YieldRow({ token, metric, to, disabled }: YieldRowProps) {
  return (
    <Link
      to={to as string}
      className={cx(
        "group flex items-center justify-between gap-8 border-b-1/2 border-slate-600 px-12 py-8 last:border-b-0",
        {
          "cursor-default": disabled,
        }
      )}
    >
      <div className="flex items-center gap-8">
        <img className="size-20" src={ASSET_ICONS[token]} alt={token} />
        <span className="text-13 font-medium text-typography-primary">{token}</span>
      </div>

      <div className="flex items-center gap-8">
        {metric}
        {!disabled && (
          <FaChevronRight className={cx("text-typography-secondary", { "group-hover:text-blue-300": !disabled })} />
        )}
      </div>
    </Link>
  );
}

export function EarnYieldOverview() {
  const {
    glvApyInfoData: arbGlvApy,
    glvTokensIncentiveAprData: arbGlvIncentive,
    marketsTokensApyData: arbGmApy,
    marketsTokensIncentiveAprData: arbGmIncentive,
    marketsTokensLidoAprData: arbGmLido,
  } = useGmMarketsApy(ARBITRUM, undefined, { period: PERIOD });

  const {
    glvApyInfoData: avaxGlvApy,
    glvTokensIncentiveAprData: avaxGlvIncentive,
    marketsTokensApyData: avaxGmApy,
    marketsTokensIncentiveAprData: avaxGmIncentive,
    marketsTokensLidoAprData: avaxGmLido,
  } = useGmMarketsApy(AVALANCHE, undefined, { period: PERIOD });

  const {
    marketsTokensApyData: botanixGmApy,
    marketsTokensIncentiveAprData: botanixGmIncentive,
    marketsTokensLidoAprData: botanixGmLido,
  } = useGmMarketsApy(BOTANIX, undefined, { period: PERIOD });

  const arbMaxGlv = useMemo(() => calculateMaxApr(arbGlvApy, arbGlvIncentive), [arbGlvApy, arbGlvIncentive]);
  const arbMaxGm = useMemo(
    () => calculateMaxApr(arbGmApy, arbGmIncentive, arbGmLido),
    [arbGmApy, arbGmIncentive, arbGmLido]
  );

  const avaxMaxGlv = useMemo(() => calculateMaxApr(avaxGlvApy, avaxGlvIncentive), [avaxGlvApy, avaxGlvIncentive]);
  const avaxMaxGm = useMemo(
    () => calculateMaxApr(avaxGmApy, avaxGmIncentive, avaxGmLido),
    [avaxGmApy, avaxGmIncentive, avaxGmLido]
  );

  const botanixMaxGm = useMemo(
    () => calculateMaxApr(botanixGmApy, botanixGmIncentive, botanixGmLido),
    [botanixGmApy, botanixGmIncentive, botanixGmLido]
  );

  return (
    <div className="flex flex-col">
      <h4 className="py-20 text-20 font-medium text-typography-primary">
        <Trans>Current Yield Landscape</Trans>
      </h4>

      <div className="grid gap-12 lg:grid-cols-3">
        <NetworkYieldCard chainId={ARBITRUM} title={<Trans>Arbitrum</Trans>}>
          <YieldRow
            token="GMX"
            to="/stake"
            metric={<YieldMetric value={<APRLabel chainId={ARBITRUM} label="avgGMXAprTotal" />} suffix="APR" />}
          />
          <YieldRow
            token="GLV"
            to="/pools?pickBestGlv=1"
            metric={<YieldMetric value={formatAprValue(arbMaxGlv)} suffix="APY" />}
          />
          <YieldRow token="GM" to="/pools" metric={<YieldMetric value={formatAprValue(arbMaxGm)} suffix="APY" />} />
        </NetworkYieldCard>

        <NetworkYieldCard chainId={AVALANCHE} title={<Trans>Avalanche</Trans>}>
          <YieldRow
            token="GMX"
            to="/stake"
            metric={<YieldMetric value={<APRLabel chainId={AVALANCHE} label="avgGMXAprTotal" />} suffix="APR" />}
          />
          <YieldRow
            token="GLV"
            to="/pools?pickBestGlv=1"
            metric={<YieldMetric value={formatAprValue(avaxMaxGlv)} suffix="APY" />}
          />
          <YieldRow token="GM" to="/pools" metric={<YieldMetric value={formatAprValue(avaxMaxGm)} suffix="APY" />} />
        </NetworkYieldCard>

        <NetworkYieldCard chainId={BOTANIX} title={<Trans>Botanix</Trans>}>
          <YieldRow
            token="GMX"
            disabled
            metric={
              <YieldMetric
                value={<Trans>N/A</Trans>}
                suffix="APR"
                disabled
                tooltip={<Trans>GMX staking isn't currently supported on Botanix.</Trans>}
              />
            }
          />
          <YieldRow
            token="GLV"
            disabled
            metric={
              <YieldMetric
                value={<Trans>N/A</Trans>}
                suffix="APY"
                disabled
                tooltip={<Trans>No GLV vaults are currently active on Botanix.</Trans>}
              />
            }
          />
          <YieldRow token="GM" to="/pools" metric={<YieldMetric value={formatAprValue(botanixMaxGm)} suffix="APY" />} />
        </NetworkYieldCard>
      </div>
    </div>
  );
}

export default EarnYieldOverview;
