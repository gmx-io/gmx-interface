import { describe, expect, it } from "vitest";

import { getChainName, SettlementChainId, SourceChainId } from "config/chains";
import { MULTICHAIN_TOKEN_MAPPING } from "config/multichain";

import { getMultichainTransferableGasPaymentTokenSymbols } from "./getMultichainTransferableGasPaymentTokenAddresses";

function forEachSettlementSourceCombination(
  callback: (params: {
    settlementChainId: SettlementChainId;
    sourceChainId: SourceChainId;
    settlementChainName: string;
    sourceChainName: string;
  }) => void
) {
  for (const settlementChainIdString in MULTICHAIN_TOKEN_MAPPING) {
    const settlementChainId = parseInt(settlementChainIdString) as SettlementChainId;
    const settlementChainName = getChainName(settlementChainId);
    for (const sourceChainIdString in MULTICHAIN_TOKEN_MAPPING[settlementChainId]) {
      const sourceChainId = parseInt(sourceChainIdString) as SourceChainId;
      const sourceChainName = getChainName(sourceChainId);
      callback({
        settlementChainId,
        sourceChainId,
        settlementChainName,
        sourceChainName,
      });
    }
  }
}

describe("getMultichainTransferableGasPaymentTokenSymbols", () => {
  it("should return the correct symbols", () => {
    let result = "Source; Settlement; Supported Gas Payment Tokens\n";

    forEachSettlementSourceCombination(({ settlementChainId, sourceChainId, settlementChainName, sourceChainName }) => {
      const symbols = getMultichainTransferableGasPaymentTokenSymbols(settlementChainId, sourceChainId);

      result += `${sourceChainName}; ${settlementChainName}; ${symbols.join(", ")}\n`;
    });

    result = result.trim();

    expect(result).toMatchInlineSnapshot(`
      "Source; Settlement; Supported Gas Payment Tokens
      BNB; Arbitrum; USDC, USDT
      Base; Arbitrum; USDC, ETH
      BNB; Avalanche; USDC, USDT
      Base; Avalanche; USDC
      Sepolia; Arbitrum Sepolia; USDC.SG, ETH
      Optimism Sepolia; Arbitrum Sepolia; USDC.SG, ETH"
    `);
  });
});
