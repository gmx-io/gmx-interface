import { useEffect, useState } from "react";

import { UTM_PARAMS_KEY } from "config/localStorage";
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
  try {
    window.localStorage.setItem(UTM_PARAMS_KEY, JSON.stringify(params));
  } catch {
    // noop
  }
}

export function useUtmParams() {
  const [storedUtmParams, setStoredUtmParams] = useState<UtmParams | undefined>(getStoredUtmParams);
  const query = useRouteQuery();

  useEffect(() => {
    const utmParams = UTM_KEYS.reduce((acc, param) => {
      const value = query.get(`utm_${param}`);
      if (value && value.length < MAX_UTM_VALUE_LENGTH) {
        acc[param] = value;
      }
      return acc;
    }, {} as UtmParams);

    const utmString = Object.entries(utmParams)
      .map(([key, value]) => `utm_${key}=${value}`)
      .join("&");

    if (utmString.length && utmString !== storedUtmParams?.utmString) {
      const next: UtmParams = { ...utmParams, utmString };
      writeStoredUtmParams(next);
      setStoredUtmParams(next);
    }
  }, [query, storedUtmParams?.utmString]);

  return storedUtmParams;
}

export function getStoredUtmParams(): UtmParams | undefined {
  try {
    const storedParams = window.localStorage.getItem(UTM_PARAMS_KEY);
    if (!storedParams) return undefined;
    return JSON.parse(storedParams) as UtmParams;
  } catch {
    return undefined;
  }
}
