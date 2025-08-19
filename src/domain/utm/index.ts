import { useEffect } from "react";

import { UTM_PARAMS_KEY } from "config/localStorage";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import useRouteQuery from "lib/useRouteQuery";

type UtmParams = {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
  utmString?: string;
};

export function useUtmParams() {
  const [storedUtmParams, setStoredUtmParams] = useLocalStorageSerializeKey<UtmParams | undefined>(
    UTM_PARAMS_KEY,
    undefined
  );
  const query = useRouteQuery();

  useEffect(() => {
    const utmParams = ["source", "medium", "campaign", "term", "content"].reduce((acc, param) => {
      const value = query.get(`utm_${param}`);
      if (value && value.length < 50) {
        acc[param] = value;
      }
      return acc;
    }, {} as UtmParams);

    const utmString = Object.entries(utmParams)
      .map(([key, value]) => `utm_${key}=${value}`)
      .join("&");

    if (utmString.length && utmString !== storedUtmParams?.utmString) {
      setStoredUtmParams({
        ...utmParams,
        utmString,
      });
    }
  }, [query, setStoredUtmParams, storedUtmParams?.utmString]);

  return storedUtmParams;
}

export function getStoredUtmParams(): UtmParams | undefined {
  const storedParams = window.localStorage.getItem(UTM_PARAMS_KEY);

  if (!storedParams) {
    return undefined;
  }

  try {
    return JSON.parse(storedParams);
  } catch (e) {
    return undefined;
  }
}
