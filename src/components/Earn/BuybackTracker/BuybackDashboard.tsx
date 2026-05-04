import { t } from "@lingui/macro";

import { useBuybackChartData } from "domain/buyback/useBuybackChartData";
import { useBuybackWeeklyStats } from "domain/buyback/useBuybackWeeklyStats";
import { useTotalStakedGmxAndEsGmx } from "domain/legacy";
import { bigintToNumber } from "lib/numbers";

import { AppCard, AppCardSection } from "components/AppCard/AppCard";

import { BuybackChart } from "./BuybackChart";
import { BuybackMetricsHeader } from "./BuybackMetricsHeader";

export function BuybackDashboard({ gmxPrice }: { gmxPrice: bigint | undefined }) {
  const { data, isLoading, error } = useBuybackWeeklyStats();
  const { total: totalStakedAmount } = useTotalStakedGmxAndEsGmx();

  const gmxPriceNumber = gmxPrice !== undefined ? bigintToNumber(gmxPrice, 30) : undefined;
  const totalStakedGmxNumber =
    totalStakedAmount !== undefined && totalStakedAmount > 0n ? bigintToNumber(totalStakedAmount, 18) : undefined;

  const { chartData, metrics } = useBuybackChartData(data, gmxPriceNumber, totalStakedGmxNumber);

  return (
    <AppCard>
      <AppCardSection>
        <div className="text-16 font-medium">{t`Buyback Dashboard`}</div>
        <BuybackMetricsHeader metrics={metrics} isLoading={isLoading} error={error} />
      </AppCardSection>
      <AppCardSection>
        <BuybackChart chartData={chartData} gmxPrice={gmxPriceNumber} />
      </AppCardSection>
    </AppCard>
  );
}
