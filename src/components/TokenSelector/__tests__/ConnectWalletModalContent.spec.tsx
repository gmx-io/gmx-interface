import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ConnectWalletModalContent } from "../ConnectWalletModalContent";

i18n.load({ en: {} });
i18n.activate("en");

afterEach(cleanup);

const emptyWalletIconUrls: string[] = [];

describe("ConnectWalletModalContent", () => {
  it("does not render a zero when wallet icons are empty", () => {
    const { container, queryAllByAltText } = render(
      <I18nProvider i18n={i18n}>
        <ConnectWalletModalContent walletIconUrls={emptyWalletIconUrls} openConnectModal={undefined} />
      </I18nProvider>
    );

    expect(queryAllByAltText("Wallet icon")).toHaveLength(0);
    expect(container.textContent).not.toContain("0");
  });
});
