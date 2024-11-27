import useRouteQuery from "lib/useRouteQuery";
import { useMemo } from "react";

type UtmParams = {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
  utmString?: string;
};

export function useUtmParams() {
  const query = useRouteQuery();

  return useMemo(() => {
    const utmParams = ["source", "medium", "campaign", "term", "content"].reduce((acc, param) => {
      const value = query.get(`utm_${param}`);
      if (value && value.length < 50) {
        acc[param] = value;
      }
      return acc;
    }, {} as UtmParams);

    if (!utmParams.source) {
      return undefined;
    }

    const utmString = Object.entries(utmParams)
      .map(([key, value]) => `utm_${key}=${value}`)
      .join("&");

    return {
      ...utmParams,
      utmString,
    };
  }, [query]);
}
