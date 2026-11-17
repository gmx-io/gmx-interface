import { msg } from "@lingui/macro";
import { useEffect, useMemo } from "react";

import {
  selectPoolsDetailsAvailableModes,
  selectPoolsDetailsAvailableOperations,
  selectPoolsDetailsGlvOrMarketAddress,
  selectPoolsDetailsHasPendingInput,
  selectPoolsDetailsMode,
  selectPoolsDetailsOperation,
  selectPoolsDetailsSetGlvOrMarketAddress,
  selectPoolsDetailsSetMode,
  selectPoolsDetailsSetOperation,
  selectPoolsDetailsSetSelectedMarketAddressForGlv,
} from "context/PoolsDetailsContext/selectors";
import { selectShiftAvailableMarkets } from "context/SyntheticsStateContext/selectors/shiftSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { Mode, Operation } from "domain/synthetics/markets/types";
import { useLocalizedMap } from "lib/i18n";
import { useBlockAutoReload } from "lib/pwa/blockAutoReload";

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

  const hasPendingInput = useSelector(selectPoolsDetailsHasPendingInput);
  useBlockAutoReload(hasPendingInput);

  const availableModes = useSelector(selectPoolsDetailsAvailableModes);
  const availableOperations = useSelector(selectPoolsDetailsAvailableOperations);
  const shiftAvailableMarkets = useSelector(selectShiftAvailableMarkets);

  // A sticky Shift operation must not mount GmShiftBox for a non-shiftable market (it would
  // replace the selected market on mount); clamp only once shift availability is loaded.
  const isShiftAvailabilityKnown = shiftAvailableMarkets.length > 0;
  const operationToRender =
    isShiftAvailabilityKnown && !availableOperations.includes(operation) ? Operation.Deposit : operation;

  useEffect(
    function fallbackUnavailableOperation() {
      if (operationToRender !== operation) {
        setOperation(operationToRender);
      }
    },
    [operation, operationToRender, setOperation]
  );

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

      {operationToRender === Operation.Deposit || operationToRender === Operation.Withdrawal ? (
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
