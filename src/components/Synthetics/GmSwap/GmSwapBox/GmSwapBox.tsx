import { msg } from "@lingui/macro";
import { useMemo } from "react";

import { selectGlvAndMarketsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useLocalizedMap } from "lib/i18n";
import { getByKey } from "lib/objects";

import Tabs from "components/Tabs/Tabs";

import { getGmSwapBoxAvailableModes } from "./getGmSwapBoxAvailableModes";
import { GmSwapBoxDepositWithdrawal } from "./GmDepositWithdrawalBox/GmDepositWithdrawalBox";
import { GmShiftBox } from "./GmShiftBox/GmShiftBox";
import { Mode, Operation } from "./types";

import "./GmSwapBox.scss";

export type GmSwapBoxProps = {
  selectedGlvOrMarketAddress?: string;
  onSelectGlvOrMarket: (glvOrMarketAddress: string) => void;
  operation: Operation;
  mode: Mode;
  onSetMode: (mode: Mode) => void;
  onSetOperation: (operation: Operation) => void;
  selectedMarketForGlv?: string;
  onSelectedMarketForGlv?: (marketAddress?: string) => void;
};

const MODE_LABELS = {
  [Mode.Single]: msg`Single`,
  [Mode.Pair]: msg`Pair`,
};

export function GmSwapBox(p: GmSwapBoxProps) {
  const {
    selectedGlvOrMarketAddress,
    operation,
    mode,
    onSetMode,
    onSetOperation,
    onSelectGlvOrMarket: onSelectGlvOrMarket,
    selectedMarketForGlv,
    onSelectedMarketForGlv,
  } = p;

  const marketsInfoData = useSelector(selectGlvAndMarketsInfoData);
  const marketInfo = getByKey(marketsInfoData, selectedGlvOrMarketAddress);

  const availableModes = getGmSwapBoxAvailableModes(operation, marketInfo);

  const localizedModeLabels = useLocalizedMap(MODE_LABELS);

  const availableModesTabsOptions = useMemo(
    () =>
      availableModes.map((mode) => ({
        value: mode,
        label: localizedModeLabels[mode],
      })),
    [availableModes, localizedModeLabels]
  );

  return (
    <div className="App-box GmSwapBox">
      <Tabs
        options={availableModesTabsOptions}
        selectedValue={mode}
        onChange={onSetMode}
        className="GmSwapBox-asset-options-tabs"
        type="inline"
      />

      {operation === Operation.Deposit || operation === Operation.Withdrawal ? (
        <GmSwapBoxDepositWithdrawal
          selectedGlvOrMarketAddress={selectedGlvOrMarketAddress}
          onSelectGlvOrMarket={onSelectGlvOrMarket}
          selectedMarketForGlv={selectedMarketForGlv}
          onSelectedMarketForGlv={onSelectedMarketForGlv}
          operation={operation}
          mode={mode}
          onSetMode={onSetMode}
          onSetOperation={onSetOperation}
        />
      ) : (
        <GmShiftBox
          selectedGlvOrMarketAddress={selectedGlvOrMarketAddress}
          onSelectedMarketForGlv={onSelectedMarketForGlv}
          onSelectGlvOrMarket={onSelectGlvOrMarket}
          onSetOperation={onSetOperation}
        />
      )}
    </div>
  );
}
