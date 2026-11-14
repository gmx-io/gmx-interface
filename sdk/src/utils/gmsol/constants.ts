import { PRECISION } from "utils/numbers";

export const GMSOL_PRECISION = 10n ** 20n;
export const GMSOL_PRECISION_SCALE = PRECISION / GMSOL_PRECISION;
export const GMSOL_MAX_UNSIGNED = (1n << 128n) - 1n;
export const GMSOL_MAX_SIGNED = (1n << 127n) - 1n;
export const GMSOL_MAX_IMPACT_EXPONENT = 128n * PRECISION;
