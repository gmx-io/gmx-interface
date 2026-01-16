import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import noop from "lodash/noop";
import { useCallback, useMemo, useState } from "react";
import type { Address } from "viem";

import { getAccountDashboardTabKey } from "config/localStorage";
import { useOrderErrorsCount } from "context/SyntheticsStateContext/hooks/orderHooks";
import { selectPositionsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectOrdersCount } from "context/SyntheticsStateContext/selectors/orderSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import type { OrderTypeFilterValue } from "domain/synthetics/orders/ordersFilters";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import type { ContractsChainId } from "sdk/configs/chains";

import Badge, { BadgeIndicator } from "components/Badge/Badge";
import { ClaimsHistory } from "components/Claims/ClaimsHistory";
import { OrderList } from "components/OrderList/OrderList";
import { PositionList } from "components/PositionList/PositionList";
import type { MarketFilterLongShortItemData } from "components/TableMarketFilter/MarketFilterLongShort";
import Tabs from "components/Tabs/Tabs";
import { TradeHistory } from "components/TradeHistory/TradeHistory";

enum TabKey {
  Positions = "Positions",
  Orders = "Orders",
  Trades = "Trades",
  Claims = "Claims",
}

type Props = {
  chainId: ContractsChainId;
  account: Address;
};

function OrdersTabTitle({
  ordersCount,
  ordersWarningsCount,
  ordersErrorsCount,
}: {
  ordersCount: number;
  ordersErrorsCount: number;
  ordersWarningsCount: number;
}) {
  if (!ordersCount) {
    return (
      <div>
        <Trans>Orders</Trans>
      </div>
    );
  }

  let indicator: BadgeIndicator | undefined;
  if (ordersWarningsCount > 0 && !ordersErrorsCount) {
    indicator = "warning";
  } else if (ordersErrorsCount > 0) {
    indicator = "error";
  }

  return (
    <div className="flex items-center gap-8">
      <Trans>Orders</Trans>
      <Badge indicator={indicator}>{ordersCount}</Badge>
    </div>
  );
}

function useTabLabels(): Record<TabKey, React.ReactNode> {
  const { errors: ordersErrorsCount, warnings: ordersWarningsCount } = useOrderErrorsCount();
  const ordersCount = useSelector(selectOrdersCount);
  const positionsCount = useSelector((s) => Object.keys(selectPositionsInfoData(s) || {}).length);

  const tabLabels = useMemo(
    () => ({
      [TabKey.Positions]: (
        <div className="flex items-center gap-8">
          <Trans>Positions</Trans> <Badge>{positionsCount}</Badge>
        </div>
      ),
      [TabKey.Orders]: (
        <OrdersTabTitle
          ordersCount={ordersCount}
          ordersErrorsCount={ordersErrorsCount}
          ordersWarningsCount={ordersWarningsCount}
        />
      ),
      [TabKey.Trades]: t`Trades`,
      [TabKey.Claims]: t`Claims`,
    }),
    [ordersCount, ordersErrorsCount, ordersWarningsCount, positionsCount]
  );

  return tabLabels;
}

export function HistoricalLists({ chainId, account }: Props) {
  const [tabKey, setTabKey] = useLocalStorageSerializeKey(getAccountDashboardTabKey(chainId), TabKey.Positions);

  const tabLabels = useTabLabels();

  const [marketsDirectionsFilter, setMarketsDirectionsFilter] = useState<MarketFilterLongShortItemData[]>([]);
  const [orderTypesFilter, setOrderTypesFilter] = useState<OrderTypeFilterValue[]>([]);

  const handleOrdersClick = useCallback(() => {
    setTabKey(TabKey.Orders);
    setMarketsDirectionsFilter([]);
    setOrderTypesFilter([]);
  }, [setTabKey]);

  const tabsOptions = useMemo(
    () =>
      Object.values(TabKey).map((tab) => ({
        value: tab,
        label: tabLabels[tab],
      })),
    [tabLabels]
  );

  return (
    <div>
      <div className="overflow-x-auto scrollbar-hide">
        <Tabs
          options={tabsOptions}
          selectedValue={tabKey}
          onChange={setTabKey}
          type="block"
          className={cx("w-[max(100%,600px)] bg-slate-900 max-md:w-[max(100%,420px)]", {
            "max-lg:mb-8 max-lg:rounded-b-8": [TabKey.Positions, TabKey.Orders].includes(tabKey as TabKey),
          })}
          regularOptionClassname={cx({
            "max-lg:first:rounded-l-8 max-lg:last:rounded-r-8": [TabKey.Positions, TabKey.Orders].includes(
              tabKey as TabKey
            ),
          })}
        />
      </div>

      {tabKey === TabKey.Positions && (
        <PositionList
          onOrdersClick={handleOrdersClick}
          onSelectPositionClick={noop}
          onClosePositionClick={noop}
          openSettings={noop}
          onCancelOrder={noop}
          hideActions
        />
      )}
      {tabKey === TabKey.Orders && (
        <OrderList
          selectedOrdersKeys={undefined}
          setSelectedOrderKeys={noop}
          selectedPositionOrderKey={undefined}
          setSelectedPositionOrderKey={noop}
          hideActions
          marketsDirectionsFilter={marketsDirectionsFilter}
          setMarketsDirectionsFilter={setMarketsDirectionsFilter}
          orderTypesFilter={orderTypesFilter}
          setOrderTypesFilter={setOrderTypesFilter}
          onSelectOrderClick={undefined}
        />
      )}
      {tabKey === TabKey.Trades && <TradeHistory account={account} />}
      {tabKey === TabKey.Claims && <ClaimsHistory />}
    </div>
  );
}
