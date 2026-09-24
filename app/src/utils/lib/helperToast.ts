import { toast, ToastContent, ToastOptions } from 'react-toastify';

/**
 * Helper object for displaying toast notifications.
 */
export const helperToast = {
  /**
   * Displays a success toast notification.
   * @param {ToastContent} content - The content of the toast.
   * @param {ToastOptions} [opts] - Optional configuration for the toast.
   */
  success: (content: ToastContent, opts?: ToastOptions) => {
    toast.dismiss();
    toast.success(content, opts);
  },

  /**
   * Displays an error toast notification.
   * @param {ToastContent} content - The content of the toast.
   * @param {ToastOptions} [opts] - Optional configuration for the toast.
   */
  error: (content: ToastContent, opts?: ToastOptions) => {
    toast.dismiss();
    toast.error(content, opts);
  },

  /**
   * Displays an info toast notification.
   * @param {ToastContent} content - The content of the toast.
   * @param {ToastOptions} [opts] - Optional configuration for the toast.
   */
  info: (content: ToastContent, opts?: ToastOptions) => {
    toast.dismiss();
    toast(content, opts);
  },
};
