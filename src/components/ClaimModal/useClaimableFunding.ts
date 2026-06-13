import { useCallback, useEffect, useMemo, useState } from "react";

import { useMarketsInfoData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { MarketInfo, getIsFundingClaimInsufficientBalance } from "domain/synthetics/markets";
import { convertToUsd } from "domain/synthetics/tokens";

export const MAX_CLAIM_FUNDING_ENTRIES_PER_TXN = 20;

export type ClaimFundingEntry = {
  marketAddress: string;
  tokenAddress: string;
};

export type ClaimFundingRow = {
  market: MarketInfo;
  marketTokenAddress: string;
  eligibleEntries: ClaimFundingEntry[];
};

export function useClaimableFunding(markets: MarketInfo[]) {
  return useMemo(() => {
    let totalClaimableFundingUsd = 0n;
    let claimableFundingUsd = 0n;
    let hasInsufficientBalance = false;
    let hasClaimable = false;

    for (const market of markets) {
      const { longToken, shortToken } = market;

      const fundingLongUsd = convertToUsd(
        market.claimableFundingAmountLong,
        longToken.decimals,
        longToken.prices.minPrice
      );
      const fundingShortUsd = convertToUsd(
        market.claimableFundingAmountShort,
        shortToken.decimals,
        shortToken.prices.minPrice
      );

      const marketTotal = (fundingLongUsd ?? 0n) + (fundingShortUsd ?? 0n);
      totalClaimableFundingUsd += marketTotal;

      const longInsufficient = getIsFundingClaimInsufficientBalance(market, true);
      const shortInsufficient = getIsFundingClaimInsufficientBalance(market, false);

      if (longInsufficient || shortInsufficient) {
        hasInsufficientBalance = true;
      }

      if (!longInsufficient) {
        claimableFundingUsd += fundingLongUsd ?? 0n;
      }
      if (!shortInsufficient) {
        claimableFundingUsd += fundingShortUsd ?? 0n;
      }
      if ((!longInsufficient && (fundingLongUsd ?? 0n) > 0n) || (!shortInsufficient && (fundingShortUsd ?? 0n) > 0n)) {
        hasClaimable = true;
      }
    }

    return {
      totalClaimableFundingUsd,
      claimableFundingUsd,
      hasInsufficientBalance,
      allInsufficient: hasInsufficientBalance && !hasClaimable,
    };
  }, [markets]);
}

function getEligibleEntries(market: MarketInfo): ClaimFundingEntry[] {
  if (market.isDisabled) return [];
  const entries: ClaimFundingEntry[] = [];

  const longEligible =
    market.claimableFundingAmountLong !== undefined &&
    market.claimableFundingAmountLong !== 0n &&
    !getIsFundingClaimInsufficientBalance(market, true);

  const shortEligible =
    market.claimableFundingAmountShort !== undefined &&
    market.claimableFundingAmountShort !== 0n &&
    !getIsFundingClaimInsufficientBalance(market, false);

  if (longEligible) {
    entries.push({ marketAddress: market.marketTokenAddress, tokenAddress: market.longTokenAddress });
  }

  if (shortEligible && (!longEligible || market.shortTokenAddress !== market.longTokenAddress)) {
    entries.push({ marketAddress: market.marketTokenAddress, tokenAddress: market.shortTokenAddress });
  }

  return entries;
}

export type ClaimFundingSelection = {
  rows: ClaimFundingRow[];
  selectedEntries: ClaimFundingEntry[];
  selectedEntryCount: number;
  isRowSelected: (marketTokenAddress: string) => boolean;
  isRowToggleable: (marketTokenAddress: string) => boolean;
  toggleRow: (marketTokenAddress: string) => void;
  isLimitReached: boolean;
};

export function useClaimableFundingSelection(isVisible: boolean): ClaimFundingSelection {
  const marketsInfoData = useMarketsInfoData();

  const rows: ClaimFundingRow[] = useMemo(() => {
    if (!isVisible) return [];
    return Object.values(marketsInfoData || {}).map((market) => ({
      market,
      marketTokenAddress: market.marketTokenAddress,
      eligibleEntries: getEligibleEntries(market),
    }));
  }, [isVisible, marketsInfoData]);

  const eligibleRows = useMemo(() => rows.filter((row) => row.eligibleEntries.length > 0), [rows]);

  const preselectedKeys = useMemo(() => {
    const result = new Set<string>();
    let count = 0;
    for (const row of eligibleRows) {
      const nextCount = count + row.eligibleEntries.length;
      if (nextCount > MAX_CLAIM_FUNDING_ENTRIES_PER_TXN) continue;
      result.add(row.marketTokenAddress);
      count = nextCount;
    }
    return result;
  }, [eligibleRows]);

  const [touched, setTouched] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isVisible) {
      setTouched(false);
      setSelectedKeys(new Set());
    }
  }, [isVisible]);

  useEffect(() => {
    if (touched) return;
    setSelectedKeys(preselectedKeys);
  }, [preselectedKeys, touched]);

  const selectedEntries = useMemo(() => {
    const entries: ClaimFundingEntry[] = [];
    for (const row of eligibleRows) {
      if (selectedKeys.has(row.marketTokenAddress)) {
        entries.push(...row.eligibleEntries);
      }
    }
    return entries;
  }, [eligibleRows, selectedKeys]);

  const selectedEntryCount = selectedEntries.length;

  const isRowSelected = useCallback(
    (marketTokenAddress: string) => selectedKeys.has(marketTokenAddress),
    [selectedKeys]
  );

  const isRowToggleable = useCallback(
    (marketTokenAddress: string) => {
      const row = eligibleRows.find((r) => r.marketTokenAddress === marketTokenAddress);
      if (!row) return false;
      if (selectedKeys.has(marketTokenAddress)) return true;
      return selectedEntryCount + row.eligibleEntries.length <= MAX_CLAIM_FUNDING_ENTRIES_PER_TXN;
    },
    [eligibleRows, selectedKeys, selectedEntryCount]
  );

  const toggleRow = useCallback(
    (marketTokenAddress: string) => {
      const row = eligibleRows.find((r) => r.marketTokenAddress === marketTokenAddress);
      if (!row) return;
      setTouched(true);
      setSelectedKeys((prev) => {
        const next = new Set(prev);
        if (next.has(marketTokenAddress)) {
          next.delete(marketTokenAddress);
          return next;
        }
        let count = 0;
        for (const r of eligibleRows) {
          if (next.has(r.marketTokenAddress)) count += r.eligibleEntries.length;
        }
        if (count + row.eligibleEntries.length > MAX_CLAIM_FUNDING_ENTRIES_PER_TXN) {
          return prev;
        }
        next.add(marketTokenAddress);
        return next;
      });
    },
    [eligibleRows]
  );

  const isLimitReached = useMemo(() => {
    let hasUnselectedEligible = false;
    for (const row of eligibleRows) {
      if (selectedKeys.has(row.marketTokenAddress)) continue;
      hasUnselectedEligible = true;
      if (selectedEntryCount + row.eligibleEntries.length <= MAX_CLAIM_FUNDING_ENTRIES_PER_TXN) {
        return false;
      }
    }
    return hasUnselectedEligible;
  }, [eligibleRows, selectedKeys, selectedEntryCount]);

  return {
    rows,
    selectedEntries,
    selectedEntryCount,
    isRowSelected,
    isRowToggleable,
    toggleRow,
    isLimitReached,
  };
}
