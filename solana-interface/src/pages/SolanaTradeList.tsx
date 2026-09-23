import type { MessageDescriptor } from "@lingui/core";
import { msg, Trans } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { useState } from "react";

import Badge from "components/Badge/Badge";
import Checkbox from "components/Checkbox/Checkbox";
import { EmptyTableContent } from "components/EmptyTableContent/EmptyTableContent";
import { Table, TableTh, TableTheadTr } from "components/Table/Table";
import Tabs from "components/Tabs/Tabs";

type ListTab = "positions" | "orders" | "trades" | "claims";

const TAB_OPTIONS = [
  {
    value: "positions" as const,
    label: (
      <div className="flex gap-4">
        <Trans>Positions</Trans>
        <Badge>0</Badge>
      </div>
    ),
  },
  { value: "orders" as const, label: <Trans>Orders</Trans> },
  { value: "trades" as const, label: <Trans>Trades</Trans> },
  { value: "claims" as const, label: <Trans>Claims</Trans> },
];

const TAB_CONTENT: Record<ListTab, { headers: MessageDescriptor[]; emptyText: MessageDescriptor }> = {
  positions: {
    headers: [
      msg`POSITION`,
      msg`SIZE`,
      msg`NET VALUE`,
      msg`MARGIN`,
      msg`ENTRY PRICE`,
      msg`MARK PRICE`,
      msg`LIQUIDATION PRICE`,
      msg`TP/SL`,
    ],
    emptyText: msg`No open positions`,
  },
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
  const { i18n } = useLingui();
  const [tab, setTab] = useState<ListTab>("positions");
  const [showChartPositions, setShowChartPositions] = useState(true);
  const { headers, emptyText } = TAB_CONTENT[tab];

  return (
    <section className="col-span-full flex min-h-[536px] min-w-0 flex-col overflow-hidden rounded-8 bg-slate-900">
      <div className="overflow-x-auto">
        <Tabs
          options={TAB_OPTIONS}
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
    </section>
  );
}
