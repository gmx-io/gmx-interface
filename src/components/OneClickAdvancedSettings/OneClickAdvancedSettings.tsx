import { Trans } from "@lingui/macro";
import Button from "components/Button/Button";
import { useBigNumberInput } from "domain/synthetics/common/useBigNumberInput";
import { InputRow } from "components/InputRow/InputRow";
import { ExpandableRow } from "components/Synthetics/ExpandableRow";
import { useState } from "react";

export function OneClickAdvancedSettings() {
  const [isExpanded, setIsExpanded] = useState(true);
  const { displayValue: maxAllowedActionsString, setDisplayValue: setMaxAllowedActionsString } = useBigNumberInput(
    10n,
    0,
    0
  );

  const { displayValue: timeLimitString, setDisplayValue: setTimeLimitString } = useBigNumberInput(7n, 0, 0);

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
            value={maxAllowedActionsString}
            setValue={setMaxAllowedActionsString}
            label="Remained Allowed Actions"
            symbol="Actions"
            placeholder="0"
            description="Maximum number of actions allowed before requiring reauthorization"
          />

          <InputRow
            value={timeLimitString}
            setValue={setTimeLimitString}
            label="Time Limit"
            symbol="Days"
            placeholder="0"
            description="Maximum number of days before requiring reauthorization"
          />

          <Button variant="primary-action" className="mt-6 h-36 w-full bg-blue-600 py-3 text-white">
            <Trans>Save limit settings</Trans>
          </Button>
        </div>
      </ExpandableRow>
    </div>
  );
}
