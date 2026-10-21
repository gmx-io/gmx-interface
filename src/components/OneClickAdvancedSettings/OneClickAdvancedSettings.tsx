import { Trans, t } from "@lingui/macro";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  DEFAULT_ONE_CLICK_SESSION_DURATION,
  DEFAULT_ONE_CLICK_SESSION_MAX_ACTIONS,
  MAX_ONE_CLICK_SESSION_ACTIONS,
  MAX_ONE_CLICK_SESSION_DAYS,
} from "config/oneClickTrading";
import { useSubaccountContext } from "context/SubaccountContext/SubaccountContextProvider";
import { useBigNumberInput } from "domain/synthetics/common/useBigNumberInput";
import { getRemainingSubaccountActions, getRemainingSubaccountSeconds } from "domain/synthetics/subaccount";
import type { SubaccountLimits } from "domain/synthetics/subaccount/utils";
import { periodToSeconds } from "sdk/utils/time";

import Button from "components/Button/Button";
import { ExpandableRow } from "components/ExpandableRow";
import SuggestionInput from "components/SuggestionInput/SuggestionInput";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

const SECONDS_IN_DAY = BigInt(periodToSeconds(1, "1d"));

const DEFAULT_LIMITS: SubaccountLimits = {
  remainingActions: BigInt(DEFAULT_ONE_CLICK_SESSION_MAX_ACTIONS),
  remainingSeconds: BigInt(DEFAULT_ONE_CLICK_SESSION_DURATION),
};

// Whole numbers are kept as digit strings: parseInt turns long inputs into "1e+21", which BigInt cannot parse.
function toWholeNumberString(value: string) {
  const [integerPart] = value.split(".");
  return integerPart.replace(/\D/g, "").replace(/^0+(?=\d)/, "") || "0";
}

function secondsToDays(seconds: bigint) {
  return seconds > 0n ? (seconds + SECONDS_IN_DAY - 1n) / SECONDS_IN_DAY : 0n;
}

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
    (value: string) => setRemainingActionsString(toWholeNumberString(value)),
    [setRemainingActionsString]
  );

  const onChangeDaysLimit = useCallback(
    (value: string) => setDaysLimitString(toWholeNumberString(value)),
    [setDaysLimitString]
  );

  const currentLimits: SubaccountLimits = useMemo(
    () =>
      subaccount
        ? {
            remainingActions: getRemainingSubaccountActions(subaccount),
            remainingSeconds: getRemainingSubaccountSeconds(subaccount),
          }
        : initialSettings ?? DEFAULT_LIMITS,
    [subaccount, initialSettings]
  );

  const nextLimits: SubaccountLimits = useMemo(
    () => ({
      remainingActions: BigInt(remainingActionsString),
      remainingSeconds: BigInt(daysLimitString) * SECONDS_IN_DAY,
    }),
    [remainingActionsString, daysLimitString]
  );

  const disabled = useMemo(() => {
    const { remainingActions, remainingSeconds } = nextLimits;
    const notChanged =
      currentLimits.remainingActions === remainingActions && currentLimits.remainingSeconds === remainingSeconds;
    const isTooLarge =
      remainingActions > BigInt(MAX_ONE_CLICK_SESSION_ACTIONS) ||
      remainingSeconds > BigInt(MAX_ONE_CLICK_SESSION_DAYS) * SECONDS_IN_DAY;
    const isInvalid = !subaccount && (remainingActions === 0n || remainingSeconds === 0n);

    return notChanged || isTooLarge || isInvalid;
  }, [subaccount, currentLimits, nextLimits]);

  const handleSave = useCallback(() => {
    if (!subaccount) {
      setInitialSettings(nextLimits);
      return;
    }

    updateSubaccountSettings({
      nextRemainigActions: nextLimits.remainingActions,
      nextRemainingSeconds: nextLimits.remainingSeconds,
    });
  }, [subaccount, nextLimits, updateSubaccountSettings, setInitialSettings]);

  useEffect(
    function initSettings() {
      setRemainingActionsString(currentLimits.remainingActions.toString());
      setDaysLimitString(secondsToDays(currentLimits.remainingSeconds).toString());
    },
    [setRemainingActionsString, setDaysLimitString, currentLimits]
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
