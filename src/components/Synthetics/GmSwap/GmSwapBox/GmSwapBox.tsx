import { msg } from "@lingui/macro";
import { useMemo } from "react";

import { selectShiftAvailableMarkets } from "context/SyntheticsStateContext/selectors/shiftSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useLocalizedMap } from "lib/i18n";
import { getByKey } from "lib/objects";
import { getGmSwapBoxAvailableModes } from "./getGmSwapBoxAvailableModes";
import { Mode, Operation } from "./types";

import Tab from "components/Tab/Tab";
import { GmShiftBox } from "./GmShiftBox/GmShiftBox";

import { selectGlvAndMarketsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { isGlvInfo } from "domain/synthetics/markets/glv";

import { GmSwapBoxDepositWithdrawal } from "./GmDepositWithdrawalBox/GmDepositWithdrawalBox";
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
      shiftAvailableMarkets.find((market) => market.marketTokenAddress === marketAddress)
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

  return (
    <div className="App-box GmSwapBox h-full">
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
