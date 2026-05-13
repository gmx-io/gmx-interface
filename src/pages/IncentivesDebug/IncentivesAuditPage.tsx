import { t } from "@lingui/macro";
import { useCallback, useMemo } from "react";
import { useHistory, useLocation, useParams } from "react-router-dom";

import { useIncentivesConfig } from "domain/synthetics/incentives/useIncentivesConfig";
import { useChainId } from "lib/chains";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import PageTitle from "components/PageTitle/PageTitle";

import { IncentivesAuditDetail } from "./IncentivesAuditDetail";
import { IncentivesAuditList } from "./IncentivesAuditList";

function useQueryParam(key: string): [string | undefined, (value: string | undefined) => void] {
  const { search } = useLocation();
  const history = useHistory();

  const value = useMemo(() => {
    return new URLSearchParams(search).get(key) ?? undefined;
  }, [search, key]);

  const setValue = useCallback(
    (newValue: string | undefined) => {
      const params = new URLSearchParams(search);
      if (newValue === undefined) {
        params.delete(key);
      } else {
        params.set(key, newValue);
      }
      const qs = params.toString();
      history.replace({ search: qs ? `?${qs}` : "" });
    },
    [search, key, history]
  );

  return [value, setValue];
}

export function IncentivesAuditPage() {
  const { account } = useParams<{ account?: string }>();
  const { chainId } = useChainId();
  const history = useHistory();
  const { data: config } = useIncentivesConfig(chainId);

  const [epochParam, setEpochParam] = useQueryParam("epoch");
  const latestEpoch = config?.epochTimestamp;
  const selectedEpoch: number | "all" | undefined =
    epochParam === "all" ? "all" : epochParam ? Number(epochParam) : latestEpoch;

  const epochs = useMemo(() => {
    if (!config || config.epochDuration <= 0) return [];
    const result: { timestamp: number; label: string }[] = [];
    let ts = config.programStartTimestamp;
    while (ts <= config.epochTimestamp) {
      const date = new Date(ts * 1000);
      result.push({
        timestamp: ts,
        label: date.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
      ts += config.epochDuration;
    }
    return result.reverse();
  }, [config]);

  const handleEpochChange = useCallback(
    (epoch: number | "all" | undefined) => {
      setEpochParam(epoch !== undefined ? String(epoch) : undefined);
    },
    [setEpochParam]
  );

  const handleAccountClick = useCallback(
    (addr: string) => {
      const epochQuery = selectedEpoch !== undefined ? `?epoch=${selectedEpoch}` : "";
      history.push(`/incentives-audit/${addr}${epochQuery}`);
    },
    [history, selectedEpoch]
  );

  const handleBackToList = useCallback(() => {
    const epochQuery = selectedEpoch !== undefined ? `?epoch=${selectedEpoch}` : "";
    history.push(`/incentives-audit${epochQuery}`);
  }, [history, selectedEpoch]);

  return (
    <AppPageLayout title={t`Incentives Audit`}>
      <PageTitle
        title={t`Incentives Audit`}
        subtitle={t`Dev-only: inspect incentive program payouts per epoch`}
        isTop
      />

      {account ? (
        <IncentivesAuditDetail chainId={chainId} account={account} onBack={handleBackToList} />
      ) : (
        <IncentivesAuditList
          chainId={chainId}
          selectedEpoch={selectedEpoch}
          epochs={epochs}
          onEpochChange={handleEpochChange}
          onAccountClick={handleAccountClick}
        />
      )}
    </AppPageLayout>
  );
}
