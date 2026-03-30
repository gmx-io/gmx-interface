import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { USD_DECIMALS } from "config/factors";
import { CLOSE_SIZE_DENOMINATION_KEY } from "config/localStorage";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { calculateDisplayDecimals, formatAmount, formatAmountFree, parseValue } from "lib/numbers";
import { bigMath } from "sdk/utils/bigmath";

interface UseCloseSizeInputParams {
  positionSizeInUsd: bigint | undefined;
  positionSizeInTokens: bigint | undefined;
  indexTokenDecimals: number;
  indexTokenSymbol: string;
  initialPercentage?: number;
  onCloseSizeUsdChange?: (usdString: string) => void;
}

interface UseCloseSizeInputReturn {
  closeSizeInput: string;
  closeSizeUsd: bigint;
  closePercentage: number;
  showSizeInTokens: boolean;
  closeSizeLabel: string;
  formattedMaxCloseSize: string;
  handleInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleSliderChange: (percent: number) => void;
  handleSizeToggle: () => void;
  setMaxCloseSize: () => void;
  setFromUsdString: (usd: string) => void;
  reset: () => void;
}

const USD_DISPLAY_DECIMALS = 2;

export function useCloseSizeInput({
  positionSizeInUsd,
  positionSizeInTokens,
  indexTokenDecimals,
  indexTokenSymbol,
  initialPercentage,
  onCloseSizeUsdChange,
}: UseCloseSizeInputParams): UseCloseSizeInputReturn {
  const [showSizeInTokensRaw, setShowSizeInTokens] = useLocalStorageSerializeKey<boolean>(
    CLOSE_SIZE_DENOMINATION_KEY,
    false
  );
  const showSizeInTokens = showSizeInTokensRaw ?? false;

  const [trackedPercentage, setTrackedPercentage] = useState<number | null>(initialPercentage ?? null);
  const [manualInput, setManualInput] = useState("");

  const initialPercentageRef = useRef(initialPercentage);

  const safeSizeUsd = positionSizeInUsd ?? 0n;
  const safeSizeInTokens = positionSizeInTokens ?? 0n;

  const tokenDisplayDecimals = useMemo(
    () => calculateDisplayDecimals(safeSizeInTokens, indexTokenDecimals),
    [safeSizeInTokens, indexTokenDecimals]
  );

  const closeSizeInput = useMemo(() => {
    if (trackedPercentage !== null) {
      if (showSizeInTokens) {
        const size =
          trackedPercentage >= 100
            ? safeSizeInTokens
            : bigMath.mulDiv(safeSizeInTokens, BigInt(Math.max(0, trackedPercentage)), 100n);
        return formatAmount(size, indexTokenDecimals, tokenDisplayDecimals);
      } else {
        const size =
          trackedPercentage >= 100
            ? safeSizeUsd
            : bigMath.mulDiv(safeSizeUsd, BigInt(Math.max(0, trackedPercentage)), 100n);
        return formatAmount(size, USD_DECIMALS, USD_DISPLAY_DECIMALS);
      }
    }
    return manualInput;
  }, [
    trackedPercentage,
    showSizeInTokens,
    safeSizeUsd,
    safeSizeInTokens,
    indexTokenDecimals,
    tokenDisplayDecimals,
    manualInput,
  ]);

  const closeSizeUsd = useMemo(() => {
    if (trackedPercentage !== null) {
      if (safeSizeUsd === undefined || safeSizeUsd === 0n || trackedPercentage <= 0) return 0n;
      if (trackedPercentage >= 100) return safeSizeUsd;
      return bigMath.mulDiv(safeSizeUsd, BigInt(trackedPercentage), 100n);
    }
    if (!manualInput) return 0n;
    if (showSizeInTokens) {
      const parsedTokens = parseValue(manualInput, indexTokenDecimals);
      if (parsedTokens === undefined || parsedTokens === 0n || safeSizeInTokens === 0n) return 0n;
      return bigMath.mulDiv(parsedTokens, safeSizeUsd, safeSizeInTokens);
    }
    return parseValue(manualInput, USD_DECIMALS) ?? 0n;
  }, [trackedPercentage, manualInput, showSizeInTokens, safeSizeUsd, safeSizeInTokens, indexTokenDecimals]);

  const closePercentage = useMemo(() => {
    if (trackedPercentage !== null) return trackedPercentage;
    if (!manualInput) return 0;
    const maxSize = showSizeInTokens ? safeSizeInTokens : safeSizeUsd;
    const decimals = showSizeInTokens ? indexTokenDecimals : USD_DECIMALS;
    const parsed = parseValue(manualInput, decimals);
    if (parsed === undefined || parsed <= 0n || maxSize <= 0n) return 0;
    return Math.min(100, Math.max(0, Number(bigMath.mulDiv(parsed, 100n, maxSize))));
  }, [trackedPercentage, manualInput, showSizeInTokens, safeSizeUsd, safeSizeInTokens, indexTokenDecimals]);

  const closeSizeLabel = showSizeInTokens ? indexTokenSymbol : "USD";

  const formattedMaxCloseSize = useMemo(() => {
    if (showSizeInTokens) {
      return formatAmount(safeSizeInTokens, indexTokenDecimals, tokenDisplayDecimals);
    }
    return formatAmount(safeSizeUsd, USD_DECIMALS, USD_DISPLAY_DECIMALS);
  }, [showSizeInTokens, safeSizeUsd, safeSizeInTokens, indexTokenDecimals, tokenDisplayDecimals]);

  const onCloseSizeUsdChangeRef = useRef(onCloseSizeUsdChange);
  onCloseSizeUsdChangeRef.current = onCloseSizeUsdChange;
  useEffect(() => {
    onCloseSizeUsdChangeRef.current?.(formatAmountFree(closeSizeUsd, USD_DECIMALS, USD_DISPLAY_DECIMALS));
  }, [closeSizeUsd]);

  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setTrackedPercentage(null);
    setManualInput(e.target.value);
  }, []);

  const handleSliderChange = useCallback((percent: number) => {
    setTrackedPercentage(percent);
  }, []);

  const handleSizeToggle = useCallback(() => {
    const next = !showSizeInTokens;

    if (trackedPercentage === null && safeSizeUsd > 0n && safeSizeInTokens > 0n) {
      if (next) {
        const newTokenSize =
          closePercentage >= 100 ? safeSizeInTokens : bigMath.mulDiv(safeSizeInTokens, BigInt(closePercentage), 100n);
        setManualInput(formatAmount(newTokenSize, indexTokenDecimals, tokenDisplayDecimals));
      } else {
        const newUsdSize =
          closePercentage >= 100 ? safeSizeUsd : bigMath.mulDiv(safeSizeUsd, BigInt(closePercentage), 100n);
        setManualInput(formatAmount(newUsdSize, USD_DECIMALS, USD_DISPLAY_DECIMALS));
      }
    }
    setShowSizeInTokens(next);
  }, [
    showSizeInTokens,
    trackedPercentage,
    closePercentage,
    safeSizeUsd,
    safeSizeInTokens,
    indexTokenDecimals,
    tokenDisplayDecimals,
    setShowSizeInTokens,
  ]);

  const setMaxCloseSize = useCallback(() => {
    setTrackedPercentage(100);
  }, []);

  const setFromUsdString = useCallback(
    (usd: string) => {
      setTrackedPercentage(null);
      if (showSizeInTokens && safeSizeUsd > 0n) {
        const parsedUsd = parseValue(usd, USD_DECIMALS);
        if (parsedUsd !== undefined && parsedUsd > 0n) {
          const tokens = bigMath.mulDiv(parsedUsd, safeSizeInTokens, safeSizeUsd);
          setManualInput(formatAmount(tokens, indexTokenDecimals, tokenDisplayDecimals));
          return;
        }
      }
      setManualInput(usd);
    },
    [showSizeInTokens, safeSizeUsd, safeSizeInTokens, indexTokenDecimals, tokenDisplayDecimals]
  );

  const reset = useCallback(() => {
    const ip = initialPercentageRef.current;
    if (ip !== undefined) {
      setTrackedPercentage(ip);
    } else {
      setTrackedPercentage(null);
      setManualInput("");
    }
  }, []);

  return {
    closeSizeInput,
    closeSizeUsd,
    closePercentage,
    showSizeInTokens,
    closeSizeLabel,
    formattedMaxCloseSize,
    handleInputChange,
    handleSliderChange,
    handleSizeToggle,
    setMaxCloseSize,
    setFromUsdString,
    reset,
  };
}
