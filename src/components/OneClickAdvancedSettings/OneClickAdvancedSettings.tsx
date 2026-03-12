import { Trans, t } from "@lingui/macro";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useSubaccountContext } from "context/SubaccountContext/SubaccountContextProvider";
import { useBigNumberInput } from "domain/synthetics/common/useBigNumberInput";
import { getRemainingSubaccountActions, getRemainingSubaccountSeconds } from "domain/synthetics/subaccount";
import { periodToSeconds, secondsToPeriod } from "sdk/utils/time";

import Button from "components/Button/Button";
import { ExpandableRow } from "components/ExpandableRow";
import SuggestionInput from "components/SuggestionInput/SuggestionInput";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

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
        title={<Trans>One-Click settings</Trans>}
        className="mb-4"
      >
        <div className="mt-12 flex flex-col gap-14">
          <SyntheticsInfoRow
            label={
              <TooltipWithPortal
                position="left-start"
                variant="icon"
                content={<Trans>Maximum actions before reauthorization required</Trans>}
              >
                <Trans>Allowed actions</Trans>
              </TooltipWithPortal>
            }
          >
            <SuggestionInput
              value={remainingActionsString}
              setValue={onChangeRemainingActions}
              label={t`Action(s)`}
              placeholder="0"
              className="w-[112px]"
            />
          </SyntheticsInfoRow>

          <SyntheticsInfoRow
            label={
              <TooltipWithPortal
                position="left-start"
                variant="icon"
                content={<Trans>Maximum days before reauthorization required</Trans>}
              >
                <Trans>Time limit</Trans>
              </TooltipWithPortal>
            }
          >
            <SuggestionInput
              value={daysLimitString}
              setValue={onChangeDaysLimit}
              label={t`Day(s)`}
              placeholder="0"
              className="w-[112px]"
            />
          </SyntheticsInfoRow>

          <Button
            onClick={handleSave}
            variant="primary-action"
            className="mt-6 h-36 w-full bg-blue-600 py-3 text-typography-primary"
            disabled={disabled}
          >
            <Trans>Save settings</Trans>
          </Button>
        </div>
      </ExpandableRow>
    </div>
  );
}
