import { Trans } from "@lingui/macro";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useSubaccountContext } from "context/SubaccountContext/SubaccountContextProvider";
import { useBigNumberInput } from "domain/synthetics/common/useBigNumberInput";
import { getRemainingSubaccountActions, getRemainingSubaccountSeconds } from "domain/synthetics/subaccount";
import { periodToSeconds, secondsToPeriod } from "sdk/utils/time";

import Button from "components/Button/Button";
import { InputRow } from "components/InputRow/InputRow";
import { ExpandableRow } from "components/Synthetics/ExpandableRow";

export function OneClickAdvancedSettings() {
  const { subaccount, updateSubaccountSettings } = useSubaccountContext();
  const [isExpanded, setIsExpanded] = useState(false);

  const { displayValue: remainingActionsString, setDisplayValue: setRemainingActionsString } = useBigNumberInput(
    0n,
    0,
    0
  );

  const { displayValue: daysLimitString, setDisplayValue: setDaysLimitString } = useBigNumberInput(0n, 0, 0);

  const onChangeRemainingActions = useCallback(
    (value: string) => {
      if (value === "") {
        setRemainingActionsString("0");
      } else {
        setRemainingActionsString(String(parseInt(value)));
      }
    },
    [setRemainingActionsString]
  );

  const onChangeDaysLimit = useCallback(
    (value: string) => {
      if (value === "") {
        setDaysLimitString("0");
      } else {
        setDaysLimitString(String(parseInt(value)));
      }
    },
    [setDaysLimitString]
  );

  const disabled = useMemo(() => {
    if (!subaccount) {
      return true;
    }

    const remainingActions = getRemainingSubaccountActions(subaccount);
    const remainingSeconds = getRemainingSubaccountSeconds(subaccount);

    const nextRemainigActions = BigInt(remainingActionsString);
    const nextRemainingSeconds = BigInt(periodToSeconds(Number(daysLimitString), "1d"));

    const notChanged = remainingActions === nextRemainigActions && remainingSeconds === nextRemainingSeconds;
    const isInvalid = nextRemainigActions < 0n || nextRemainingSeconds < 0n;

    return notChanged || isInvalid;
  }, [subaccount, remainingActionsString, daysLimitString]);

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

  return (
    <div>
      <ExpandableRow
        open={isExpanded}
        onToggle={setIsExpanded}
        title={<Trans>One-Click Settings</Trans>}
        className="mb-4"
      >
        <div className="mt-12">
          <InputRow
            value={remainingActionsString}
            setValue={onChangeRemainingActions}
            label=" Remaining Allowed Actions"
            symbol="Action(s)"
            placeholder="0"
            description="Maximum number of actions allowed before reauthorization is required."
          />

          <InputRow
            value={daysLimitString}
            setValue={onChangeDaysLimit}
            label="Time Limit"
            symbol="Day(s)"
            placeholder="0"
            description="Maximum number of days before reauthorization is required."
          />

          <Button
            onClick={handleSave}
            variant="primary-action"
            className="mt-6 h-36 w-full bg-blue-600 py-3 text-white"
            disabled={disabled}
          >
            <Trans>Save One-Click Trading settings</Trans>
          </Button>
        </div>
      </ExpandableRow>
    </div>
  );
}
