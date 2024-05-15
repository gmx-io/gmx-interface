import { gql, useQuery as useGqlQuery } from "@apollo/client";
import { Trans, t } from "@lingui/macro";
import { toPng } from "html-to-image";
import { useCallback, useMemo, useRef } from "react";
import { useRouteMatch } from "react-router-dom";
import {
  Bar,
  Cell,
  ComposedChart,
  Line,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  TooltipProps,
} from "recharts";

import { TIMEZONE_OFFSET_SEC } from "domain/prices";
import type { FromOldToNewArray } from "domain/tradingview/types";
import { useChainId } from "lib/chains";
import { formatDate, useDateRange, useNormalizeDateRange } from "lib/dates";
import downloadImage from "lib/downloadImage";
import { helperToast } from "lib/helperToast";
import { USD_DECIMALS } from "lib/legacy";
import { formatUsd } from "lib/numbers";
import { EMPTY_ARRAY } from "lib/objects";
import { buildFiltersBody, getSyntheticsGraphClient } from "lib/subgraph";
import { getPositiveOrNegativeClass } from "lib/utils";

import Button from "components/Button/Button";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { DateRangeSelect } from "components/Synthetics/DateRangeSelect/DateRangeSelect";

import downloadIcon from "img/ic_download_simple.svg";

const CSV_ICON_INFO = {
  src: downloadIcon,
};

export function DailyAndCumulativePnL() {
  const account = useRouteMatch<{ account: string }>()?.params.account;
  const { chainId } = useChainId();
  const [startDate, endDate, setDateRange] = useDateRange();
  const [fromTxTimestamp, toTxTimestamp] = useNormalizeDateRange(startDate, endDate);

  const clusteredPnlData = usePnlHistoricalData(chainId, account, fromTxTimestamp, toTxTimestamp);

  const { cardRef, handleImageDownload } = useImageDownload();

  return (
    <div className="flex flex-col rounded-4 bg-slate-800" ref={cardRef}>
      <div className="flex items-center justify-between border-b border-b-gray-950 px-16">
        <div className="py-16">
          <Trans>Daily and Cumulative PnL</Trans>
        </div>
        <div className="flex items-stretch justify-end gap-8">
          <Button
            variant="secondary"
            data-exclude
            className="!px-10 !py-6"
            imgInfo={CSV_ICON_INFO}
            onClick={handleImageDownload}
          >
            PNG
          </Button>
          <DateRangeSelect
            startDate={startDate}
            endDate={endDate}
            onChange={setDateRange}
            handleClassName="!px-10 !py-6"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-24 px-16 pt-16">
        <div className="text-gray-300">
          <div className="inline-block size-10 rounded-full bg-green-500" /> <Trans>Daily Profit</Trans>
        </div>
        <div className="text-gray-300">
          <div className="inline-block size-10 rounded-full bg-red-500" /> <Trans>Daily Loss</Trans>
        </div>
        <div className="text-gray-300">
          <div className="inline-block size-10 rounded-full bg-[#468AE3]" />{" "}
          <Trans>
            Cumulative PnL:{" "}
            <span className={getPositiveOrNegativeClass(clusteredPnlData.at(-1)?.cumulativePnl)}>
              {formatUsd(clusteredPnlData.at(-1)?.cumulativePnl)}
            </span>
          </Trans>
        </div>
      </div>

      <div className="relative min-h-[150px] grow">
        <div className="absolute size-full">
          <ResponsiveContainer debounce={500}>
            <ComposedChart width={500} height={300} data={clusteredPnlData}>
              <RechartsTooltip content={ChartTooltip} />
              <Bar dataKey="pnlFloat" minPointSize={1}>
                {clusteredPnlData.map((entry) => {
                  let fill;
                  if (entry.pnl > 0n) {
                    fill = "var(--color-green-500)";
                  } else if (entry.pnl < 0n) {
                    fill = "var(--color-red-500)";
                  } else {
                    fill = "var(--color-gray-900)";
                  }
                  return <Cell key={entry.date} fill={fill} />;
                })}
              </Bar>
              <Line type="monotone" dataKey="cumulativePnlFloat" stroke="#468AE3" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload }: TooltipProps<number | string, "pnl" | "cumulativePnl" | "date">) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const stats = payload[0].payload as PnlHistoricalData[number];

  return (
    <div className="rounded-4 border border-gray-950 bg-slate-800 p-8">
      <StatsTooltipRow label={t`Date`} value={stats.date} showDollar={false} />
      <StatsTooltipRow
        label={t`PnL`}
        value={formatUsd(stats.pnl)}
        showDollar={false}
        textClassName={getPositiveOrNegativeClass(stats.pnl)}
      />
      <StatsTooltipRow
        label={t`Cumulative PnL`}
        value={formatUsd(stats.cumulativePnl)}
        showDollar={false}
        textClassName={getPositiveOrNegativeClass(stats.cumulativePnl)}
      />
    </div>
  );
}

type PnlHistoricalData = FromOldToNewArray<{
  date: string;
  pnlFloat: number;
  pnl: bigint;
  cumulativePnlFloat: number;
  cumulativePnl: bigint;
}>;

