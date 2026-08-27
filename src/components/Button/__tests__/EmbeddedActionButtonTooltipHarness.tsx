import { useState } from "react";

const WRAPPER_STYLE = { padding: 60 };

import { EmbeddedActionButton } from "components/Button/EmbeddedActionButton";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

/** Mirrors how OrderItem renders a remediation phrase: focusable handle, action inside the tooltip. */
export function EmbeddedActionButtonTooltipHarness() {
  const [count, setCount] = useState(0);

  return (
    <div style={WRAPPER_STYLE}>
      <TooltipWithPortal
        variant="none"
        handle={
          <span tabIndex={0} className="cursor-help underline">
            Order may not execute
          </span>
        }
        content={
          <span>
            Order may not execute: the resulting position would be liquidatable at the trigger price.{" "}
            <EmbeddedActionButton onClick={() => setCount((value) => value + 1)}>Deposit margin</EmbeddedActionButton>{" "}
            or reduce the order size.
          </span>
        }
      />
      <div>activated: {count}</div>
    </div>
  );
}
