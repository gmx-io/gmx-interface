import noop from "lodash/noop";

import { useSelector } from "context/SyntheticsStateContext/utils";

import {
  selectPoolsDetailsFirstTokenAddress,
  selectPoolsDetailsFirstTokenInputValue,
  selectPoolsDetailsFocusedInput,
  selectPoolsDetailsGlvOrMarketAddress,
  selectPoolsDetailsIsMarketForGlvSelectedManually,
  selectPoolsDetailsMarketOrGlvTokenInputValue,
  selectPoolsDetailsMode,
  selectPoolsDetailsOperation,
  selectPoolsDetailsPaySource,
  selectPoolsDetailsSecondTokenAddress,
  selectPoolsDetailsSecondTokenInputValue,
  selectPoolsDetailsSelectedMarketForGlv,
  selectPoolsDetailsSetFirstTokenInputValue,
  selectPoolsDetailsSetIsMarketForGlvSelectedManually,
  selectPoolsDetailsSetMarketOrGlvTokenInputValue,
  selectPoolsDetailsSetSecondTokenInputValue,
  selectSetFirstTokenAddress,
  selectSetFocusedInput,
  selectSetGlvOrMarketAddress,
  selectSetMode,
  selectSetOperation,
  selectSetPaySource,
  selectSetSecondTokenAddress,
  selectSetSelectedMarketForGlv,
} from "./selectors";

export function usePoolsDetailsFocusedInput() {
  const value = useSelector(selectPoolsDetailsFocusedInput);
  const setter = useSelector(selectSetFocusedInput);
  return [value, (setter || noop) as Exclude<typeof setter, undefined>] as const;
}

export function usePoolsDetailsPaySource() {
  const value = useSelector(selectPoolsDetailsPaySource);
  const setter = useSelector(selectSetPaySource);
  return [value, (setter || noop) as Exclude<typeof setter, undefined>] as const;
}

export function usePoolsDetailsFirstTokenAddress() {
  const value = useSelector(selectPoolsDetailsFirstTokenAddress);
  const setter = useSelector(selectSetFirstTokenAddress);
  return [value, (setter || noop) as Exclude<typeof setter, undefined>] as const;
}

export function usePoolsDetailsSecondTokenAddress() {
  const value = useSelector(selectPoolsDetailsSecondTokenAddress);
  const setter = useSelector(selectSetSecondTokenAddress);
  return [value, (setter || noop) as Exclude<typeof setter, undefined>] as const;
}

export function usePoolsDetailsFirstTokenInputValue() {
  const value = useSelector(selectPoolsDetailsFirstTokenInputValue);
  const setter = useSelector(selectPoolsDetailsSetFirstTokenInputValue);
  return [value, (setter || noop) as Exclude<typeof setter, undefined>] as const;
}

export function usePoolsDetailsSecondTokenInputValue() {
  const value = useSelector(selectPoolsDetailsSecondTokenInputValue);
  const setter = useSelector(selectPoolsDetailsSetSecondTokenInputValue);
  return [value, (setter || noop) as Exclude<typeof setter, undefined>] as const;
}

export function usePoolsDetailsMarketOrGlvTokenInputValue() {
  const value = useSelector(selectPoolsDetailsMarketOrGlvTokenInputValue);
  const setter = useSelector(selectPoolsDetailsSetMarketOrGlvTokenInputValue);
  return [value, (setter || noop) as Exclude<typeof setter, undefined>] as const;
}

export function usePoolsDetailsOperation() {
  const value = useSelector(selectPoolsDetailsOperation);
  const setter = useSelector(selectSetOperation);
  return [value, (setter || noop) as Exclude<typeof setter, undefined>] as const;
}

export function usePoolsDetailsMode() {
  const value = useSelector(selectPoolsDetailsMode);
  const setter = useSelector(selectSetMode);
  return [value, (setter || noop) as Exclude<typeof setter, undefined>] as const;
}

export function usePoolsDetailsGlvOrMarketAddress() {
  const value = useSelector(selectPoolsDetailsGlvOrMarketAddress);
  const setter = useSelector(selectSetGlvOrMarketAddress);
  return [value, (setter || noop) as Exclude<typeof setter, undefined>] as const;
}

export function usePoolsDetailsSelectedMarketForGlv() {
  const value = useSelector(selectPoolsDetailsSelectedMarketForGlv);
  const setter = useSelector(selectSetSelectedMarketForGlv);
  return [value, (setter || noop) as Exclude<typeof setter, undefined>] as const;
}

export function usePoolsDetailsIsMarketForGlvSelectedManually() {
  const value = useSelector(selectPoolsDetailsIsMarketForGlvSelectedManually);
  const setter = useSelector(selectPoolsDetailsSetIsMarketForGlvSelectedManually);
  return [value, (setter || noop) as Exclude<typeof setter, undefined>] as const;
}