function usePnlHistoricalData(
  chainId: number,
  account: string,
  fromTxTimestamp: number | undefined,
  toTxTimestamp: number | undefined
): PnlHistoricalData {
  const query = useMemo(
    () => gql`
      {
        history: tradeActions(
          orderBy: transaction__timestamp
          orderDirection: asc
          limit: 1000
          where: ${buildFiltersBody({
            account: account.toLowerCase(),
            transaction: { timestamp_gte: fromTxTimestamp, timestamp_lte: toTxTimestamp },
            pnlUsd_not: null,
          })}
        ) {
          pnlUsd,
          transaction {
            timestamp
          }
        }

      }
    `,
    [account, fromTxTimestamp, toTxTimestamp]
  );

  const { data: rawPnlData } = useGqlQuery(query, {
    client: getSyntheticsGraphClient(chainId)!,
    pollInterval: 10000,
  });

  const pnlData = useMemo(
    () =>
      rawPnlData?.history.map((action) => ({
        timestampSec: action.transaction.timestamp,
        pnlUsd: BigInt(action.pnlUsd),
      })) || EMPTY_ARRAY,
    [rawPnlData]
  );

  const clusteredPnlData = useMemo(() => {
    const clustered: {
      date: string;
      daysSinceLocalEpoch: number;
      pnl: bigint;
      cumulativePnl: bigint;
    }[] = [];

    for (const { timestampSec, pnlUsd } of pnlData) {
      const daysSinceLocalEpoch = Math.floor((timestampSec + TIMEZONE_OFFSET_SEC) / (24 * 60 * 60));
      const prev = clustered.at(-1);

      if (!prev) {
        const utcDate = formatDate(timestampSec);
        clustered.push({ date: utcDate, daysSinceLocalEpoch, pnl: pnlUsd, cumulativePnl: pnlUsd });
        continue;
      }

      if (prev.daysSinceLocalEpoch !== daysSinceLocalEpoch) {
        const utcDate = formatDate(timestampSec);
        for (let pointer = prev.daysSinceLocalEpoch + 1; pointer < daysSinceLocalEpoch; pointer++) {
          clustered.push({
            date: formatDate(pointer * 24 * 60 * 60),
            daysSinceLocalEpoch: pointer,
            pnl: 0n,
            cumulativePnl: prev.cumulativePnl,
          });
        }

        clustered.push({ date: utcDate, daysSinceLocalEpoch, pnl: pnlUsd, cumulativePnl: prev.cumulativePnl + pnlUsd });
        continue;
      }

      prev.pnl += pnlUsd;
      prev.cumulativePnl += pnlUsd;
    }

    // Pad start
    if (fromTxTimestamp && clustered.length) {
      const startDaysSinceLocalEpoch = Math.floor((fromTxTimestamp + TIMEZONE_OFFSET_SEC) / (24 * 60 * 60));
      const firstDaysSinceLocalEpoch = clustered[0].daysSinceLocalEpoch;
      const startGapLength = firstDaysSinceLocalEpoch - startDaysSinceLocalEpoch;

      for (let count = 1; count <= startGapLength; count++) {
        clustered.unshift({
          date: formatDate((firstDaysSinceLocalEpoch - count) * 24 * 60 * 60),
          daysSinceLocalEpoch: firstDaysSinceLocalEpoch - count,
          pnl: 0n,
          cumulativePnl: 0n,
        });
      }
    }

    // Pad end
    if (toTxTimestamp && clustered.length) {
      const endDaysSinceLocalEpoch = Math.floor((toTxTimestamp + TIMEZONE_OFFSET_SEC) / (24 * 60 * 60));
      const lastDaysSinceLocalEpoch = clustered.at(-1)!.daysSinceLocalEpoch;
      const endGapLength = endDaysSinceLocalEpoch - clustered.at(-1)!.daysSinceLocalEpoch;
      const lastCumulativePnl = clustered.at(-1)!.cumulativePnl;

      for (let count = 1; count <= endGapLength; count++) {
        clustered.push({
          date: formatDate((lastDaysSinceLocalEpoch + count) * 24 * 60 * 60),
          daysSinceLocalEpoch: lastDaysSinceLocalEpoch + count,
          pnl: 0n,
          cumulativePnl: lastCumulativePnl,
        });
      }
    }

    const compressed: PnlHistoricalData = clustered.map(({ date, pnl, cumulativePnl }) => ({
      date,
      pnlFloat: Number((pnl * 1_0000n) / 10n ** BigInt(USD_DECIMALS)) / 1_0000,
      pnl: pnl,
      cumulativePnlFloat: Number((cumulativePnl * 1_0000n) / 10n ** BigInt(USD_DECIMALS)) / 1_0000,
      cumulativePnl: cumulativePnl,
    }));

    return compressed;
  }, [fromTxTimestamp, pnlData, toTxTimestamp]);
  return clusteredPnlData;
}

function useImageDownload() {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleImageDownload = useCallback(() => {
    if (!cardRef.current) {
      helperToast.error("Error in downloading image");
      return;
    }

    toPng(cardRef.current, {
      filter: (element) => {
        if (element.dataset?.exclude) {
          return false;
        }
        return true;
      },
    }).then((dataUri) => {
      downloadImage(dataUri, "daily-and-cumulative-pnl.png");
    });
  }, []);

  return { cardRef, handleImageDownload };
}
