import { t, Trans } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { useCallback, useMemo } from "react";
import { useHistory, useLocation, useParams } from "react-router-dom";

import { useIncentivesConfig } from "domain/synthetics/incentives/v2/useIncentivesConfig";
import { formatEpochLabel } from "domain/synthetics/incentives/v2/utils";
import { useChainId } from "lib/chains";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import Loader from "components/Loader/Loader";
import PageTitle from "components/PageTitle/PageTitle";

import { IncentivesAuditDetail } from "./IncentivesAuditDetail";
import { IncentivesAuditList } from "./IncentivesAuditList";
import { IncentivesConfigSnapshot } from "./IncentivesConfigSnapshot";
import { getAuditEpochCount } from "./utils";

function useQueryParam(key: string): [string | undefined, (value: string | undefined) => void] {
  const { search } = useLocation();
  const history = useHistory();
  const value = useMemo(() => new URLSearchParams(search).get(key) ?? undefined, [key, search]);

  const setValue = useCallback(
    (newValue: string | undefined) => {
      const params = new URLSearchParams(search);
      if (newValue === undefined) {
        params.delete(key);
      } else {
        params.set(key, newValue);
      }

      const queryString = params.toString();
      history.replace({ search: queryString ? `?${queryString}` : "" });
    },
    [history, key, search]
  );

  return [value, setValue];
}

export function IncentivesAuditPage() {
  const { i18n } = useLingui();
  const { account } = useParams<{ account?: string }>();
  const { chainId } = useChainId();
  const history = useHistory();
  const { data: config, error, loading, endpoint } = useIncentivesConfig(chainId);
  const [epochParam, setEpochParam] = useQueryParam("epoch");

  const selectedEpoch = useMemo<number | "all" | undefined>(() => {
    if (epochParam === "all") return "all";
    if (epochParam !== undefined) {
      const epoch = Number(epochParam);
      if (Number.isSafeInteger(epoch) && epoch > 0) return epoch;
    }

    return config?.epochTimestamp;
  }, [config?.epochTimestamp, epochParam]);

  const epochs = useMemo(() => {
    if (!config) return [];

    const epochCount = getAuditEpochCount(config);

    return Array.from({ length: epochCount }, (_, index) => {
      const timestamp = config.epochTimestamp - index * config.epochDuration;
      const currentSuffix = index === 0 ? ` · ${t`current`}` : "";

      return {
        timestamp,
        label: `${formatEpochLabel(timestamp, config.epochDuration, i18n.locale)} · ${timestamp}${currentSuffix}`,
      };
    });
  }, [config, i18n.locale]);

  const handleEpochChange = useCallback(
    (epoch: number | "all" | undefined) => setEpochParam(epoch === undefined ? undefined : String(epoch)),
    [setEpochParam]
  );

  const handleAccountClick = useCallback(
    (address: string) => {
      const epochQuery = selectedEpoch !== undefined ? `?epoch=${selectedEpoch}` : "";
      history.push(`/incentives-audit/${address}${epochQuery}`);
    },
    [history, selectedEpoch]
  );

  const handleBackToList = useCallback(() => {
    const epochQuery = selectedEpoch !== undefined ? `?epoch=${selectedEpoch}` : "";
    history.push(`/incentives-audit${epochQuery}`);
  }, [history, selectedEpoch]);

  return (
    <AppPageLayout title={t`Incentives V2 Audit`} contentClassName="!max-w-none">
      <PageTitle
        title={t`Incentives V2 Audit`}
        subtitle={t`Dev-only: inspect indexed V2 configuration and account reward calculations`}
        isTop
      />

      <div className="mt-16 flex flex-col gap-16">
        {loading && config === undefined ? (
          <div className="flex min-h-[240px] items-center justify-center rounded-8 bg-slate-900">
            <Loader />
          </div>
        ) : error && config === undefined ? (
          <div className="rounded-8 bg-slate-900 p-24 text-center text-red-500">
            <Trans>Unable to load the incentives configuration.</Trans>
          </div>
        ) : config === null || config === undefined ? (
          <div className="rounded-8 bg-slate-900 p-24 text-center text-typography-secondary">
            <Trans>No V2 incentives configuration is available for this chain.</Trans>
          </div>
        ) : (
          <>
            {error ? (
              <div className="rounded-8 border-l-2 border-l-yellow-300 bg-yellow-300 bg-opacity-10 p-12 text-13 text-typography-secondary">
                <Trans>The configuration could not be refreshed. Showing the latest loaded version.</Trans>
              </div>
            ) : null}
            <IncentivesConfigSnapshot config={config} endpoint={endpoint} />
            {account ? (
              <IncentivesAuditDetail chainId={chainId} account={account} config={config} onBack={handleBackToList} />
            ) : (
              <IncentivesAuditList
                chainId={chainId}
                config={config}
                selectedEpoch={selectedEpoch}
                epochs={epochs}
                onEpochChange={handleEpochChange}
                onAccountClick={handleAccountClick}
              />
            )}
          </>
        )}
      </div>
    </AppPageLayout>
  );
}
