import { PRECISION } from "utils/numbers";

import type { GmsolSide } from "./types";

export const GMSOL_PRECISION = 10n ** 20n;
export const GMSOL_PRECISION_SCALE = PRECISION / GMSOL_PRECISION;
export const GMSOL_MAX_UNSIGNED = (1n << 128n) - 1n;
export const GMSOL_MAX_SIGNED = (1n << 127n) - 1n;
export const GMSOL_MAX_IMPACT_EXPONENT = 128n * PRECISION;

export const GMSOL_LONG: GmsolSide = 0;
export const GMSOL_SHORT: GmsolSide = 1;
export const GMSOL_SIDES: readonly GmsolSide[] = [GMSOL_LONG, GMSOL_SHORT];
