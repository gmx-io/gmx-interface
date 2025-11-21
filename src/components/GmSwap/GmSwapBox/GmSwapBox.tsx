import { msg } from "@lingui/macro";
import { useMemo } from "react";

import {
  selectPoolsDetailsGlvOrMarketAddress,
  selectPoolsDetailsMode,
  selectPoolsDetailsOperation,
  selectPoolsDetailsSetGlvOrMarketAddress,
  selectPoolsDetailsSetMode,
  selectPoolsDetailsSetOperation,
  selectPoolsDetailsSetSelectedMarketAddressForGlv,
} from "context/PoolsDetailsContext/selectors";
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
