export function getTransferSolInstruction(): never {
  throw new Error("Solana wallet funding is unavailable in the ethereum-only Privy integration.");
}
