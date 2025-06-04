import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { ethers } from "ethers";
import noop from "lodash/noop";
import { useCallback, useMemo, useState } from "react";
import type { Address } from "viem";

import { getAccountDashboardTabKey } from "config/localStorage";
import { useOrderErrorsCount } from "context/SyntheticsStateContext/hooks/orderHooks";
import { selectPositionsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectOrdersCount } from "context/SyntheticsStateContext/selectors/orderSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { OrderTypeFilterValue } from "domain/synthetics/orders/ordersFilters";
import { useAccountOrders } from "lib/legacy";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { useEthersSigner } from "lib/wallets/useEthersSigner";
import useWallet from "lib/wallets/useWallet";
import {
  AccountActionsV1,
  AccountOrdersV1,
  AccountPositionsV1,
  usePositionsV1,
} from "pages/Actions/ActionsV1/ActionsV1";

import { ClaimsHistory } from "components/Synthetics/Claims/ClaimsHistory";
import { OrderList } from "components/Synthetics/OrderList/OrderList";
import { PositionList } from "components/Synthetics/PositionList/PositionList";
import type { MarketFilterLongShortItemData } from "components/Synthetics/TableMarketFilter/MarketFilterLongShort";
import { TradeHistory } from "components/Synthetics/TradeHistory/TradeHistory";
import Tabs from "components/Tabs/Tabs";

enum TabKey {
  Positions = "Positions",
  Orders = "Orders",
  Trades = "Trades",
  Claims = "Claims",
}

enum TabKeyV1 {
  Positions = "Positions",
  Orders = "Orders",
  Trades = "Trades",
}

type Props = {
  chainId: number;
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

  return (
    <div className="flex">
      <Trans>Orders ({ordersCount})</Trans>
      <div
        className={cx("relative top-3 size-6 rounded-full", {
          "bg-yellow-500": ordersWarningsCount > 0 && !ordersErrorsCount,
          "bg-red-500": ordersErrorsCount > 0,
        })}
      />
    </div>
  );
}

function useTabLabels(): Record<TabKey, React.ReactNode> {
  const { errors: ordersErrorsCount, warnings: ordersWarningsCount } = useOrderErrorsCount();
  const ordersCount = useSelector(selectOrdersCount);
  const positionsCount = useSelector((s) => Object.keys(selectPositionsInfoData(s) || {}).length);

  const tabLabels = useMemo(
    () => ({
      [TabKey.Positions]: t`Positions${positionsCount ? ` (${positionsCount})` : ""}`,
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

function useTabLabelsV1(
  chainId: number,
  account: Address,
  signer: ethers.JsonRpcSigner | undefined,
  active: boolean
): Record<TabKeyV1, React.ReactNode> {
  const [orders] = useAccountOrders(true, account, chainId, signer, active);
  const ordersCount = orders.length;

  const { positions } = usePositionsV1(chainId, account, signer, active);
  const positionsCount = positions.length;

  const tabLabels = useMemo(
    () => ({
      [TabKeyV1.Positions]: positionsCount === 0 ? t`Positions` : t`Positions (${positionsCount})`,

      [TabKeyV1.Orders]: ordersCount === 0 ? t`Orders` : t`Orders (${ordersCount})`,
      [TabKeyV1.Trades]: t`Trades`,
    }),
    [ordersCount, positionsCount]
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
      <div className="py-10">
        <Tabs options={tabsOptions} selectedValue={tabKey} onChange={setTabKey} type="inline" />
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
        />
      )}
      {tabKey === TabKey.Trades && <TradeHistory account={account} hideDashboardLink />}
      {tabKey === TabKey.Claims && <ClaimsHistory />}
    </div>
  );
}

export function HistoricalListsV1({ account, chainId }: Props) {
  const [tabKey, setTabKey] = useLocalStorageSerializeKey(getAccountDashboardTabKey(chainId), TabKeyV1.Positions);
  const { active } = useWallet();
  const signer = useEthersSigner({ chainId });

  const tabLabels = useTabLabelsV1(chainId, account, signer, active);

  const tabsOptions = useMemo(
    () =>
      Object.values(TabKeyV1).map((tab) => ({
        value: tab,
        label: tabLabels[tab],
      })),
    [tabLabels]
  );

  return (
    <>
      <div>
        <div className="py-10">
          <Tabs options={tabsOptions} selectedValue={tabKey} onChange={setTabKey} type="inline" />
        </div>

        {tabKey === TabKeyV1.Positions && (
          <AccountPositionsV1 account={account} active={true} chainId={chainId} signer={signer} />
        )}
        {tabKey === TabKeyV1.Orders && (
          <AccountOrdersV1 account={account} active={true} chainId={chainId} signer={signer} />
        )}
        {tabKey === TabKeyV1.Trades && (
          <AccountActionsV1 account={account} active={true} chainId={chainId} signer={signer} />
        )}
      </div>
    </>
  );
}
