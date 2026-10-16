import { Trans, t } from "@lingui/macro";
import { useCallback, useEffect, useMemo, useState } from "react";

import { DEFAULT_ONE_CLICK_SESSION_DURATION, DEFAULT_ONE_CLICK_SESSION_MAX_ACTIONS } from "config/oneClickTrading";
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
  const { subaccount, updateSubaccountSettings, initialSettings, setInitialSettings } = useSubaccountContext();
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
    const remainingActions = subaccount
      ? getRemainingSubaccountActions(subaccount)
      : initialSettings?.remainingActions ?? BigInt(DEFAULT_ONE_CLICK_SESSION_MAX_ACTIONS);
    const remainingSeconds = subaccount
      ? getRemainingSubaccountSeconds(subaccount)
      : initialSettings?.remainingSeconds ?? BigInt(DEFAULT_ONE_CLICK_SESSION_DURATION);

    const nextRemainigActions = BigInt(remainingActionsString);
    const nextRemainingSeconds = BigInt(periodToSeconds(Number(daysLimitString), "1d"));

    const notChanged = remainingActions === nextRemainigActions && remainingSeconds === nextRemainingSeconds;
    const isInvalid = subaccount
      ? nextRemainigActions < 0n || nextRemainingSeconds < 0n
      : nextRemainigActions <= 0n || nextRemainingSeconds <= 0n;

    return notChanged || isInvalid;
  }, [subaccount, initialSettings, remainingActionsString, daysLimitString]);

  const handleSave = useCallback(() => {
    const nextRemainigActions = BigInt(remainingActionsString);
    const nextRemainingSeconds = BigInt(periodToSeconds(Number(daysLimitString), "1d"));

    if (!subaccount) {
      if (nextRemainigActions > 0n && nextRemainingSeconds > 0n)
        setInitialSettings?.({ remainingActions: nextRemainigActions, remainingSeconds: nextRemainingSeconds });
      return;
    }

    updateSubaccountSettings({
      nextRemainigActions,
      nextRemainingSeconds,
    });
  }, [subaccount, remainingActionsString, daysLimitString, updateSubaccountSettings, setInitialSettings]);

  useEffect(
    function initSettings() {
      const remainingActions = subaccount
        ? getRemainingSubaccountActions(subaccount)
        : initialSettings?.remainingActions ?? BigInt(DEFAULT_ONE_CLICK_SESSION_MAX_ACTIONS);
      const remainingSeconds = subaccount
        ? getRemainingSubaccountSeconds(subaccount)
        : initialSettings?.remainingSeconds ?? BigInt(DEFAULT_ONE_CLICK_SESSION_DURATION);
      const remainingDays = secondsToPeriod(Number(remainingSeconds), "1d", true);

      setRemainingActionsString(remainingActions.toString());
      setDaysLimitString(remainingDays.toString());
    },
    [setRemainingActionsString, setDaysLimitString, subaccount, initialSettings]
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
              stripLeadingZeros
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
              stripLeadingZeros
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
