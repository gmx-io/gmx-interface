/// <reference types="vite/client"/>

interface GMSOLDeployment {
  store: string;
  oracle: string;
  config: string;
  treasury_vault_config: string;
  market_tokens: string[];
  glv_tokens: string[];
  tokens: Tokens;
}

declare const __GMSOL_DEPLOYMENT__: GMSOLDeployment | null;
declare const __APP_VERSION__: string;
declare const __UI_BUILD_TIME__: string;

interface ImportMetaEnv {
  readonly VITE_HELIUS_RPC_URL?: string;
  readonly VITE_LOCAL_RPC_PROXY_ENDPOINT?: string;
  readonly VITE_GT_SQD_GRAPHQL_ENDPOINT?: string;
  readonly VITE_TOKENS?: string;
  readonly VITE_MARKET_TOKENS?: string;

  readonly VITE_NIGHTLY?: string;
  readonly VITE_FORCE_GRADUATED_FLAGS?: string;
  readonly VITE_EXPERIMENTAL?: string;
  // Feature flags (base keys for nightly gating; _PASS keys for production-graduated flags)
  readonly FEATURE_NIGHTLY_GMW_35?: string;
  readonly FEATURE_NIGHTLY_GMW_113?: string;
  readonly FEATURE_NIGHTLY_GMW_113_PASS?: string;
  readonly FEATURE_NIGHTLY_GMW_115?: string;
  readonly FEATURE_NIGHTLY_GMW_115_PASS?: string;
  readonly FEATURE_NIGHTLY_GMW_200?: string;
  readonly FEATURE_NIGHTLY_GMW_200_PASS?: string;
  readonly FEATURE_NIGHTLY_GMW_208?: string;
  readonly FEATURE_NIGHTLY_GMW_208_PASS?: string;
  readonly FEATURE_NIGHTLY_GMW_212?: string;
  readonly FEATURE_NIGHTLY_GMW_212_PASS?: string;
  readonly FEATURE_NIGHTLY_GMW_213?: string;
  readonly FEATURE_NIGHTLY_GMW_213_PASS?: string;
  readonly FEATURE_NIGHTLY_GMW_214?: string;
  readonly FEATURE_NIGHTLY_GMW_214_PASS?: string;
  readonly FEATURE_NIGHTLY_GMW_215?: string;
  readonly FEATURE_NIGHTLY_GMW_215_PASS?: string;
  readonly FEATURE_NIGHTLY_GMW_216?: string;
  readonly FEATURE_NIGHTLY_GMW_216_PASS?: string;
  readonly FEATURE_NIGHTLY_GMW_233?: string;
  readonly FEATURE_NIGHTLY_GMW_234?: string;
  readonly FEATURE_NIGHTLY_GMW_235?: string;
  readonly FEATURE_NIGHTLY_GMW_248?: string;
  readonly FEATURE_NIGHTLY_GMW_272?: string;
  readonly FEATURE_NIGHTLY_GMW_291?: string;
  readonly FEATURE_NIGHTLY_GMW_299?: string;
  readonly FEATURE_NIGHTLY_GMW_300?: string;
  readonly FEATURE_NIGHTLY_GMW_301?: string;
  readonly FEATURE_NIGHTLY_GMW_307?: string;
  readonly FEATURE_NIGHTLY_GMW_317?: string;
  readonly FEATURE_NIGHTLY_GMW_320?: string;
  readonly FEATURE_NIGHTLY_GMW_329?: string;
  readonly FEATURE_NIGHTLY_GMW_330?: string;
  readonly FEATURE_NIGHTLY_GMW_331?: string;
  readonly FEATURE_NIGHTLY_GMW_334?: string;
  readonly FEATURE_NIGHTLY_GMW_340?: string;
  readonly FEATURE_NIGHTLY_GMW_344?: string;
  readonly FEATURE_NIGHTLY_GMW_346?: string;
  readonly FEATURE_NIGHTLY_GMW_347?: string;
  readonly FEATURE_NIGHTLY_GMW_348?: string;
  readonly FEATURE_NIGHTLY_GMW_351?: string;
  readonly FEATURE_NIGHTLY_GMW_357?: string;
  readonly FEATURE_NIGHTLY_GMW_374?: string;
  readonly FEATURE_NIGHTLY_GMW_378?: string;
  readonly FEATURE_NIGHTLY_GMW_379?: string;
  readonly FEATURE_NIGHTLY_GMW_383?: string;
  readonly FEATURE_NIGHTLY_GMW_385?: string;
  readonly FEATURE_NIGHTLY_GMW_390?: string;
  readonly FEATURE_NIGHTLY_GMW_391?: string;
  readonly FEATURE_NIGHTLY_GMW_394?: string;
  readonly FEATURE_NIGHTLY_GMW_395?: string;
  readonly FEATURE_NIGHTLY_GMW_396?: string;
  readonly FEATURE_NIGHTLY_GMW_399?: string;
  readonly FEATURE_NIGHTLY_GMW_400?: string;
  readonly FEATURE_NIGHTLY_GMW_401?: string;
  readonly FEATURE_NIGHTLY_GMW_402?: string;
  readonly FEATURE_NIGHTLY_GMW_404?: string;
  readonly FEATURE_NIGHTLY_GMW_409?: string;
  readonly FEATURE_NIGHTLY_GMW_406?: string;
  readonly FEATURE_NIGHTLY_GMW_410?: string;
  readonly FEATURE_NIGHTLY_GMW_411?: string;
  readonly FEATURE_NIGHTLY_GMW_412?: string;
  readonly FEATURE_NIGHTLY_GMW_415?: string;
  readonly FEATURE_NIGHTLY_GMW_417?: string;
  readonly FEATURE_NIGHTLY_GMW_418?: string;
  readonly FEATURE_NIGHTLY_GMW_420?: string;
  readonly FEATURE_NIGHTLY_GMW_421?: string;
  readonly FEATURE_NIGHTLY_GMW_422?: string;
  readonly FEATURE_NIGHTLY_GMW_424?: string;
  readonly FEATURE_NIGHTLY_GMW_425?: string;
  readonly FEATURE_NIGHTLY_GMW_403?: string;
  readonly FEATURE_NIGHTLY_GMW_426?: string;
  readonly FEATURE_NIGHTLY_GMW_440?: string;
  readonly FEATURE_NIGHTLY_GMW_430?: string;
  readonly FEATURE_NIGHTLY_GMW_431?: string;
  readonly FEATURE_NIGHTLY_GMW_450?: string;
  readonly FEATURE_NIGHTLY_GMW_442?: string;
  readonly FEATURE_NIGHTLY_GMW_446?: string;
  readonly FEATURE_NIGHTLY_GMW_460?: string;
  readonly FEATURE_NIGHTLY_GMW_456?: string;
  readonly FEATURE_NIGHTLY_GMW_465?: string;
  readonly FEATURE_NIGHTLY_POOL_NEW?: string;
  readonly FEATURE_NIGHTLY_POOL_NEW_PASS?: string;
  readonly FEATURE_NIGHTLY_GLV_NEW_NAME?: string;
  readonly VITE_GMTRADE_EVENTS_URL?: string;
  readonly VITE_NOTICES_JSON_URL: string;
  readonly VITE_TRADE_CONFIG_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

type FeatureFlags = {
  [K in keyof ImportMetaEnv as K extends `FEATURE_${string}`
    ? K
    : never]: boolean;
};
