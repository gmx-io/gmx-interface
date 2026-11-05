export type SignedSubmit<TPrepared, TSubmitRequest> = {
  requestId: string;
  prepared: TPrepared;
  signature: string;
  submitRequest: TSubmitRequest;
};

export const SIGNED_ORDER_SUBMIT = Symbol.for("@gmx-io/sdk/signedOrderSubmit");
export const SIGNED_CROSS_CHAIN_WITHDRAW_SUBMIT = Symbol.for("@gmx-io/sdk/signedCrossChainWithdrawSubmit");

// rethrows the submit error itself, so callers' HttpError and network error checks still tell an open outcome apart
export async function submitSigned<TPrepared, TSubmitRequest, TResult>(
  key: symbol,
  signed: SignedSubmit<TPrepared, TSubmitRequest>,
  submit: (request: TSubmitRequest) => Promise<TResult>
): Promise<TResult> {
  try {
    return await submit(signed.submitRequest);
  } catch (error) {
    const target =
      typeof error === "object" && error !== null && Object.isExtensible(error)
        ? error
        : Object.assign(new Error(String(error)), { cause: error });
    Object.defineProperty(target, key, { value: signed, configurable: true });
    throw target;
  }
}

export function getSignedSubmit<TSigned>(error: unknown, key: symbol): TSigned | undefined {
  return typeof error === "object" && error !== null ? (error as Record<symbol, TSigned | undefined>)[key] : undefined;
}
