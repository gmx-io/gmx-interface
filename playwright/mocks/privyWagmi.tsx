import type { ReactNode } from "react";
import { createConfig as createWagmiConfig, WagmiProvider as BaseWagmiProvider } from "wagmi";
import type { CreateConfigParameters, State } from "wagmi";

export function createConfig(parameters: CreateConfigParameters) {
  return createWagmiConfig(parameters);
}

export function WagmiProvider({
  children,
  config,
  initialState,
}: {
  children: ReactNode;
  config: ReturnType<typeof createWagmiConfig>;
  initialState?: State;
}) {
  return (
    <BaseWagmiProvider config={config} initialState={initialState}>
      {children}
    </BaseWagmiProvider>
  );
}

export function useSetActiveWallet() {
  return {
    setActiveWallet: () => Promise.resolve(),
  };
}
