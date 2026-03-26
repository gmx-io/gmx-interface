import { toast, ToastContent, ToastOptions } from "react-toastify";

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

    if (tradingErrorInfo) {
      tradingErrorTracker.reportError(tradingErrorInfo);
    }

    const finalContent =
      tradingErrorInfo && tradingErrorTracker.shouldSuggestSupport() && typeof content !== "function" ? (
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
};
