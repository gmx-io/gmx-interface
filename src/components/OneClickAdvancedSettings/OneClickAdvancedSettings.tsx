import { Trans } from "@lingui/macro";
import { useCallback, useEffect, useState } from "react";

import { useSubaccountContext } from "context/SubaccountContext/SubaccountContextProvider";
import { useBigNumberInput } from "domain/synthetics/common/useBigNumberInput";
import { getRemainingSubaccountActions, getRemainingSubaccountSeconds } from "domain/synthetics/subaccount";
import { periodToSeconds, secondsToPeriod } from "sdk/utils/time";

import Button from "components/Button/Button";
import { InputRow } from "components/InputRow/InputRow";
import { ExpandableRow } from "components/Synthetics/ExpandableRow";

export function OneClickAdvancedSettings() {
  const { subaccount, updateSubaccountSettings } = useSubaccountContext();

  const [isExpanded, setIsExpanded] = useState(true);

  const { displayValue: remainingActionsString, setDisplayValue: setRemainingActionsString } = useBigNumberInput(
    0n,
    0,
    0
  );

  const { displayValue: daysLimitString, setDisplayValue: setDaysLimitString } = useBigNumberInput(0n, 0, 0);

  const handleSave = useCallback(() => {
    if (!subaccount) {
      return;
    }

    const nextRemainigActions = BigInt(remainingActionsString);
    const nextRemainingSeconds = BigInt(periodToSeconds(Number(daysLimitString), "1d"));

    updateSubaccountSettings({
      nextRemainigActions,
      nextRemainingSeconds,
    });
  }, [subaccount, remainingActionsString, daysLimitString, updateSubaccountSettings]);

  useEffect(
    function initSettings() {
      if (!subaccount) {
        return;
      }

      const remainingActions = getRemainingSubaccountActions(subaccount);
      const remainingSeconds = getRemainingSubaccountSeconds(subaccount);
      const remainingDays = secondsToPeriod(Number(remainingSeconds), "1d", true);

      setRemainingActionsString(remainingActions.toString());
      setDaysLimitString(remainingDays.toString());
    },
    [setRemainingActionsString, setDaysLimitString, subaccount]
  );

  if (!subaccount) {
    return null;
  }

  return (
    <div>
      <ExpandableRow
        open={isExpanded}
        onToggle={setIsExpanded}
        title={<Trans>Advanced Settings</Trans>}
        className="mb-4"
      >
        <div className="mt-12">
          <InputRow
            value={remainingActionsString}
            setValue={(value) => {
              setRemainingActionsString(value);
            }}
            label="Remained Allowed Actions"
            symbol="Actions"
            placeholder="0"
            description="Maximum number of actions allowed before requiring reauthorization"
          />

          <InputRow
            value={daysLimitString}
            setValue={(value) => {
              setDaysLimitString(value);
            }}
            label="Time Limit"
            symbol="Days"
            placeholder="0"
            description="Maximum number of days before requiring reauthorization"
          />

          <Button
            onClick={handleSave}
            variant="primary-action"
            className="mt-6 h-36 w-full bg-blue-600 py-3 text-white"
          >
            <Trans>Save limit settings</Trans>
          </Button>
        </div>
      </ExpandableRow>
    </div>
  );
}
