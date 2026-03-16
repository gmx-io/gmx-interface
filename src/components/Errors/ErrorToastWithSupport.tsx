import { showNewMessage } from "@intercom/messenger-js-sdk";
import { Trans } from "@lingui/macro";
import { ReactNode, useCallback } from "react";

import { tradingErrorTracker } from "lib/tradingErrorTracker";

import SupportChatIcon from "img/ic_support_chat.svg?react";

export function ErrorToastWithSupport({ children }: { children: ReactNode }) {
  const handleContactSupport = useCallback(() => {
    const error = tradingErrorTracker.getLatestError();

    const lines = [
      "GMX support request",
      `– Action: ${error?.actionName ?? "N/A"}`,
      `– Collateral: ${error?.collateral ?? "N/A"}`,
      `– Wallet address: ${error?.walletAddress ?? "N/A"}`,
      `– Wallet Provider: ${error?.walletProvider ?? "N/A"}`,
      `– Connected Network: ${error?.network ?? "N/A"}`,
      `– Error data: ${error?.errorData ?? "N/A"}`,
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
