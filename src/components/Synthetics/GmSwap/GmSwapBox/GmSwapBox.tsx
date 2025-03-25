import { msg } from "@lingui/macro";
import { useMemo } from "react";

import { selectGlvAndMarketsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectShiftAvailableMarkets } from "context/SyntheticsStateContext/selectors/shiftSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getGlvOrMarketAddress } from "domain/synthetics/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { useLocalizedMap } from "lib/i18n";
import { getByKey } from "lib/objects";

import Tabs from "components/Tabs/Tabs";

import { getGmSwapBoxAvailableModes } from "./getGmSwapBoxAvailableModes";
import { GmSwapBoxDepositWithdrawal } from "./GmDepositWithdrawalBox/GmDepositWithdrawalBox";
import { GmShiftBox } from "./GmShiftBox/GmShiftBox";
import { Mode, Operation } from "./types";

import "./GmSwapBox.scss";

export type GmSwapBoxProps = {
  selectedMarketAddress?: string;
  onSelectMarket: (marketAddress: string) => void;
  operation: Operation;
  mode: Mode;
  onSetMode: (mode: Mode) => void;
  onSetOperation: (operation: Operation) => void;
  selectedMarketForGlv?: string;
  onSelectedMarketForGlv?: (marketAddress?: string) => void;
};

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

const MODE_LABELS = {
  [Mode.Single]: msg`Single`,
  [Mode.Pair]: msg`Pair`,
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

export function GmSwapBox(p: GmSwapBoxProps) {
  const {
    selectedMarketAddress,
    operation,
    mode,
    onSetMode,
    onSetOperation,
    onSelectMarket,
    selectedMarketForGlv,
    onSelectedMarketForGlv,
  } = p;

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
  const availableModes = getGmSwapBoxAvailableModes(operation, marketInfo);

  const localizedOperationLabelsGM = useLocalizedMap(OPERATION_LABELS_GM);
  const localizedOperationLabelsGLV = useLocalizedMap(OPERATION_LABELS_GLV);

  const localizedOperationLabels = useMemo(
    () => (marketInfo && isGlvInfo(marketInfo) ? localizedOperationLabelsGLV : localizedOperationLabelsGM),
    [marketInfo, localizedOperationLabelsGM, localizedOperationLabelsGLV]
  );

  const localizedModeLabels = useLocalizedMap(MODE_LABELS);

  const availableOperationsTabsOptions = useMemo(
    () =>
      availableOperations.map((operation) => ({
        value: operation,
        label: localizedOperationLabels[operation],
        className: operationClassNames[operation],
      })),
    [availableOperations, localizedOperationLabels]
  );

  const availableModesTabsOptions = useMemo(
    () =>
      availableModes.map((mode) => ({
        value: mode,
        label: localizedModeLabels[mode],
      })),
    [availableModes, localizedModeLabels]
  );

  return (
    <div className="App-box GmSwapBox h-full">
      <Tabs
        options={availableOperationsTabsOptions}
        selectedValue={operation}
        onChange={onSetOperation}
        className="Exchange-swap-option-tabs"
      />

      <Tabs
        options={availableModesTabsOptions}
        selectedValue={mode}
        onChange={onSetMode}
        className="GmSwapBox-asset-options-tabs"
        type="inline"
      />

      {operation === Operation.Deposit || operation === Operation.Withdrawal ? (
        <GmSwapBoxDepositWithdrawal
          selectedMarketAddress={selectedMarketAddress}
          onSelectMarket={onSelectMarket}
          selectedMarketForGlv={selectedMarketForGlv}
          onSelectedMarketForGlv={onSelectedMarketForGlv}
          operation={operation}
          mode={mode}
          onSetMode={onSetMode}
          onSetOperation={onSetOperation}
        />
      ) : (
        <GmShiftBox
          selectedMarketAddress={selectedMarketAddress}
          onSelectedMarketForGlv={onSelectedMarketForGlv}
          onSelectMarket={onSelectMarket}
          onSetMode={onSetMode}
          onSetOperation={onSetOperation}
        />
      )}
    </div>
  );
}
