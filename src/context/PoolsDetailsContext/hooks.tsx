import noop from "lodash/noop";

import { useSelector } from "context/SyntheticsStateContext/utils";

import {
  selectPoolsDetailsFirstTokenAddress,
  selectPoolsDetailsFirstTokenInputValue,
  selectPoolsDetailsGlvOrMarketAddress,
  selectPoolsDetailsMarketOrGlvTokenInputValue,
  selectPoolsDetailsMode,
  selectPoolsDetailsOperation,
  selectPoolsDetailsPaySource,
  selectPoolsDetailsSecondTokenAddress,
  selectPoolsDetailsSecondTokenInputValue,
  selectPoolsDetailsSelectedMarketAddressForGlv,
  selectPoolsDetailsSetFirstTokenInputValue,
  selectPoolsDetailsSetMarketOrGlvTokenInputValue,
  selectPoolsDetailsSetSecondTokenInputValue,
  selectPoolsDetailsSetFirstTokenAddress,
  selectPoolsDetailsSetGlvOrMarketAddress,
  selectPoolsDetailsSetMode,
  selectPoolsDetailsSetOperation,
  selectPoolsDetailsSetPaySource,
  selectPoolsDetailsSetSecondTokenAddress,
  selectPoolsDetailsSetSelectedMarketAddressForGlv,
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

export function usePoolsDetailsOperation() {
  const value = useSelector(selectPoolsDetailsOperation);
  const setter = useSelector(selectPoolsDetailsSetOperation);
  return [value, setter] as const;
}

export function usePoolsDetailsMode() {
  const value = useSelector(selectPoolsDetailsMode);
  const setter = useSelector(selectPoolsDetailsSetMode);
  return [value, setter] as const;
}

export function usePoolsDetailsGlvOrMarketAddress() {
  const value = useSelector(selectPoolsDetailsGlvOrMarketAddress);
  const setter = useSelector(selectPoolsDetailsSetGlvOrMarketAddress);
  return [value, setter] as const;
}

export function usePoolsDetailsSelectedMarketForGlv() {
  const value = useSelector(selectPoolsDetailsSelectedMarketAddressForGlv);
  const setter = useSelector(selectPoolsDetailsSetSelectedMarketAddressForGlv);
  return [value, setter] as const;
}
