export type AccountWhitelists = {
  deposit: {
    markets: Record<string, boolean>;
    glvs: Record<string, boolean>;
  };
};
