import { useEffect, useState } from 'react';

export type StatsJsonItem = {
  value: string;
  detail: Record<string, string>;
};

export type StatsJson = Record<string, StatsJsonItem>;

const STATS_JSON_URL = 'https://r2.gmtrade.xyz/common/stats-new.json';
const STATS_CACHE_KEY = 'gmtrade:stats-new-json';

let memoryCache: StatsJson | undefined;
let requestPromise: Promise<StatsJson> | undefined;

function readPersistentCache(): StatsJson | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const cached = window.localStorage.getItem(STATS_CACHE_KEY);
    return cached ? (JSON.parse(cached) as StatsJson) : undefined;
  } catch {
    return undefined;
  }
}

function writePersistentCache(data: StatsJson) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STATS_CACHE_KEY, JSON.stringify(data));
  } catch {
    // Continue using the in-memory cache when persistent storage is unavailable.
  }
}

function fetchStats(): Promise<StatsJson> {
  if (requestPromise !== undefined) return requestPromise;

  requestPromise = fetch(STATS_JSON_URL)
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<StatsJson>;
    })
    .then((data) => {
      memoryCache = data;
      writePersistentCache(data);
      return data;
    })
    .catch((error) => {
      requestPromise = undefined;
      throw error;
    });

  return requestPromise;
}

export function useStatsJson() {
  const [data, setData] = useState<StatsJson>(
    () => memoryCache ?? readPersistentCache() ?? {}
  );

  useEffect(() => {
    let cancelled = false;
    fetchStats()
      .then((nextData) => {
        if (!cancelled) setData(nextData);
      })
      .catch((error) => {
        console.warn('[Stats] Failed to fetch stats JSON:', error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}
