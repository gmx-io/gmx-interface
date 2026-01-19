import { msg } from "@lingui/macro";
import { useMemo } from "react";

import {
  selectPoolsDetailsAvailableModes,
  selectPoolsDetailsGlvOrMarketAddress,
  selectPoolsDetailsMode,
  selectPoolsDetailsOperation,
  selectPoolsDetailsSetGlvOrMarketAddress,
  selectPoolsDetailsSetMode,
  selectPoolsDetailsSetOperation,
  selectPoolsDetailsSetSelectedMarketAddressForGlv,
} from "context/PoolsDetailsContext/selectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { Mode, Operation } from "domain/synthetics/markets/types";
import { useLocalizedMap } from "lib/i18n";

import Tabs from "components/Tabs/Tabs";

import { GmSwapBoxDepositWithdrawal } from "./GmDepositWithdrawalBox/GmDepositWithdrawalBox";
import { GmShiftBox } from "./GmShiftBox/GmShiftBox";

import "./GmSwapBox.scss";

const MODE_LABELS = {
  [Mode.Single]: msg`Single`,
  [Mode.Pair]: msg`Pair`,
};

export function GmSwapBox() {
  const selectedGlvOrMarketAddress = useSelector(selectPoolsDetailsGlvOrMarketAddress);
  const operation = useSelector(selectPoolsDetailsOperation);
  const mode = useSelector(selectPoolsDetailsMode);
  const setMode = useSelector(selectPoolsDetailsSetMode);
  const setOperation = useSelector(selectPoolsDetailsSetOperation);
  const setGlvOrMarketAddress = useSelector(selectPoolsDetailsSetGlvOrMarketAddress);
  const setSelectedMarketAddressForGlv = useSelector(selectPoolsDetailsSetSelectedMarketAddressForGlv);

  const availableModes = useSelector(selectPoolsDetailsAvailableModes);

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
    <div className="flex flex-col">
      <Tabs
        options={availableModesTabsOptions}
        selectedValue={mode}
        onChange={setMode}
        className="bg-slate-900 p-12 pb-0"
        type="inline"
      />

      {operation === Operation.Deposit || operation === Operation.Withdrawal ? (
        <GmSwapBoxDepositWithdrawal />
      ) : (
        <GmShiftBox
          selectedGlvOrMarketAddress={selectedGlvOrMarketAddress}
          onSelectedMarketForGlv={setSelectedMarketAddressForGlv}
          onSelectGlvOrMarket={setGlvOrMarketAddress}
          onSetOperation={setOperation}
        />
      )}
    </div>
  );
}
