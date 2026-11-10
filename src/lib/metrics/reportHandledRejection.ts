import type { ErrorLike } from "sdk/utils/errors";

import { metrics } from "./Metrics";

// Submit flows show their own failure toast; this keeps the error in telemetry without an unhandled rejection.
export function reportHandledRejection(errorSource: string) {
  return (error: unknown) => {
    if (error) {
      metrics.pushError(error as ErrorLike | string, errorSource);
    }
  };
}
