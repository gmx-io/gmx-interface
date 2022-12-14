import { Web3Provider } from "@ethersproject/providers";
import { render } from "@testing-library/react";
import { Web3ReactProvider } from "@web3-react/core";

export function TestApp({ children }) {
  return <Web3ReactProvider getLibrary={(provider) => new Web3Provider(provider)}>{children}</Web3ReactProvider>;
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
