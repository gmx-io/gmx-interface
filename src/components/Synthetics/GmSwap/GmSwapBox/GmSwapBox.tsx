import { msg } from "@lingui/macro";
import { Dispatch, SetStateAction, useCallback } from "react";

import { useMarketsInfoData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { useLocalizedMap } from "lib/i18n";
import { getByKey } from "lib/objects";
import { getGmSwapBoxAvailableModes } from "./getGmSwapBoxAvailableModes";
import { Mode, Operation } from "./types";

import Tab from "components/Tab/Tab";
import { GmShiftBox } from "./GmShiftBox/GmShiftBox";
import { GmSwapBoxDepositWithdrawal } from "./GmDepositWithdrawalBox/GmDepositWithdrawalBox";

import "./GmSwapBox.scss";

export type GmSwapBoxProps = {
  selectedMarketAddress?: string;
  onSelectMarket: (marketAddress: string) => void;
  operation: Operation;
  mode: Mode;
  onSetMode: Dispatch<SetStateAction<Mode>>;
  onSetOperation: Dispatch<SetStateAction<Operation>>;
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
  const availableModes = getGmSwapBoxAvailableModes(operation, marketInfo);

  const onOperationChange = useCallback(
    (operation: Operation) => {
      onSetOperation(operation);
    },
    [onSetOperation]
  );

  const localizedOperationLabels = useLocalizedMap(OPERATION_LABELS);
  const localizedModeLabels = useLocalizedMap(MODE_LABELS);

  return (
    <div className="App-box GmSwapBox">
      <Tab
        options={Object.values(Operation)}
        optionLabels={localizedOperationLabels}
        option={operation}
        onChange={onOperationChange}
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
