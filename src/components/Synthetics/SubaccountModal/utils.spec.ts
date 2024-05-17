import { getApproxSubaccountActionsCountByBalance } from "./utils";

describe("getApproxSubaccountActionsCountByBalance", () => {
  it("case 1", () => {
    const mainAccWrappedTokenBalance = 100n;
    const currentAutoTopUpAmount = 10n;
    const subAccNativeTokenBalance = 100n;
    const executionFee = 10n;
    const res = getApproxSubaccountActionsCountByBalance(
      mainAccWrappedTokenBalance,
      subAccNativeTokenBalance,
      executionFee,
      currentAutoTopUpAmount
    );

    // 100 / 10 + 100 / 10
    expect(res).toEqual(20n);
  });

  it("case 2", () => {
    const mainAccWrappedTokenBalance = 10n;
    const currentAutoTopUpAmount = 10n;
    const subAccNativeTokenBalance = 100n;
    const executionFee = 10n;
    const res = getApproxSubaccountActionsCountByBalance(
      mainAccWrappedTokenBalance,
      subAccNativeTokenBalance,
      executionFee,
      currentAutoTopUpAmount
    );

    // 10 / 10 + 100 / 10
    expect(res).toEqual(11n);
  });

  it("case 3", () => {
    const mainAccWrappedTokenBalance = 0n;
    const currentAutoTopUpAmount = 10n;
    const subAccNativeTokenBalance = 100n;
    const executionFee = 10n;
    const res = getApproxSubaccountActionsCountByBalance(
      mainAccWrappedTokenBalance,
      subAccNativeTokenBalance,
      executionFee,
      currentAutoTopUpAmount
    );

    // 0 / 10 + 100 / 10
    expect(res).toEqual(10n);
  });

  it("case 4", () => {
    const mainAccWrappedTokenBalance = 10n;
    const subAccNativeTokenBalance = 100n;
    const executionFee = 10n;
    const currentAutoTopUpAmount = 0n;
    const res = getApproxSubaccountActionsCountByBalance(
      mainAccWrappedTokenBalance,
      subAccNativeTokenBalance,
      executionFee,
      currentAutoTopUpAmount
    );

    // 10 / 0 + 100 / 10
    expect(res).toEqual(10n);
  });

  it("case 5", () => {
    const mainAccWrappedTokenBalance = 1000n;
    const currentAutoTopUpAmount = 1000n;
    const subAccNativeTokenBalance = 1n;
    const executionFee = 10n;
    const res = getApproxSubaccountActionsCountByBalance(
      mainAccWrappedTokenBalance,
      subAccNativeTokenBalance,
      executionFee,
      currentAutoTopUpAmount
    );

    // 1000 / 10 + 1 / 10
    // not enough balance to process an action
    expect(res).toEqual(0n);
  });

  it("case 6", () => {
    const mainAccWrappedTokenBalance = 10n;
    const currentAutoTopUpAmount = 10n;
    const subAccNativeTokenBalance = 10n;
    const executionFee = 10n;
    const res = getApproxSubaccountActionsCountByBalance(
      mainAccWrappedTokenBalance,
      subAccNativeTokenBalance,
      executionFee,
      currentAutoTopUpAmount
    );

    // 10 / 10 + 10 / 10
    expect(res).toEqual(2n);
  });

  it("case 7", () => {
    const mainAccWrappedTokenBalance = 0n;
    const currentAutoTopUpAmount = 0n;
    const subAccNativeTokenBalance = 10n;
    const executionFee = 10n;
    const res = getApproxSubaccountActionsCountByBalance(
      mainAccWrappedTokenBalance,
      subAccNativeTokenBalance,
      executionFee,
      currentAutoTopUpAmount
    );

    // 0 / 0 + 10 / 10
    expect(res).toEqual(1n);
  });

  it("case 8", () => {
    const mainAccWrappedTokenBalance = 20n;
    const currentAutoTopUpAmount = 5n;
    const subAccNativeTokenBalance = 20n;
    const executionFee = 10n;
    const res = getApproxSubaccountActionsCountByBalance(
      mainAccWrappedTokenBalance,
      subAccNativeTokenBalance,
      executionFee,
      currentAutoTopUpAmount
    );

    // 20 / 5 + 20 / 10
    // 20 - 5
    // 15 - 5
    // 10 - 5 <- stops here
    // 5 - 5
    expect(res).toEqual(3n);
  });

  it("case 9", () => {
    const mainAccWrappedTokenBalance = 6n;
    const currentAutoTopUpAmount = 3n;
    const subAccNativeTokenBalance = 20n;
    const executionFee = 7n;
    const res = getApproxSubaccountActionsCountByBalance(
      mainAccWrappedTokenBalance,
      subAccNativeTokenBalance,
      executionFee,
      currentAutoTopUpAmount
    );

    expect(res).toEqual(3n);
  });

  it("case 10", () => {
    const mainAccWrappedTokenBalance = 100n;
    const currentAutoTopUpAmount = 10n;
    const subAccNativeTokenBalance = 20n;
    const executionFee = 11n;
    const res = getApproxSubaccountActionsCountByBalance(
      mainAccWrappedTokenBalance,
      subAccNativeTokenBalance,
      executionFee,
      currentAutoTopUpAmount
    );

    expect(res).toEqual(10n);
  });

  it("case 11", () => {
    const mainAccWrappedTokenBalance = 100n;
    const currentAutoTopUpAmount = 0n;
    const subAccNativeTokenBalance = 20n;
    const executionFee = 1n;
    const res = getApproxSubaccountActionsCountByBalance(
      mainAccWrappedTokenBalance,
      subAccNativeTokenBalance,
      executionFee,
      currentAutoTopUpAmount
    );

    expect(res).toEqual(20n);
  });

  it("case 12", () => {
    const mainAccWrappedTokenBalance = 100n;
    const currentAutoTopUpAmount = 10n;
    const subAccNativeTokenBalance = 10n;
    const executionFee = 10n;
    const res = getApproxSubaccountActionsCountByBalance(
      mainAccWrappedTokenBalance,
      subAccNativeTokenBalance,
      executionFee,
      currentAutoTopUpAmount
    );

    expect(res).toEqual(11n);
  });

  it("case 13", () => {
    const mainAccWrappedTokenBalance = 100n;
    const currentAutoTopUpAmount = 10n;
    const subAccNativeTokenBalance = 9n;
    const executionFee = 10n;
    const res = getApproxSubaccountActionsCountByBalance(
      mainAccWrappedTokenBalance,
      subAccNativeTokenBalance,
      executionFee,
      currentAutoTopUpAmount
    );

    expect(res).toEqual(0n);
  });
});
