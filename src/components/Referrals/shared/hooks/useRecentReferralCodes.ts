import { useCallback } from "react";
import { createGlobalState } from "react-use";

const useRecentReferralCodesState = createGlobalState<string[]>([]);

export function useRecentReferralCodes() {
  const [recentCodes, setRecentCodes] = useRecentReferralCodesState();

  const addRecentCode = useCallback(
    (code: string) => {
      const trimmedCode = code.trim();
      if (!trimmedCode) return;

      setRecentCodes((prev) => (prev.includes(trimmedCode) ? prev : [...prev, trimmedCode]));
    },
    [setRecentCodes]
  );

  return { recentCodes, addRecentCode };
}
