import { msg } from "@lingui/macro";
import cx from "classnames";
import { useMemo } from "react";

import { selectGlvAndMarketsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectShiftAvailableMarkets } from "context/SyntheticsStateContext/selectors/shiftSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { getGlvOrMarketAddress } from "domain/synthetics/markets/utils";
import { useLocalizedMap } from "lib/i18n";
import { getByKey } from "lib/objects";

import Tabs from "components/Tabs/Tabs";

import { Operation } from "./types";

const OPERATION_LABELS_GM = {
  [Operation.Deposit]: msg`Buy GM`,
  [Operation.Withdrawal]: msg`Sell GM`,
  [Operation.Shift]: msg`Shift GM`,
};

const OPERATION_LABELS_GLV = {
  [Operation.Deposit]: msg`Buy GLV`,
  [Operation.Withdrawal]: msg`Sell GLV`,
  [Operation.Shift]: msg`Shift GM`,
};

const OPERATIONS = [Operation.Deposit, Operation.Withdrawal, Operation.Shift];

const operationClassNames = {
  [Operation.Deposit]: {
    active: "!bg-[#1F3445] border-b border-b-green-500",
    regular: "border-b border-b-[transparent]",
  },
  [Operation.Withdrawal]: {
    active: "!bg-[#392A46] border-b border-b-red-500",
    regular: "border-b border-b-[transparent]",
  },
  [Operation.Shift]: {
    active: "!bg-[#252B57] border-b border-b-blue-300",
    regular: "border-b border-b-[transparent]",
  },
};

type Props = {
  selectedMarketAddress?: string;
  operation: Operation;
  onSetOperation: (operation: Operation) => void;
  isInCurtain?: boolean;
};

export function GmSwapBoxHeader(p: Props) {
  const { selectedMarketAddress, operation, onSetOperation, isInCurtain } = p;

  const marketAddress = selectedMarketAddress;

  const marketsInfoData = useSelector(selectGlvAndMarketsInfoData);
  const shiftAvailableMarkets = useSelector(selectShiftAvailableMarkets);
  const marketInfo = getByKey(marketsInfoData, marketAddress);

  const availableOperations = useMemo(() => {
    if (shiftAvailableMarkets.length === 0) {
      return OPERATIONS;
    }

    const isSelectedMarketShiftAvailable = Boolean(
      shiftAvailableMarkets.find((market) => getGlvOrMarketAddress(market) === marketAddress)
    );

    if (!isSelectedMarketShiftAvailable) {
      return [Operation.Deposit, Operation.Withdrawal];
    }

    return OPERATIONS;
  }, [marketAddress, shiftAvailableMarkets]);

  const localizedOperationLabelsGM = useLocalizedMap(OPERATION_LABELS_GM);
  const localizedOperationLabelsGLV = useLocalizedMap(OPERATION_LABELS_GLV);

  const localizedOperationLabels = useMemo(
    () => (marketInfo && isGlvInfo(marketInfo) ? localizedOperationLabelsGLV : localizedOperationLabelsGM),
    [marketInfo, localizedOperationLabelsGM, localizedOperationLabelsGLV]
  );

  const availableOperationsTabsOptions = useMemo(
    () =>
      availableOperations.map((operation) => ({
        value: operation,
        label: localizedOperationLabels[operation],
        className: operationClassNames[operation],
      })),
    [availableOperations, localizedOperationLabels]
  );

  return (
    <div className={cx({ "p-[1.5rem] pb-0 bg-slate-800": !isInCurtain })}>
      <Tabs
        options={availableOperationsTabsOptions}
        selectedValue={operation}
        onChange={onSetOperation}
        className={isInCurtain ? undefined : "Exchange-swap-option-tabs"}
      />
    </div>
  );
}
