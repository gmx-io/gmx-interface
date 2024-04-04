import { useLingui } from "@lingui/react";
import { darkTheme, RainbowKitProvider, type Theme, type Locale } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import merge from "lodash/merge";
import { useMemo } from "react";
import { WagmiProvider } from "wagmi";

import { rainbowKitConfig } from "./rainbowKitConfig";

const walletTheme = merge(darkTheme(), {
  colors: {
    modalBackground: "#16182e",
    accentColor: "#9da5f2",
    menuItemBackground: "#808aff14",
  },
  radii: {
    modal: "4px",
    menuButton: "4px",
  },
} as Theme);

const queryClient = new QueryClient();

const appLocale2RainbowLocaleMap: Record<string, Locale> = {
  de: "en",
  en: "en",
  es: "es",
  fr: "fr",
  ja: "ja",
  ko: "ko",
  ru: "ru",
  zh: "zh",
  pseudo: "en",
};

export default function WalletProvider({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={rainbowKitConfig}>{children}</WagmiProvider>
    </QueryClientProvider>
  );
}

export function RainbowKitProviderWrapper({ children }) {
  const { i18n } = useLingui();
  const locale = useMemo(() => appLocale2RainbowLocaleMap[i18n.locale] ?? "en", [i18n.locale]);

  return (
    <RainbowKitProvider theme={walletTheme} locale={locale} modalSize="compact">
      {children}
    </RainbowKitProvider>
  );
}
