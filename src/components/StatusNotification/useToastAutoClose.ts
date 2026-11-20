import { useEffect } from "react";
import { toast } from "react-toastify";

import { TOAST_AUTO_CLOSE_TIME } from "config/ui";

export const useToastAutoClose = (
  isCompleted: boolean,
  toastTimestamp: number,
  autoCloseTime = TOAST_AUTO_CLOSE_TIME
) => {
  useEffect(
    function autoClose() {
      let timerId: ReturnType<typeof setTimeout>;

      if (isCompleted) {
        timerId = setTimeout(() => {
          toast.dismiss(toastTimestamp);
        }, autoCloseTime);
      }

      return () => {
        clearTimeout(timerId);
      };
    },
    [autoCloseTime, isCompleted, toastTimestamp]
  );
};
