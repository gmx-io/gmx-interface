import { showNewMessage } from "@intercom/messenger-js-sdk";
import { Trans } from "@lingui/macro";
import { ReactNode, useCallback } from "react";

import { getRequestId, metrics } from "lib/metrics";
import { tradingErrorTracker } from "lib/tradingErrorTracker";
import { ErrorData, parseError } from "sdk/utils/errors";

import SupportChatIcon from "img/ic_support_chat.svg?react";

function isErrorData(value: unknown): value is ErrorData {
  return typeof value === "object" && value !== null && "errorMessage" in value && "errorGroup" in value;
}

export function ErrorToastWithSupport({ children }: { children: ReactNode }) {
  const handleContactSupport = useCallback(() => {
    const error = tradingErrorTracker.getLatestError();
    const debugLogId = getRequestId();
    let parsedError: ErrorData | undefined;

    if (error?.errorData) {
      parsedError = isErrorData(error.errorData) ? error.errorData : parseError(error.errorData);
    }

    metrics.pushEvent({
      event: "support.debugLog",
      isError: true,
      data: {
        debugLogId,
        requestId: error?.requestId ?? "N/A",
        metricId: error?.metricId ?? "N/A",
        actionName: error?.actionName ?? "N/A",
        collateral: error?.collateral ?? "N/A",
        ...parsedError,
      },
    });

    const lines = [
      "⚠️  GMX Support Request",
      "",
      `• Action: ${error?.actionName ?? "N/A"}`,
      `• Collateral: ${error?.collateral ?? "N/A"}`,
      `• Wallet address: ${error?.walletAddress ?? "N/A"}`,
      `• Wallet Provider: ${error?.walletProvider ?? "N/A"}`,
      `• Connected Network: ${error?.network ?? "N/A"}`,
      `• Request ID: ${error?.requestId ?? "N/A"}`,
      `• Metric ID: ${error?.metricId ?? "N/A"}`,
      `• Debug Log ID: ${debugLogId}`,
      "",
      "*** Please describe what happened and any additional details that may help us investigate ***",
    ];

    showNewMessage(lines.join("\n"));
  }, []);

  return (
    <div>
      {children}
      <hr className="my-8 -ml-12 -mr-32 h-[0.5px] border-none bg-red-100/20" />
      <div>
        <div className="text-body-medium text-typography-primary">
          <Trans>If you're having trouble completing this action, our team can help.</Trans>
        </div>
        <div
          className="mt-4 inline-flex cursor-pointer items-center gap-4 text-red-100 hover:text-red-400"
          onClick={handleContactSupport}
        >
          <Trans>Contact Support</Trans>
          <SupportChatIcon className="size-16" />
        </div>
      </div>
    </div>
  );
}
