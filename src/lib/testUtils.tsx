import { render } from "@testing-library/react";
import WalletProvider from "./wallets/WalletProvider";

export function TestApp({ children }) {
  return <WalletProvider>{children}</WalletProvider>;
}

export function testHook(hook: () => void) {
  function Comp() {
    hook();

    return null;
  }

  render(
    <TestApp>
      <Comp />
    </TestApp>
  );
}
