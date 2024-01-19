import { BigNumber } from "ethers";
import { getApproxSubaccountActionsCountByBalance } from "./utils";

describe("getApproxSubaccountActionsCountByBalance", () => {
  it("case 1", () => {
    const mainAccWrappedTokenBalance = BigNumber.from(100);
    const currentAutoTopUpAmount = BigNumber.from(10);
    const subAccNativeTokenBalance = BigNumber.from(100);
    const executionFee = BigNumber.from(10);
    const res = getApproxSubaccountActionsCountByBalance(
      mainAccWrappedTokenBalance,
      subAccNativeTokenBalance,
      executionFee,
      currentAutoTopUpAmount
    );

    // 100 / 10 + 100 / 10
    expect(res).toEqual(BigNumber.from(20));
  });

  it("case 2", () => {
    const mainAccWrappedTokenBalance = BigNumber.from(10);
    const currentAutoTopUpAmount = BigNumber.from(10);
    const subAccNativeTokenBalance = BigNumber.from(100);
    const executionFee = BigNumber.from(10);
    const res = getApproxSubaccountActionsCountByBalance(
      mainAccWrappedTokenBalance,
      subAccNativeTokenBalance,
      executionFee,
      currentAutoTopUpAmount
    );

    // 10 / 10 + 100 / 10
    expect(res).toEqual(BigNumber.from(11));
  });

  it("case 3", () => {
    const mainAccWrappedTokenBalance = BigNumber.from(0);
    const currentAutoTopUpAmount = BigNumber.from(10);
    const subAccNativeTokenBalance = BigNumber.from(100);
    const executionFee = BigNumber.from(10);
    const res = getApproxSubaccountActionsCountByBalance(
      mainAccWrappedTokenBalance,
      subAccNativeTokenBalance,
      executionFee,
      currentAutoTopUpAmount
    );

    // 0 / 10 + 100 / 10
    expect(res).toEqual(BigNumber.from(10));
  });

  it("case 4", () => {
    const mainAccWrappedTokenBalance = BigNumber.from(10);
    const currentAutoTopUpAmount = BigNumber.from(0);
    const subAccNativeTokenBalance = BigNumber.from(100);
    const executionFee = BigNumber.from(10);
    const res = getApproxSubaccountActionsCountByBalance(
      mainAccWrappedTokenBalance,
      subAccNativeTokenBalance,
      executionFee,
      currentAutoTopUpAmount
    );

    // 10 / 0 + 100 / 10
    expect(res).toEqual(BigNumber.from(10));
  });

  it("case 5", () => {
    const mainAccWrappedTokenBalance = BigNumber.from(1000);
    const currentAutoTopUpAmount = BigNumber.from(1000);
    const subAccNativeTokenBalance = BigNumber.from(1);
    const executionFee = BigNumber.from(10);
    const res = getApproxSubaccountActionsCountByBalance(
      mainAccWrappedTokenBalance,
      subAccNativeTokenBalance,
      executionFee,
      currentAutoTopUpAmount
    );

    // 1000 / 10 + 1 / 10
    // not enough balance to process an action
    expect(res).toEqual(BigNumber.from(0));
  });

  it("case 6", () => {
    const mainAccWrappedTokenBalance = BigNumber.from(10);
    const currentAutoTopUpAmount = BigNumber.from(10);
    const subAccNativeTokenBalance = BigNumber.from(10);
    const executionFee = BigNumber.from(10);
    const res = getApproxSubaccountActionsCountByBalance(
      mainAccWrappedTokenBalance,
      subAccNativeTokenBalance,
      executionFee,
      currentAutoTopUpAmount
    );

    // 10 / 10 + 10 / 10
    expect(res).toEqual(BigNumber.from(2));
  });

  it("case 7", () => {
    const mainAccWrappedTokenBalance = BigNumber.from(0);
    const currentAutoTopUpAmount = BigNumber.from(0);
    const subAccNativeTokenBalance = BigNumber.from(10);
    const executionFee = BigNumber.from(10);
    const res = getApproxSubaccountActionsCountByBalance(
      mainAccWrappedTokenBalance,
      subAccNativeTokenBalance,
      executionFee,
      currentAutoTopUpAmount
    );

    // 0 / 0 + 10 / 10
    expect(res).toEqual(BigNumber.from(1));
  });

  it("case 8", () => {
    const mainAccWrappedTokenBalance = BigNumber.from(20);
    const currentAutoTopUpAmount = BigNumber.from(5);
    const subAccNativeTokenBalance = BigNumber.from(20);
    const executionFee = BigNumber.from(10);
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
    expect(res).toEqual(BigNumber.from(3));
  });

  it("case 9", () => {
    const mainAccWrappedTokenBalance = BigNumber.from(6);
    const currentAutoTopUpAmount = BigNumber.from(3);
    const subAccNativeTokenBalance = BigNumber.from(20);
    const executionFee = BigNumber.from(7);
    const res = getApproxSubaccountActionsCountByBalance(
      mainAccWrappedTokenBalance,
      subAccNativeTokenBalance,
      executionFee,
      currentAutoTopUpAmount
    );

    expect(res).toEqual(BigNumber.from(3));
  });

  it("case 10", () => {
    const mainAccWrappedTokenBalance = BigNumber.from(100);
    const currentAutoTopUpAmount = BigNumber.from(10);
    const subAccNativeTokenBalance = BigNumber.from(20);
    const executionFee = BigNumber.from(11);
    const res = getApproxSubaccountActionsCountByBalance(
      mainAccWrappedTokenBalance,
      subAccNativeTokenBalance,
      executionFee,
      currentAutoTopUpAmount
    );

    expect(res).toEqual(BigNumber.from(10));
  });

  it("case 11", () => {
    const mainAccWrappedTokenBalance = BigNumber.from(100);
    const currentAutoTopUpAmount = BigNumber.from(0);
    const subAccNativeTokenBalance = BigNumber.from(20);
    const executionFee = BigNumber.from(1);
    const res = getApproxSubaccountActionsCountByBalance(
      mainAccWrappedTokenBalance,
      subAccNativeTokenBalance,
      executionFee,
      currentAutoTopUpAmount
    );

    expect(res).toEqual(BigNumber.from(20));
  });

  it("case 12", () => {
    const mainAccWrappedTokenBalance = BigNumber.from(100);
    const currentAutoTopUpAmount = BigNumber.from(10);
    const subAccNativeTokenBalance = BigNumber.from(10);
    const executionFee = BigNumber.from(10);
    const res = getApproxSubaccountActionsCountByBalance(
      mainAccWrappedTokenBalance,
      subAccNativeTokenBalance,
      executionFee,
      currentAutoTopUpAmount
    );

    expect(res).toEqual(BigNumber.from(11));
  });

  it("case 13", () => {
    const mainAccWrappedTokenBalance = BigNumber.from(100);
    const currentAutoTopUpAmount = BigNumber.from(10);
    const subAccNativeTokenBalance = BigNumber.from(9);
    const executionFee = BigNumber.from(10);
    const res = getApproxSubaccountActionsCountByBalance(
      mainAccWrappedTokenBalance,
      subAccNativeTokenBalance,
      executionFee,
      currentAutoTopUpAmount
    );

    expect(res).toEqual(BigNumber.from(0));
  });
});
