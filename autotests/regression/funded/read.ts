import { withRetry } from "viem";

import { fundedErrorMessage, fundedNetworkFailure } from "./errors";

// Only pass reads here; submission recovery belongs to the durable action journal.
export async function readFundedData<T>(operation: string, read: () => Promise<T>): Promise<T> {
  let attempts = 0;
  try {
    return await withRetry(
      () => {
        attempts++;
        return read();
      },
      {
        retryCount: 2,
        delay: ({ count }) => 500 * (count + 1),
        shouldRetry: ({ error }) => fundedNetworkFailure(error)?.retryable === true,
      }
    );
  } catch (error) {
    throw new Error(`${operation} failed after ${attempts} attempt(s): ${fundedErrorMessage(error)}`);
  }
}
