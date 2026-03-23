import noop from "lodash/noop";

import { SyntheticsState } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { Mode, Operation } from "domain/synthetics/markets/types";
import { EMPTY_ARRAY } from "lib/objects";

export const PLATFORM_TOKEN_DECIMALS = 18;

const FALLBACK_STRING_SETTER = noop as (value: string) => void;
const FALLBACK_STRING_OR_UNDEFINED_SETTER = noop as (value: string | undefined) => void;
const FALLBACK_BOOLEAN_SETTER = noop as (value: boolean) => void;

export const selectPoolsDetailsGlvOrMarketAddress = (s: SyntheticsState) => s.poolsDetails?.glvOrMarketAddress;
export const selectPoolsDetailsSetGlvOrMarketAddress = (s: SyntheticsState) =>
  s.poolsDetails?.setGlvOrMarketAddress ?? FALLBACK_STRING_SETTER;

export const selectPoolsDetailsSelectedMarketAddressForGlv = (s: SyntheticsState) =>
  s.poolsDetails?.selectedMarketAddressForGlv;
export const selectPoolsDetailsSetSelectedMarketAddressForGlv = (s: SyntheticsState) =>
  s.poolsDetails?.setSelectedMarketAddressForGlv ?? FALLBACK_STRING_OR_UNDEFINED_SETTER;

export const selectPoolsDetailsFirstTokenAddress = (s: SyntheticsState) => s.poolsDetails?.firstTokenAddress;
export const selectPoolsDetailsSetFirstTokenAddress = (s: SyntheticsState) =>
  s.poolsDetails?.setFirstTokenAddress ??
  (noop as NonNullable<SyntheticsState["poolsDetails"]>["setFirstTokenAddress"]);

export const selectPoolsDetailsSecondTokenAddress = (s: SyntheticsState) => s.poolsDetails?.secondTokenAddress;
export const selectPoolsDetailsSetSecondTokenAddress = (s: SyntheticsState) =>
  s.poolsDetails?.setSecondTokenAddress ??
  (noop as NonNullable<SyntheticsState["poolsDetails"]>["setSecondTokenAddress"]);

export const selectPoolsDetailsOperation = (s: SyntheticsState) => s.poolsDetails?.operation ?? Operation.Deposit;
export const selectPoolsDetailsSetOperation = (s: SyntheticsState) =>
  s.poolsDetails?.setOperation ?? FALLBACK_STRING_SETTER;

export const selectPoolsDetailsMode = (s: SyntheticsState) => s.poolsDetails?.mode ?? Mode.Single;
export const selectPoolsDetailsSetMode = (s: SyntheticsState) => s.poolsDetails?.setMode ?? FALLBACK_STRING_SETTER;

export const selectPoolsDetailsFirstTokenInputValue = (s: SyntheticsState) =>
  s.poolsDetails?.firstTokenInputValue ?? "";
export const selectPoolsDetailsSetFirstTokenInputValue = (s: SyntheticsState) =>
  s.poolsDetails?.setFirstTokenInputValue ?? FALLBACK_STRING_SETTER;

export const selectPoolsDetailsSecondTokenInputValue = (s: SyntheticsState) =>
  s.poolsDetails?.secondTokenInputValue ?? "";
export const selectPoolsDetailsSetSecondTokenInputValue = (s: SyntheticsState) =>
  s.poolsDetails?.setSecondTokenInputValue ?? FALLBACK_STRING_SETTER;

export const selectPoolsDetailsMarketOrGlvTokenInputValue = (s: SyntheticsState) =>
  s.poolsDetails?.marketOrGlvTokenInputValue ?? "";
export const selectPoolsDetailsSetMarketOrGlvTokenInputValue = (s: SyntheticsState) =>
  s.poolsDetails?.setMarketOrGlvTokenInputValue ?? FALLBACK_STRING_SETTER;

export const selectPoolsDetailsFocusedInput = (s: SyntheticsState) => s.poolsDetails?.focusedInput ?? "market";
export const selectPoolsDetailsSetFocusedInput = (s: SyntheticsState) =>
  s.poolsDetails?.setFocusedInput ?? FALLBACK_STRING_SETTER;

export const selectPoolsDetailsPaySource = (s: SyntheticsState) => s.poolsDetails?.paySource ?? "settlementChain";
export const selectPoolsDetailsSetPaySource = (s: SyntheticsState) =>
  s.poolsDetails?.setPaySource ?? FALLBACK_STRING_SETTER;

export const selectPoolsDetailsIsMarketForGlvSelectedManually = (s: SyntheticsState) =>
  s.poolsDetails?.isMarketForGlvSelectedManually ?? false;
export const selectPoolsDetailsSetIsMarketForGlvSelectedManually = (s: SyntheticsState) =>
  s.poolsDetails?.setIsMarketForGlvSelectedManually ?? FALLBACK_BOOLEAN_SETTER;

export const selectPoolsDetailsWithdrawalMarketTokensData = (s: SyntheticsState) =>
  s.poolsDetails?.withdrawalMarketTokensData;
export const selectPoolsDetailsMultichainTokensArray = (s: SyntheticsState) =>
  s.poolsDetails?.multichainTokensResult?.tokenChainDataArray || EMPTY_ARRAY;
