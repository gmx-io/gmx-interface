import { msg } from "@lingui/macro";
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
    active: "!bg-green-500/20 border-b-2 border-b-green-500",
  },
  [Operation.Withdrawal]: {
    active: "!bg-red-500/20 border-b-2 border-b-red-500",
  },
  [Operation.Shift]: {
    active: "!bg-blue-300/20 border-b-2 border-b-blue-300",
  },
};

type Props = {
  selectedGlvOrMarketAddress?: string;
  operation: Operation;
  onSetOperation: (operation: Operation) => void;
  isInCurtain?: boolean;
};

export function GmSwapBoxHeader(p: Props) {
  const { selectedGlvOrMarketAddress, operation, onSetOperation, isInCurtain } = p;

  const marketsInfoData = useSelector(selectGlvAndMarketsInfoData);
  const shiftAvailableMarkets = useSelector(selectShiftAvailableMarkets);
  const marketInfo = getByKey(marketsInfoData, selectedGlvOrMarketAddress);

  const availableOperations = useMemo(() => {
    if (shiftAvailableMarkets.length === 0) {
      return [Operation.Deposit, Operation.Withdrawal];
    }

    const isSelectedMarketShiftAvailable = Boolean(
      shiftAvailableMarkets.find((market) => getGlvOrMarketAddress(market) === selectedGlvOrMarketAddress)
    );

    if (!isSelectedMarketShiftAvailable) {
      return [Operation.Deposit, Operation.Withdrawal];
    }

    return OPERATIONS;
  }, [selectedGlvOrMarketAddress, shiftAvailableMarkets]);

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
    <Tabs
      options={availableOperationsTabsOptions}
      selectedValue={operation}
      onChange={onSetOperation}
      regularOptionClassname={isInCurtain ? "grow !rounded-t-0" : "grow"}
      className={!isInCurtain ? "bg-slate-900" : undefined}
    />
  );
}
