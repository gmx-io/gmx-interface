import noop from "lodash/noop";

import { useSelector } from "context/SyntheticsStateContext/utils";

import {
  selectPoolsDetailsFirstTokenAddress,
  selectPoolsDetailsFirstTokenInputValue,
  selectPoolsDetailsMarketOrGlvTokenInputValue,
  selectPoolsDetailsPaySource,
  selectPoolsDetailsSecondTokenAddress,
  selectPoolsDetailsSecondTokenInputValue,
  selectPoolsDetailsSetFirstTokenInputValue,
  selectPoolsDetailsSetMarketOrGlvTokenInputValue,
  selectPoolsDetailsSetSecondTokenInputValue,
  selectPoolsDetailsSetFirstTokenAddress,
  selectPoolsDetailsSetPaySource,
  selectPoolsDetailsSetSecondTokenAddress,
} from "./selectors";

export function usePoolsDetailsPaySource() {
  const value = useSelector(selectPoolsDetailsPaySource);
  const setter = useSelector(selectPoolsDetailsSetPaySource);
  return [value, setter] as const;
}

export function usePoolsDetailsFirstTokenAddress() {
  const value = useSelector(selectPoolsDetailsFirstTokenAddress);
  const setter = useSelector(selectPoolsDetailsSetFirstTokenAddress);
  return [value, (setter || noop) as Exclude<typeof setter, undefined>] as const;
}

export function usePoolsDetailsSecondTokenAddress() {
  const value = useSelector(selectPoolsDetailsSecondTokenAddress);
  const setter = useSelector(selectPoolsDetailsSetSecondTokenAddress);
  return [value, (setter || noop) as Exclude<typeof setter, undefined>] as const;
}

export function usePoolsDetailsFirstTokenInputValue() {
  const value = useSelector(selectPoolsDetailsFirstTokenInputValue);
  const setter = useSelector(selectPoolsDetailsSetFirstTokenInputValue);
  return [value, setter] as const;
}

export function usePoolsDetailsSecondTokenInputValue() {
  const value = useSelector(selectPoolsDetailsSecondTokenInputValue);
  const setter = useSelector(selectPoolsDetailsSetSecondTokenInputValue);
  return [value, setter] as const;
}

export function usePoolsDetailsMarketOrGlvTokenInputValue() {
  const value = useSelector(selectPoolsDetailsMarketOrGlvTokenInputValue);
  const setter = useSelector(selectPoolsDetailsSetMarketOrGlvTokenInputValue);
  return [value, setter] as const;
}

