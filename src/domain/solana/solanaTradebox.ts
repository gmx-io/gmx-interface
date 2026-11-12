export type SolanaTradeboxState = {
  sessionId: object;
  owner: string | undefined;
  text: string;
  disabled: boolean;
  isSubmitting: boolean;
  onSubmit: () => Promise<boolean>;
};
