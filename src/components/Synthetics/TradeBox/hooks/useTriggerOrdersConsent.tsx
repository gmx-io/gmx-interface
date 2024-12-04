import { Trans } from "@lingui/macro";
import Checkbox from "components/Checkbox/Checkbox";
import { useState } from "react";
import { useDecreaseOrdersThatWillBeExecuted } from "./useDecreaseOrdersThatWillBeExecuted";

export function useTriggerOrdersConsent() {
  const [isTriggerWarningAccepted, setIsTriggerWarningAccepted] = useState(false);
  const decreaseOrdersThatWillBeExecuted = useDecreaseOrdersThatWillBeExecuted();

  if (decreaseOrdersThatWillBeExecuted?.length === 0) {
    return [null, true, setIsTriggerWarningAccepted] as const;
  }

  const element = (
    <div className="PositionEditor-allow-higher-slippage">
      <Checkbox isChecked={isTriggerWarningAccepted} setIsChecked={setIsTriggerWarningAccepted}>
        <span className="text-body-medium text-yellow-500">
          <Trans>I am aware of the trigger orders</Trans>
        </span>
      </Checkbox>
    </div>
  );

  return [element, isTriggerWarningAccepted, setIsTriggerWarningAccepted] as const;
}
