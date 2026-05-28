import { describe, expect, it } from "vitest";

import { useSetActiveWallet } from "./privyWagmi";

describe("Privy wagmi Playwright mock", () => {
  it("provides the active-wallet setter used by the connect modal", async () => {
    const { setActiveWallet } = useSetActiveWallet();

    await expect(setActiveWallet({ address: "0x0000000000000000000000000000000000000001" })).resolves.toBeUndefined();
  });
});
