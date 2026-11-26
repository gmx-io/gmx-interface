export type SolanaTradeboxState = {
  sessionId: object;
  owner: string | undefined;
  text: string;
  disabled: boolean;
  isSubmitting: boolean;
  onSubmit: () => Promise<boolean>;
  // Lamports Max keeps back from a native SOL payment for keeper fees, rent and network fees.
  solHoldback: bigint | undefined;
  isSolHoldbackUnavailable: boolean;
};
