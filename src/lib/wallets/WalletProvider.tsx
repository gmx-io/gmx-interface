import { useLingui } from "@lingui/react";
import { darkTheme, lightTheme, RainbowKitProvider, type Theme, type Locale } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import merge from "lodash/merge";
import { useMemo } from "react";
import { WagmiProvider } from "wagmi";

import { useTheme } from "context/ThemeContext/ThemeContext";

import { getRainbowKitConfig } from "./rainbowKitConfig";

const darkWalletTheme = merge(darkTheme(), {
  colors: {
    modalBackground: "var(--color-slate-800)",
    accentColor: "var(--color-blue-500)",
    menuItemBackground: "var(--color-fill-surfaceHover)",
  },
  radii: {
    modal: "8px",
    menuButton: "8px",
  },
} as Theme);

const lightWalletTheme = merge(lightTheme(), {
  colors: {
    modalBackground: "var(--color-slate-900)",
    accentColor: "var(--color-blue-500)",
    menuItemBackground: "var(--color-fill-surfaceHover)",
  },
  radii: {
    modal: "8px",
    menuButton: "8px",
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
      <WagmiProvider config={getRainbowKitConfig()}>{children}</WagmiProvider>
    </QueryClientProvider>
  );
}

export function RainbowKitProviderWrapper({ children }) {
  const { i18n } = useLingui();
  const { theme } = useTheme();
  const locale = useMemo(() => appLocale2RainbowLocaleMap[i18n.locale] ?? "en", [i18n.locale]);
  const walletTheme = theme === "light" ? lightWalletTheme : darkWalletTheme;

  return (
    <RainbowKitProvider theme={walletTheme} locale={locale} modalSize="compact">
      {children}
    </RainbowKitProvider>
  );
}
