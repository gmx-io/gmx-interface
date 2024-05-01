import { getApproxSubaccountActionsCountByBalance } from "./utils";

describe("getApproxSubaccountActionsCountByBalance", () => {
  it("case 1", () => {
    const mainAccWrappedTokenBalance = BigInt(100);
    const currentAutoTopUpAmount = BigInt(10);
    const subAccNativeTokenBalance = BigInt(100);
    const executionFee = BigInt(10);
    const res = getApproxSubaccountActionsCountByBalance(
      mainAccWrappedTokenBalance,
      subAccNativeTokenBalance,
      executionFee,
      currentAutoTopUpAmount
    );

    // 100 / 10 + 100 / 10
    expect(res).toEqual(BigInt(20));
  });

  it("case 2", () => {
    const mainAccWrappedTokenBalance = BigInt(10);
    const currentAutoTopUpAmount = BigInt(10);
    const subAccNativeTokenBalance = BigInt(100);
    const executionFee = BigInt(10);
    const res = getApproxSubaccountActionsCountByBalance(
      mainAccWrappedTokenBalance,
      subAccNativeTokenBalance,
      executionFee,
      currentAutoTopUpAmount
    );

    // 10 / 10 + 100 / 10
    expect(res).toEqual(BigInt(11));
  });

  it("case 3", () => {
    const mainAccWrappedTokenBalance = 0n;
    const currentAutoTopUpAmount = BigInt(10);
    const subAccNativeTokenBalance = BigInt(100);
    const executionFee = BigInt(10);
    const res = getApproxSubaccountActionsCountByBalance(
      mainAccWrappedTokenBalance,
      subAccNativeTokenBalance,
      executionFee,
      currentAutoTopUpAmount
    );

    // 0 / 10 + 100 / 10
    expect(res).toEqual(BigInt(10));
  });

  it("case 4", () => {
    const mainAccWrappedTokenBalance = BigInt(10);
    const currentAutoTopUpAmount = 0n;
    const subAccNativeTokenBalance = BigInt(100);
    const executionFee = BigInt(10);
    const res = getApproxSubaccountActionsCountByBalance(
      mainAccWrappedTokenBalance,
      subAccNativeTokenBalance,
      executionFee,
      currentAutoTopUpAmount
    );

    // 10 / 0 + 100 / 10
    expect(res).toEqual(BigInt(10));
  });

  it("case 5", () => {
    const mainAccWrappedTokenBalance = BigInt(1000);
    const currentAutoTopUpAmount = BigInt(1000);
    const subAccNativeTokenBalance = BigInt(1);
    const executionFee = BigInt(10);
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
    const mainAccWrappedTokenBalance = BigInt(10);
    const currentAutoTopUpAmount = BigInt(10);
    const subAccNativeTokenBalance = BigInt(10);
    const executionFee = BigInt(10);
    const res = getApproxSubaccountActionsCountByBalance(
      mainAccWrappedTokenBalance,
      subAccNativeTokenBalance,
      executionFee,
      currentAutoTopUpAmount
    );

    // 10 / 10 + 10 / 10
    expect(res).toEqual(BigInt(2));
  });

  it("case 7", () => {
    const mainAccWrappedTokenBalance = 0n;
    const currentAutoTopUpAmount = 0n;
    const subAccNativeTokenBalance = BigInt(10);
    const executionFee = BigInt(10);
    const res = getApproxSubaccountActionsCountByBalance(
      mainAccWrappedTokenBalance,
      subAccNativeTokenBalance,
      executionFee,
      currentAutoTopUpAmount
    );

    // 0 / 0 + 10 / 10
    expect(res).toEqual(BigInt(1));
  });

  it("case 8", () => {
    const mainAccWrappedTokenBalance = BigInt(20);
    const currentAutoTopUpAmount = BigInt(5);
    const subAccNativeTokenBalance = BigInt(20);
    const executionFee = BigInt(10);
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
    expect(res).toEqual(BigInt(3));
  });

  it("case 9", () => {
    const mainAccWrappedTokenBalance = BigInt(6);
    const currentAutoTopUpAmount = BigInt(3);
    const subAccNativeTokenBalance = BigInt(20);
    const executionFee = BigInt(7);
    const res = getApproxSubaccountActionsCountByBalance(
      mainAccWrappedTokenBalance,
      subAccNativeTokenBalance,
      executionFee,
      currentAutoTopUpAmount
    );

    expect(res).toEqual(BigInt(3));
  });

  it("case 10", () => {
    const mainAccWrappedTokenBalance = BigInt(100);
    const currentAutoTopUpAmount = BigInt(10);
    const subAccNativeTokenBalance = BigInt(20);
    const executionFee = BigInt(11);
    const res = getApproxSubaccountActionsCountByBalance(
      mainAccWrappedTokenBalance,
      subAccNativeTokenBalance,
      executionFee,
      currentAutoTopUpAmount
    );

    expect(res).toEqual(BigInt(10));
  });

  it("case 11", () => {
    const mainAccWrappedTokenBalance = BigInt(100);
    const currentAutoTopUpAmount = 0n;
    const subAccNativeTokenBalance = BigInt(20);
    const executionFee = BigInt(1);
    const res = getApproxSubaccountActionsCountByBalance(
      mainAccWrappedTokenBalance,
      subAccNativeTokenBalance,
      executionFee,
      currentAutoTopUpAmount
    );

    expect(res).toEqual(BigInt(20));
  });

  it("case 12", () => {
    const mainAccWrappedTokenBalance = BigInt(100);
    const currentAutoTopUpAmount = BigInt(10);
    const subAccNativeTokenBalance = BigInt(10);
    const executionFee = BigInt(10);
    const res = getApproxSubaccountActionsCountByBalance(
      mainAccWrappedTokenBalance,
      subAccNativeTokenBalance,
      executionFee,
      currentAutoTopUpAmount
    );

    expect(res).toEqual(BigInt(11));
  });

  it("case 13", () => {
    const mainAccWrappedTokenBalance = BigInt(100);
    const currentAutoTopUpAmount = BigInt(10);
    const subAccNativeTokenBalance = BigInt(9);
    const executionFee = BigInt(10);
    const res = getApproxSubaccountActionsCountByBalance(
      mainAccWrappedTokenBalance,
      subAccNativeTokenBalance,
      executionFee,
      currentAutoTopUpAmount
    );

    expect(res).toEqual(0n);
  });
});
