import { describe, expect, it } from "vitest";

import { ARBITRUM } from "config/chains";
import { TxErrorType } from "sdk/utils/errors/transactionsErrors";

import { getTxnErrorToast } from "./errorToasts";

describe("getTxnErrorToast", () => {
  it("uses the default message for other canceled transactions", () => {
    const result = getTxnErrorToast(
      ARBITRUM,
      {
        txErrorType: TxErrorType.UserDenied,
      },
      {}
    );

    expect(result.errorContent).toBe("Transaction canceled");
  });

  it("uses a custom user denied message", () => {
    const result = getTxnErrorToast(
      ARBITRUM,
      {
        txErrorType: TxErrorType.UserDenied,
      },
      {
        userDeniedMessage: "Custom cancellation guidance",
      }
    );

    expect(result.errorContent).toBe("Custom cancellation guidance");
  });
});
