import { t } from "@lingui/macro";

import { useBuybackChartData } from "domain/buyback/useBuybackChartData";
import { useBuybackWeeklyStats } from "domain/buyback/useBuybackWeeklyStats";
import { useGmxDailyPrices } from "domain/buyback/useGmxDailyPrices";
import { GMX_DECIMALS } from "lib/legacy";
import { bigintToNumber } from "lib/numbers";

import { AppCard, AppCardSection } from "components/AppCard/AppCard";

import { BuybackChart } from "./BuybackChart";
import { BuybackMetricsHeader } from "./BuybackMetricsHeader";

export function BuybackDashboard({ totalGmxSupply }: { totalGmxSupply: bigint | undefined }) {
  const { data, isLoading: isStatsLoading, error: statsError } = useBuybackWeeklyStats();
  const { candles, isLoading: isCandlesLoading, error: candlesError } = useGmxDailyPrices(data?.weeks?.[0]?.weekStart);

  const isLoading = isStatsLoading || isCandlesLoading;
  const error = statsError ?? candlesError;

  const totalGmxSupplyNumber =
    totalGmxSupply !== undefined && totalGmxSupply > 0n ? bigintToNumber(totalGmxSupply, GMX_DECIMALS) : undefined;

  const { chartData, metrics } = useBuybackChartData(data, candles, totalGmxSupplyNumber);

  return (
    <AppCard>
      <AppCardSection>
        <div className="text-16 font-medium">{t`Buyback dashboard`}</div>
        <BuybackMetricsHeader metrics={metrics} isLoading={isLoading} error={error} />
      </AppCardSection>
      <AppCardSection>
        <BuybackChart chartData={chartData} />
      </AppCardSection>
    </AppCard>
  );
}
