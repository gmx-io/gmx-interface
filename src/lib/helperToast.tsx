import { toast, ToastContent, ToastOptions } from "react-toastify";

import { getIsSolanaNetworkSelected } from "config/solanaNetwork";

import { ErrorToastWithSupport } from "components/Errors/ErrorToastWithSupport";

import { tradingErrorTracker, TradingErrorInfo } from "./tradingErrorTracker";

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

    if (tradingErrorInfo && !isUserRejection) {
      tradingErrorTracker.reportError(tradingErrorInfo);
    }

    // The support chat is not booted on Solana, so "Contact support" would open nothing there.
    const finalContent =
      tradingErrorInfo &&
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
