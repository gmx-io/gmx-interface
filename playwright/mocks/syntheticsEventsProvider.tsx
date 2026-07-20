import type { ReactNode } from "react";

import { emptySyntheticsEventsState } from "domain/testUtils/emptySyntheticsEventsState";

/**
 * Replaces the websocket-driven SyntheticsEventsProvider in CT builds with its idle
 * state (no pending events). All setters are noops, so transaction/approval event
 * flows are not observable in CT; inject approvalStatuses here to test approve states.
 */

export function useSyntheticsEvents() {
  return emptySyntheticsEventsState;
}

export function SyntheticsEventsProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
