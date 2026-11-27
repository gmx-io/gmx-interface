export type SolanaTradeboxState = {
  sessionId: object;
  text: string;
  disabled: boolean;
  onSubmit: () => Promise<boolean>;
  solHoldback: bigint | undefined;
  isSolHoldbackUnavailable: boolean;
};
