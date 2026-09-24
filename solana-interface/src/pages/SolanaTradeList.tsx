import type { MessageDescriptor } from "@lingui/core";
import { msg, Trans } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { useMemo, useState } from "react";

import Badge from "components/Badge/Badge";
import Checkbox from "components/Checkbox/Checkbox";
import { EmptyTableContent } from "components/EmptyTableContent/EmptyTableContent";
import { Table, TableTh, TableTheadTr } from "components/Table/Table";
import Tabs from "components/Tabs/Tabs";

import { SolanaPositionList } from "../components/SolanaPositionList";
import { useSolanaPositions } from "../positions/useSolanaPositions";

type ListTab = "positions" | "orders" | "trades" | "claims";

type PlaceholderTab = Exclude<ListTab, "positions">;

const TAB_CONTENT: Record<PlaceholderTab, { headers: MessageDescriptor[]; emptyText: MessageDescriptor }> = {
  orders: {
    headers: [msg`MARKET`, msg`ORDER TYPE`, msg`SIZE`, msg`TRIGGER PRICE`, msg`MARK PRICE`],
    emptyText: msg`No open orders`,
  },
  trades: {
    headers: [msg`ACTION`, msg`MARKET`, msg`SIZE`, msg`PRICE`, msg`RPNL`, msg`FEES`],
    emptyText: msg`No trades yet`,
  },
  claims: {
    headers: [msg`ACTION`, msg`MARKET`, msg`SIZE`],
    emptyText: msg`No claims yet`,
  },
};

export function SolanaTradeList() {
  const [tab, setTab] = useState<ListTab>("positions");
  const [showChartPositions, setShowChartPositions] = useState(true);
  const positions = useSolanaPositions();
  const positionsCount = positions.isLoading ? 0 : positions.positions.length;

  const tabOptions = useMemo(
    () => [
      {
        value: "positions" as const,
        label: (
          <div className="flex gap-4">
            <Trans>Positions</Trans>
            <Badge>{positionsCount}</Badge>
          </div>
        ),
      },
      { value: "orders" as const, label: <Trans>Orders</Trans> },
      { value: "trades" as const, label: <Trans>Trades</Trans> },
      { value: "claims" as const, label: <Trans>Claims</Trans> },
    ],
    [positionsCount]
  );

  return (
    <section className="col-span-full flex min-h-[536px] min-w-0 flex-col overflow-hidden rounded-8 bg-slate-900">
      <div className="overflow-x-auto">
        <Tabs
          options={tabOptions}
          selectedValue={tab}
          onChange={setTab}
          className="min-w-max"
          rightContent={
            (tab === "positions" || tab === "orders") && (
              <div className="shrink-0 px-12">
                <Checkbox
                  isChecked={showChartPositions}
                  setIsChecked={setShowChartPositions}
                  className="whitespace-nowrap text-[13px] text-typography-secondary"
                >
                  <Trans>Chart positions</Trans>
                </Checkbox>
              </div>
            )
          }
        />
      </div>
      {tab === "positions" ? (
        <SolanaPositionList
          positions={positions.positions}
          isWalletConnected={positions.isWalletConnected}
          isLoading={positions.isLoading}
          error={positions.error}
          onRetry={positions.refresh}
        />
      ) : (
        <PlaceholderTabContent tab={tab} />
      )}
    </section>
  );
}

function PlaceholderTabContent({ tab }: { tab: PlaceholderTab }) {
  const { i18n } = useLingui();
  const { headers, emptyText } = TAB_CONTENT[tab];
  return (
    <>
      <div className="overflow-x-auto">
        <Table className="min-w-[800px]">
          <thead>
            <TableTheadTr>
              {headers.map((header, index) => (
                <TableTh key={index} scope="col" className="whitespace-nowrap last-of-type:text-left">
                  {i18n._(header)}
                </TableTh>
              ))}
            </TableTheadTr>
          </thead>
          <tbody />
        </Table>
      </div>
      <EmptyTableContent isLoading={false} isEmpty emptyText={i18n._(emptyText)} />
    </>
  );
}
