import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { USD_DECIMALS } from "config/factors";
import { CLOSE_SIZE_DENOMINATION_KEY } from "config/localStorage";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { formatAmount, formatAmountFree, parseValue } from "lib/numbers";
import { bigMath } from "sdk/utils/bigmath";

interface UseCloseSizeInputParams {
  positionSizeInUsd: bigint | undefined;
  positionSizeInTokens: bigint | undefined;
  indexTokenDecimals: number;
  indexTokenSymbol: string;
  /** If set, starts in percentage tracking mode (e.g., 100 for PositionSeller/TPSL) */
  initialPercentage?: number;
  /** Called whenever the computed closeSizeUsd changes — for syncing to external state */
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

const TOKEN_DISPLAY_DECIMALS = 4;
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

  // When not null, input value is derived from percentage * positionSize
  const [trackedPercentage, setTrackedPercentage] = useState<number | null>(initialPercentage ?? null);
  // Raw user input, used when trackedPercentage is null (manual mode)
  const [manualInput, setManualInput] = useState("");

  const initialPercentageRef = useRef(initialPercentage);

  const safeSizeUsd = positionSizeInUsd ?? 0n;
  const safeSizeInTokens = positionSizeInTokens ?? 0n;

  // Derive display input from percentage + position size
  const closeSizeInput = useMemo(() => {
    if (trackedPercentage !== null) {
      if (showSizeInTokens) {
        const size =
          trackedPercentage >= 100
            ? safeSizeInTokens
            : bigMath.mulDiv(safeSizeInTokens, BigInt(Math.max(0, trackedPercentage)), 100n);
        return formatAmount(size, indexTokenDecimals, TOKEN_DISPLAY_DECIMALS);
      } else {
        const size =
          trackedPercentage >= 100
            ? safeSizeUsd
            : bigMath.mulDiv(safeSizeUsd, BigInt(Math.max(0, trackedPercentage)), 100n);
        return formatAmount(size, USD_DECIMALS, USD_DISPLAY_DECIMALS);
      }
    }
    return manualInput;
  }, [trackedPercentage, showSizeInTokens, safeSizeUsd, safeSizeInTokens, indexTokenDecimals, manualInput]);

  // Compute closeSizeUsd (bigint) for domain layer
  const closeSizeUsd = useMemo(() => {
    if (trackedPercentage !== null) {
      if (safeSizeUsd === undefined || safeSizeUsd === 0n || trackedPercentage <= 0) return 0n;
      if (trackedPercentage >= 100) return safeSizeUsd;
      return bigMath.mulDiv(safeSizeUsd, BigInt(trackedPercentage), 100n);
    }
    // Manual mode
    if (!manualInput) return 0n;
    if (showSizeInTokens) {
      const parsedTokens = parseValue(manualInput, indexTokenDecimals);
      if (parsedTokens === undefined || parsedTokens === 0n || safeSizeInTokens === 0n) return 0n;
      return bigMath.mulDiv(parsedTokens, safeSizeUsd, safeSizeInTokens);
    }
    return parseValue(manualInput, USD_DECIMALS) ?? 0n;
  }, [trackedPercentage, manualInput, showSizeInTokens, safeSizeUsd, safeSizeInTokens, indexTokenDecimals]);

  // Derive percentage for slider
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
      return formatAmount(safeSizeInTokens, indexTokenDecimals, TOKEN_DISPLAY_DECIMALS);
    }
    return formatAmount(safeSizeUsd, USD_DECIMALS, USD_DISPLAY_DECIMALS);
  }, [showSizeInTokens, safeSizeUsd, safeSizeInTokens, indexTokenDecimals]);

  // Sync closeSizeUsd to external state
  const onCloseSizeUsdChangeRef = useRef(onCloseSizeUsdChange);
  onCloseSizeUsdChangeRef.current = onCloseSizeUsdChange;
  useEffect(() => {
    onCloseSizeUsdChangeRef.current?.(formatAmountFree(closeSizeUsd, USD_DECIMALS, USD_DISPLAY_DECIMALS));
  }, [closeSizeUsd]);

  // User types in input → switch to manual mode
  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setTrackedPercentage(null);
    setManualInput(e.target.value);
  }, []);

  // Slider change → switch to percentage tracking mode
  const handleSliderChange = useCallback((percent: number) => {
    setTrackedPercentage(percent);
  }, []);

  // Toggle between USD and token denomination
  const handleSizeToggle = useCallback(() => {
    const next = !showSizeInTokens;

    if (trackedPercentage === null) {
      // In manual mode, convert the value using current percentage as intermediary
      if (next) {
        // USD → tokens: use percentage to compute token amount
        const newTokenSize =
          closePercentage >= 100 ? safeSizeInTokens : bigMath.mulDiv(safeSizeInTokens, BigInt(closePercentage), 100n);
        setManualInput(formatAmount(newTokenSize, indexTokenDecimals, TOKEN_DISPLAY_DECIMALS));
      } else {
        // Tokens → USD: use percentage to compute USD amount
        const newUsdSize =
          closePercentage >= 100 ? safeSizeUsd : bigMath.mulDiv(safeSizeUsd, BigInt(closePercentage), 100n);
        setManualInput(formatAmount(newUsdSize, USD_DECIMALS, USD_DISPLAY_DECIMALS));
      }
    }
    // In percentage mode, value auto-recomputes from percentage — just toggle
    setShowSizeInTokens(next);
  }, [
    showSizeInTokens,
    trackedPercentage,
    closePercentage,
    safeSizeUsd,
    safeSizeInTokens,
    indexTokenDecimals,
    setShowSizeInTokens,
  ]);

  const setMaxCloseSize = useCallback(() => {
    setTrackedPercentage(100);
  }, []);

  // Programmatic set from a USD string (for OrderEditor init)
  const setFromUsdString = useCallback(
    (usd: string) => {
      setTrackedPercentage(null);
      if (showSizeInTokens && safeSizeUsd > 0n) {
        // Convert USD string to token string for display
        const parsedUsd = parseValue(usd, USD_DECIMALS);
        if (parsedUsd !== undefined && parsedUsd > 0n) {
          const tokens = bigMath.mulDiv(parsedUsd, safeSizeInTokens, safeSizeUsd);
          setManualInput(formatAmount(tokens, indexTokenDecimals, TOKEN_DISPLAY_DECIMALS));
          return;
        }
      }
      setManualInput(usd);
    },
    [showSizeInTokens, safeSizeUsd, safeSizeInTokens, indexTokenDecimals]
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
