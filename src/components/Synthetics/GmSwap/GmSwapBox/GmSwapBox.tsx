import { msg } from "@lingui/macro";
import { useEffect, useMemo } from "react";

import { useMarketsInfoData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { selectShiftAvailableMarkets } from "context/SyntheticsStateContext/selectors/shiftSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useLocalizedMap } from "lib/i18n";
import { getByKey } from "lib/objects";
import { getGmSwapBoxAvailableModes } from "./getGmSwapBoxAvailableModes";
import { Mode, Operation } from "./types";

import Tab from "components/Tab/Tab";
import { GmSwapBoxDepositWithdrawal } from "./GmDepositWithdrawalBox/GmDepositWithdrawalBox";
import { GmShiftBox } from "./GmShiftBox/GmShiftBox";

import "./GmSwapBox.scss";

export type GmSwapBoxProps = {
  selectedMarketAddress?: string;
  onSelectMarket: (marketAddress: string) => void;
  operation: Operation;
  mode: Mode;
  onSetMode: (mode: Mode) => void;
  onSetOperation: (operation: Operation) => void;
};

const OPERATION_LABELS = {
  [Operation.Deposit]: msg`Buy GM`,
  [Operation.Withdrawal]: msg`Sell GM`,
  [Operation.Shift]: msg`Shift GM`,
};

const MODE_LABELS = {
  [Mode.Single]: msg`Single`,
  [Mode.Pair]: msg`Pair`,
};

export function GmSwapBox(p: GmSwapBoxProps) {
  const { selectedMarketAddress, operation, mode, onSetMode, onSetOperation, onSelectMarket } = p;

  const marketAddress = selectedMarketAddress;

  const marketsInfoData = useMarketsInfoData();

  const marketInfo = getByKey(marketsInfoData, marketAddress);
  const shiftAvailableMarkets = useSelector(selectShiftAvailableMarkets);

  const isSelectedMarketShiftAvailable = useMemo(() => {
    return Boolean(shiftAvailableMarkets?.find((market) => market.marketTokenAddress === selectedMarketAddress));
  }, [selectedMarketAddress, shiftAvailableMarkets]);

  const availableOperations = useMemo(() => {
    return [
      Operation.Deposit,
      Operation.Withdrawal,
      {
        text: Operation.Shift,
        disabled: !isSelectedMarketShiftAvailable,
      },
    ];
  }, [isSelectedMarketShiftAvailable]);

  const availableModes = getGmSwapBoxAvailableModes(operation, marketInfo);

  useEffect(
    function updateOperation() {
      const isSelectedMarketShiftAvailable = Boolean(
        shiftAvailableMarkets?.find((market) => market.marketTokenAddress === selectedMarketAddress)
      );

      const isShiftOperation = operation === Operation.Shift;

      if (isShiftOperation && !isSelectedMarketShiftAvailable) {
        onSetOperation(Operation.Deposit);
      }
    },
    [onSetOperation, operation, selectedMarketAddress, shiftAvailableMarkets]
  );

  const localizedOperationLabels = useLocalizedMap(OPERATION_LABELS);
  const localizedModeLabels = useLocalizedMap(MODE_LABELS);

  return (
    <div className="App-box GmSwapBox">
      <Tab
        options={availableOperations}
        optionLabels={localizedOperationLabels}
        option={operation}
        onChange={onSetOperation}
        className="Exchange-swap-option-tabs"
      />

      <Tab
        options={availableModes}
        optionLabels={localizedModeLabels}
        className="GmSwapBox-asset-options-tabs"
        type="inline"
        option={mode}
        onChange={onSetMode}
      />

      {operation === Operation.Deposit || operation === Operation.Withdrawal ? (
        <GmSwapBoxDepositWithdrawal
          selectedMarketAddress={selectedMarketAddress}
          onSelectMarket={onSelectMarket}
          operation={operation}
          mode={mode}
          onSetMode={onSetMode}
          onSetOperation={onSetOperation}
        />
      ) : (
        <GmShiftBox
          selectedMarketAddress={selectedMarketAddress}
          onSelectMarket={onSelectMarket}
          onSetMode={onSetMode}
          onSetOperation={onSetOperation}
        />
      )}
    </div>
  );
}
