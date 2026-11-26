import { toast, ToastContent, ToastOptions } from "react-toastify";

import { getIsSolanaNetworkSelected } from "config/solanaNetwork";
import { WALLET_BATCH_CONFIRMED_LATE_ERROR, WALLET_BATCH_PENDING_ERROR } from "lib/errors/customErrors";

import { ErrorToastWithSupport } from "components/Errors/ErrorToastWithSupport";

import { tradingErrorTracker, TradingErrorInfo } from "./tradingErrorTracker";

const WALLET_BATCH_NOTICE_ERRORS = [WALLET_BATCH_PENDING_ERROR, WALLET_BATCH_CONFIRMED_LATE_ERROR];

export type HelperToastErrorOptions = ToastOptions & {
  tradingErrorInfo?: TradingErrorInfo;
};

export const helperToast = {
  success: (content: ToastContent, opts?: ToastOptions) => {
    toast.dismiss();
    toast.success(content, opts);
  },
  error: (content: ToastContent, opts?: HelperToastErrorOptions) => {
    toast.dismiss();

    const { tradingErrorInfo, ...toastOpts } = opts ?? {};

    const isUserRejection =
      tradingErrorInfo?.errorData &&
      typeof tradingErrorInfo.errorData === "object" &&
      "isUserRejectedError" in tradingErrorInfo.errorData &&
      (tradingErrorInfo.errorData as { isUserRejectedError?: boolean }).isUserRejectedError === true;

    // these say what happened to an earlier batch, so they aren't trouble to offer support for
    const isWalletBatchNotice =
      tradingErrorInfo?.errorData &&
      typeof tradingErrorInfo.errorData === "object" &&
      "errorMessage" in tradingErrorInfo.errorData &&
      WALLET_BATCH_NOTICE_ERRORS.includes((tradingErrorInfo.errorData as { errorMessage?: string }).errorMessage ?? "");

    if (tradingErrorInfo && !isUserRejection && !isWalletBatchNotice) {
      tradingErrorTracker.reportError(tradingErrorInfo);
    }

    // The support chat is not booted on Solana, so "Contact support" would open nothing there.
    const finalContent =
      tradingErrorInfo &&
      !isWalletBatchNotice &&
      !getIsSolanaNetworkSelected() &&
      tradingErrorTracker.shouldSuggestSupport() &&
      typeof content !== "function" ? (
        <ErrorToastWithSupport>{content}</ErrorToastWithSupport>
      ) : (
        content
      );

    toast.error(finalContent, toastOpts);
  },
  info: (content: ToastContent, opts?: ToastOptions) => {
    toast.dismiss();
    toast(content, opts);
  },
  // updates the toast in place while it's shown instead of dismissing and showing it again
  infoOrUpdate: (content: ToastContent, toastId: string) => {
    if (toast.isActive(toastId)) {
      toast.update(toastId, { render: content });
    } else {
      helperToast.info(content, { toastId });
    }
  },
};
