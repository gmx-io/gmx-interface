import { useEffect, useState } from "react";

import { UTM_PARAMS_KEY } from "config/localStorage";
import { getSharedAnalyticsValue, setSharedAnalyticsValue } from "lib/userAnalytics/sharedStorage";
import useRouteQuery from "lib/useRouteQuery";

type UtmParams = {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
  utmString?: string;
};

const UTM_KEYS = ["source", "medium", "campaign", "term", "content"] as const;
const MAX_UTM_VALUE_LENGTH = 50;

function writeStoredUtmParams(params: UtmParams) {
  const value = JSON.stringify(params);
  try {
    window.localStorage.setItem(UTM_PARAMS_KEY, value);
  } catch {
    // noop
  }
  setSharedAnalyticsValue(UTM_PARAMS_KEY, value);
}

function getUtmString(params: UtmParams) {
  const query = new URLSearchParams();
  for (const key of UTM_KEYS) {
    if (params[key]) query.set(`utm_${key}`, params[key]!);
  }
  return query.toString();
}

export function captureUtmParams(query = new URLSearchParams(window.location.search)): UtmParams | undefined {
  const params = getStoredUtmParams() ?? {};
  for (const key of UTM_KEYS) {
    const value = query.get(`utm_${key}`);
    if (!params[key] && value && value.length < MAX_UTM_VALUE_LENGTH) {
      params[key] = value;
    }
  }

  const utmString = getUtmString(params);
  if (!utmString) return undefined;

  const next = { ...params, utmString };
  writeStoredUtmParams(next);
  return next;
}

export function useUtmParams() {
  const [storedUtmParams, setStoredUtmParams] = useState<UtmParams | undefined>(getStoredUtmParams);
  const query = useRouteQuery();

  useEffect(() => {
    const next = captureUtmParams(query);
    if (next?.utmString !== storedUtmParams?.utmString) {
      setStoredUtmParams(next);
    }
  }, [query, storedUtmParams?.utmString]);

  return storedUtmParams;
}

export function getStoredUtmParams(): UtmParams | undefined {
  const local = readUtmParams(() => window.localStorage.getItem(UTM_PARAMS_KEY));
  const shared = readUtmParams(() => getSharedAnalyticsValue(UTM_PARAMS_KEY));
  const params = { ...local, ...shared };
  const utmString = getUtmString(params);
  return utmString ? { ...params, utmString } : undefined;
}

function readUtmParams(read: () => string | null | undefined): UtmParams {
  try {
    const stored = JSON.parse(read() || "{}");
    const params: UtmParams = {};
    for (const key of UTM_KEYS) {
      const value = stored?.[key];
      if (typeof value === "string" && value && value.length < MAX_UTM_VALUE_LENGTH) params[key] = value;
    }
    return params;
  } catch {
    return {};
  }
}

export function getUtmProfileProps() {
  const params = getStoredUtmParams();
  const props: Partial<Record<`utm_${(typeof UTM_KEYS)[number]}`, string>> = {};
  for (const key of UTM_KEYS) {
    if (params?.[key]) props[`utm_${key}`] = params[key];
  }
  return props;
}
