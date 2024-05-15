import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { noop } from "lodash";
import { useMemo } from "react";

import { getAccountDashboardTabKey } from "config/localStorage";
import { useOrderErrorsCount } from "context/SyntheticsStateContext/hooks/orderHooks";
import { selectPositionsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectOrdersCount } from "context/SyntheticsStateContext/selectors/orderSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useChainId } from "lib/chains";
import { useLocalStorageSerializeKey } from "lib/localStorage";

import { ClaimsHistory } from "components/Synthetics/Claims/ClaimsHistory";
import { OrderList } from "components/Synthetics/OrderList/OrderList";
import { PositionList } from "components/Synthetics/PositionList/PositionList";
import { TradeHistory } from "components/Synthetics/TradeHistory/TradeHistory";
import Tab from "components/Tab/Tab";

enum TabKey {
  Positions = "Positions",
  Orders = "Orders",
  Trades = "Trades",
  Claims = "Claims",
}

type Props = {
  account: string;
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
    <div>
      <Trans>Orders</Trans>{" "}
      <span
        className={cx({
          "text-red-500": ordersErrorsCount > 0,
          "text-yellow-500": !ordersErrorsCount && ordersWarningsCount > 0,
        })}
      >
        ({ordersCount})
      </span>
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

export function HistoricalLists({ account }: Props) {
  const { chainId } = useChainId();
  const [tabKey, setTabKey] = useLocalStorageSerializeKey(getAccountDashboardTabKey(chainId), TabKey.Positions);

  const tabLabels = useTabLabels();

  const tabOptions = useMemo(() => Object.keys(TabKey), []);

  return (
    <div>
      <div className="py-10">
        <Tab options={tabOptions} optionLabels={tabLabels} option={tabKey} onChange={setTabKey} type="inline" />
      </div>
      {tabKey === TabKey.Positions && (
        <PositionList
          onOrdersClick={noop}
          onSettlePositionFeesClick={noop}
          onSelectPositionClick={noop}
          onClosePositionClick={noop}
          openSettings={noop}
          hideActions
        />
      )}
      {tabKey === TabKey.Orders && (
        <OrderList
          selectedOrdersKeys={undefined}
          setSelectedOrdersKeys={noop}
          setPendingTxns={noop}
          selectedPositionOrderKey={undefined}
          setSelectedPositionOrderKey={noop}
          hideActions
        />
      )}
      {tabKey === TabKey.Trades && <TradeHistory account={account} shouldShowPaginationButtons />}
      {tabKey === TabKey.Claims && <ClaimsHistory shouldShowPaginationButtons />}
    </div>
  );
}
