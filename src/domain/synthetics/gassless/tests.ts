// @ts-nocheck

import { expect } from "chai";
import {
  impersonateAccount,
  stopImpersonatingAccount,
  setBalance,
  time,
} from "@nomicfoundation/hardhat-network-helpers";

import { deployFixture } from "../../../utils/fixture";
import { expandDecimals, decimalToFloat, bigNumberify, percentageToFloat, applyFactor } from "../../../utils/math";
import { logGasUsage } from "../../../utils/gas";
import { hashString } from "../../../utils/hash";
import { OrderType, DecreasePositionSwapType, getOrderKeys, getOrderCount } from "../../../utils/order";
import { errorsContract } from "../../../utils/error";
import { expectBalance } from "../../../utils/validation";
import { handleDeposit } from "../../../utils/deposit";
import * as keys from "../../../utils/keys";
import { GELATO_RELAY_ADDRESS } from "../../../utils/relay/addresses";
import { sendCancelOrder, sendCreateOrder, sendUpdateOrder } from "../../../utils/relay/gelatoRelay";
import { getTokenPermit } from "../../../utils/relay/tokenPermit";
import { ethers } from "ethers";
import { parseLogs } from "../../../utils/event";
import { deployContract } from "../../../utils/deploy";

const BAD_SIGNATURE =
  "0x122e3efab9b46c82dc38adf4ea6cd2c753b00f95c217a0e3a0f4dd110839f07a08eb29c1cc414d551349510e23a75219cd70c8b88515ed2b83bbd88216ffdb051f";

describe("GelatoRelayRouter", () => {
  let fixture;
  let user0, user1, user2;
  let reader, dataStore, router, gelatoRelayRouter, ethUsdMarket, wnt, usdc, chainlinkPriceFeedProvider;
  let relaySigner;
  let chainId;
  const referralCode = hashString("referralCode");

  let defaultParams;

  beforeEach(async () => {
    fixture = await deployFixture();
    ({ user0, user1, user2 } = fixture.accounts);
    ({ reader, dataStore, router, gelatoRelayRouter, ethUsdMarket, wnt, usdc, chainlinkPriceFeedProvider } =
      fixture.contracts);

    defaultParams = {
      addresses: {
        receiver: user0.address,
        cancellationReceiver: user0.address,
        callbackContract: user1.address,
        uiFeeReceiver: user2.address,
        market: ethUsdMarket.marketToken,
        initialCollateralToken: ethUsdMarket.longToken,
        swapPath: [ethUsdMarket.marketToken],
      },
      numbers: {
        sizeDeltaUsd: decimalToFloat(1000),
        initialCollateralDeltaAmount: 0,
        triggerPrice: decimalToFloat(4800),
        acceptablePrice: decimalToFloat(4900),
        executionFee: 0,
        callbackGasLimit: "200000",
        minOutputAmount: 700,
        validFromTime: 0,
      },
      orderType: OrderType.LimitIncrease,
      decreasePositionSwapType: DecreasePositionSwapType.SwapCollateralTokenToPnlToken,
      isLong: true,
      shouldUnwrapNativeToken: true,
      referralCode,
    };

    await impersonateAccount(GELATO_RELAY_ADDRESS);
    await setBalance(GELATO_RELAY_ADDRESS, expandDecimals(100, 18));
    await usdc.mint(user0.address, expandDecimals(1, 30)); // very large amount
    await wnt.connect(user0).deposit({ value: expandDecimals(1000, 18) });

    relaySigner = await hre.ethers.getSigner(GELATO_RELAY_ADDRESS);
    chainId = await hre.ethers.provider.getNetwork().then((network) => network.chainId);
  });

  let createOrderParams: Parameters<typeof sendCreateOrder>[0];
  beforeEach(async () => {
    createOrderParams = {
      sender: relaySigner,
      signer: user0,
      feeParams: {
        feeToken: wnt.address,
        feeAmount: expandDecimals(2, 15), // 0.002 ETH
        feeSwapPath: [],
      },
      tokenPermits: [],
      collateralDeltaAmount: expandDecimals(1, 17),
      account: user0.address,
      params: defaultParams,
      deadline: 9999999999,
      relayRouter: gelatoRelayRouter,
      chainId,
      relayFeeToken: wnt.address,
      relayFeeAmount: expandDecimals(1, 15),
    };
  });

  describe("createOrder", () => {
    it("DisabledFeature", async () => {
      await dataStore.setBool(keys.gaslessFeatureDisabledKey(gelatoRelayRouter.address), true);
      await expect(sendCreateOrder(createOrderParams)).to.be.revertedWithCustomError(errorsContract, "DisabledFeature");
    });

    it("GelatoRelayContext._transferRelayFeeCapped: maxFee", async () => {
      await wnt.connect(user0).approve(router.address, expandDecimals(1, 18));
      createOrderParams.feeParams.feeAmount = 1;
      await expect(sendCreateOrder(createOrderParams)).to.be.revertedWith(
        "GelatoRelayContext._transferRelayFeeCapped: maxFee"
      );
    });

    it("InsufficientExecutionFee", async () => {
      await wnt.connect(user0).approve(router.address, expandDecimals(1, 18));
      await dataStore.setUint(keys.ESTIMATED_GAS_FEE_MULTIPLIER_FACTOR, decimalToFloat(1));
      createOrderParams.feeParams.feeAmount = expandDecimals(1, 15);
      await expect(sendCreateOrder(createOrderParams)).to.be.revertedWithCustomError(
        errorsContract,
        "InsufficientExecutionFee"
      );
    });

    it("InvalidSignature", async () => {
      await expect(
        sendCreateOrder({
          ...createOrderParams,
          signature: BAD_SIGNATURE,
        })
      ).to.be.revertedWithCustomError(errorsContract, "InvalidSignature");
    });

    it("onlyGelatoRelay", async () => {
      await expect(
        sendCreateOrder({
          ...createOrderParams,
          sender: user0,
        })
      ).to.be.revertedWith("onlyGelatoRelay");
    });

    it("InvalidUserNonce", async () => {
      await wnt.connect(user0).approve(router.address, expandDecimals(1, 18));

      await expect(
        sendCreateOrder({
          ...createOrderParams,
          userNonce: 100,
        })
      ).to.be.revertedWithCustomError(errorsContract, "InvalidUserNonce");

      await sendCreateOrder({
        ...createOrderParams,
        userNonce: 0,
      });

      // same nonce should revert
      await expect(
        sendCreateOrder({
          ...createOrderParams,
          userNonce: 0,
        })
      ).to.be.revertedWithCustomError(errorsContract, "InvalidUserNonce");
    });

    it("DeadlinePassed", async () => {
      await wnt.connect(user0).approve(router.address, expandDecimals(1, 18));

      await expect(
        sendCreateOrder({
          ...createOrderParams,
          deadline: 5,
        })
      ).to.be.revertedWithCustomError(errorsContract, "DeadlinePassed");

      await expect(
        sendCreateOrder({
          ...createOrderParams,
          deadline: 0,
        })
      ).to.be.revertedWithCustomError(errorsContract, "DeadlinePassed");

      await time.setNextBlockTimestamp(9999999100);
      await expect(
        sendCreateOrder({
          ...createOrderParams,
          deadline: 9999999099,
        })
      ).to.be.revertedWithCustomError(errorsContract, "DeadlinePassed");

      await time.setNextBlockTimestamp(9999999200);
      await sendCreateOrder({
        ...createOrderParams,
        deadline: 9999999200,
      });
    });

    it("relay fee insufficient allowance", async () => {
      await expect(sendCreateOrder(createOrderParams)).to.be.revertedWith("ERC20: insufficient allowance");
    });

    it("InvalidPermitSpender", async () => {
      const tokenPermit = await getTokenPermit(
        wnt,
        user0,
        user2.address,
        expandDecimals(1, 18),
        0,
        9999999999,
        chainId
      );
      await expect(
        sendCreateOrder({ ...createOrderParams, tokenPermits: [tokenPermit] })
      ).to.be.revertedWithCustomError(errorsContract, "InvalidPermitSpender");
    });

    it("UnexpectedRelayFeeToken", async () => {
      await usdc.connect(user0).approve(router.address, expandDecimals(1000, 18));
      createOrderParams.feeParams.feeToken = usdc.address;
      createOrderParams.feeParams.feeAmount = expandDecimals(10, 18);
      await expect(sendCreateOrder(createOrderParams)).to.be.revertedWithCustomError(
        errorsContract,
        "UnexpectedRelayFeeToken"
      );
    });

    it("UnexpectedRelayFeeTokenAfterSwap", async () => {
      await wnt.connect(user0).approve(router.address, expandDecimals(1, 18));
      createOrderParams.feeParams.feeSwapPath = [ethUsdMarket.marketToken]; // swap WETH for USDC
      createOrderParams.oracleParams = {
        tokens: [usdc.address, wnt.address],
        providers: [chainlinkPriceFeedProvider.address, chainlinkPriceFeedProvider.address],
        data: ["0x", "0x"],
      };
      await handleDeposit(fixture, {
        create: {
          longTokenAmount: expandDecimals(10, 18),
          shortTokenAmount: expandDecimals(10 * 5000, 6),
        },
      });
      await expect(sendCreateOrder(createOrderParams)).to.be.revertedWithCustomError(
        errorsContract,
        "UnexpectedRelayFeeTokenAfterSwap"
      );
    });

    it("execution fee should not be capped", async () => {
      await wnt.connect(user0).approve(router.address, expandDecimals(1, 18));
      await dataStore.setUint(keys.ESTIMATED_GAS_FEE_MULTIPLIER_FACTOR, decimalToFloat(1));
      await dataStore.setUint(keys.MAX_EXECUTION_FEE_MULTIPLIER_FACTOR, decimalToFloat(1, 10));

      createOrderParams.feeParams.feeAmount = expandDecimals(1, 17);
      await sendCreateOrder(createOrderParams);
      const orderKeys = await getOrderKeys(dataStore, 0, 1);
      const order = await reader.getOrder(dataStore.address, orderKeys[0]);
      expect(order.numbers.executionFee).eq("99000000000000000");
    });

    it("creates order and sends relayer fee", async () => {
      const collateralDeltaAmount = createOrderParams.collateralDeltaAmount;
      const gelatoRelayFee = createOrderParams.relayFeeAmount;

      const tokenPermit = await getTokenPermit(
        wnt,
        user0,
        router.address,
        expandDecimals(1, 18),
        0,
        9999999999,
        chainId
      );

      expect(await wnt.allowance(user0.address, router.address)).to.eq(0);
      await expectBalance(wnt.address, GELATO_RELAY_ADDRESS, 0);
      const tx = await sendCreateOrder({
        ...createOrderParams,
        tokenPermits: [tokenPermit],
      });

      // allowance was set
      expect(await wnt.allowance(user0.address, router.address)).to.eq(
        expandDecimals(1, 18).sub(collateralDeltaAmount).sub(gelatoRelayFee).sub(expandDecimals(1, 15))
      );
      // relay fee was sent
      await expectBalance(wnt.address, GELATO_RELAY_ADDRESS, gelatoRelayFee);

      const orderKeys = await getOrderKeys(dataStore, 0, 1);
      const order = await reader.getOrder(dataStore.address, orderKeys[0]);

      expect(order.addresses.account).eq(user0.address);
      expect(order.addresses.receiver).eq(user0.address);
      expect(order.addresses.callbackContract).eq(user1.address);
      expect(order.addresses.market).eq(ethUsdMarket.marketToken);
      expect(order.addresses.initialCollateralToken).eq(ethUsdMarket.longToken);
      expect(order.addresses.swapPath).deep.eq([ethUsdMarket.marketToken]);
      expect(order.numbers.orderType).eq(OrderType.LimitIncrease);
      expect(order.numbers.decreasePositionSwapType).eq(DecreasePositionSwapType.SwapCollateralTokenToPnlToken);
      expect(order.numbers.sizeDeltaUsd).eq(decimalToFloat(1000));
      expect(order.numbers.initialCollateralDeltaAmount).eq(collateralDeltaAmount);
      expect(order.numbers.triggerPrice).eq(decimalToFloat(4800));
      expect(order.numbers.acceptablePrice).eq(decimalToFloat(4900));
      expect(order.numbers.executionFee).eq(expandDecimals(1, 15));
      expect(order.numbers.callbackGasLimit).eq("200000");
      expect(order.numbers.minOutputAmount).eq(700);

      expect(order.flags.isLong).eq(true);
      expect(order.flags.shouldUnwrapNativeToken).eq(true);
      expect(order.flags.isFrozen).eq(false);

      await stopImpersonatingAccount(GELATO_RELAY_ADDRESS);

      await logGasUsage({
        tx,
        label: "gelatoRelayRouter.createOrder",
      });
    });

    it("swap relay fee with external call", async () => {
      const externalExchange = await deployContract("MockExternalExchange", []);
      await wnt.connect(user0).transfer(externalExchange.address, expandDecimals(1, 17));

      await usdc.connect(user0).approve(router.address, expandDecimals(1000, 6));
      await wnt.connect(user0).approve(router.address, expandDecimals(1, 18));

      const usdcBalanceBefore = await usdc.balanceOf(user0.address);
      const feeAmount = expandDecimals(10, 6);
      await expectBalance(wnt.address, GELATO_RELAY_ADDRESS, 0);
      const tx = await sendCreateOrder({
        ...createOrderParams,
        externalCalls: {
          externalCallTargets: [externalExchange.address],
          externalCallDataList: [
            externalExchange.interface.encodeFunctionData("transfer", [
              wnt.address,
              gelatoRelayRouter.address,
              expandDecimals(1, 17),
            ]),
          ],
          refundTokens: [],
          refundReceivers: [],
        },
        feeParams: {
          feeToken: usdc.address,
          feeAmount,
          feeSwapPath: [],
        },
      });

      // feeCollector received in WETH
      await expectBalance(wnt.address, GELATO_RELAY_ADDRESS, createOrderParams.relayFeeAmount);

      // and user sent correct amount of USDC
      const usdcBalanceAfter = await usdc.balanceOf(user0.address);
      expect(usdcBalanceAfter).eq(usdcBalanceBefore.sub(feeAmount));

      await logGasUsage({
        tx,
        label: "gelatoRelayRouter.createOrder with external call",
      });
    });

    it("swap relay fee", async () => {
      await handleDeposit(fixture, {
        create: {
          longTokenAmount: expandDecimals(10, 18),
          shortTokenAmount: expandDecimals(10 * 5000, 6),
        },
      });

      const atomicSwapFeeFactor = percentageToFloat("1%");
      const swapFeeFactor = percentageToFloat("0.05%");
      await dataStore.setUint(keys.atomicSwapFeeFactorKey(ethUsdMarket.marketToken), atomicSwapFeeFactor);
      await dataStore.setUint(keys.swapFeeFactorKey(ethUsdMarket.marketToken, true), swapFeeFactor);
      await dataStore.setUint(keys.swapFeeFactorKey(ethUsdMarket.marketToken, false), swapFeeFactor);

      await usdc.connect(user0).approve(router.address, expandDecimals(1000, 6));
      await wnt.connect(user0).approve(router.address, expandDecimals(1, 18));

      const usdcBalanceBefore = await usdc.balanceOf(user0.address);
      const feeAmount = expandDecimals(10, 6);
      await expectBalance(wnt.address, GELATO_RELAY_ADDRESS, 0);
      const tx = await sendCreateOrder({
        ...createOrderParams,
        feeParams: {
          feeToken: usdc.address,
          feeAmount,
          feeSwapPath: [ethUsdMarket.marketToken],
        },
        oracleParams: {
          tokens: [usdc.address, wnt.address],
          providers: [chainlinkPriceFeedProvider.address, chainlinkPriceFeedProvider.address],
          data: ["0x", "0x"],
        },
      });

      const orderKeys = await getOrderKeys(dataStore, 0, 1);
      const order = await reader.getOrder(dataStore.address, orderKeys[0]);

      // WETH price is 5000, so 10 USDC will be 0.002 WETH before fees
      expect(order.numbers.executionFee).eq(
        expandDecimals(2, 15)
          .sub(applyFactor(expandDecimals(2, 15), atomicSwapFeeFactor))
          .sub(createOrderParams.relayFeeAmount)
      );

      // feeCollector received in WETH
      await expectBalance(wnt.address, GELATO_RELAY_ADDRESS, createOrderParams.relayFeeAmount);

      // and user sent correct amount of USDC
      const usdcBalanceAfter = await usdc.balanceOf(user0.address);
      expect(usdcBalanceAfter).eq(usdcBalanceBefore.sub(feeAmount));

      // check that atomic swap fee was applied
      const txReceipt = await hre.ethers.provider.getTransactionReceipt(tx.hash);
      const logs = parseLogs(fixture, txReceipt);
      const swapInfoLog = logs.find((log) => log.parsedEventInfo?.eventName === "SwapInfo");
      const swapFeesCollectedLog = logs.find((log) => log.parsedEventInfo?.eventName === "SwapFeesCollected");
      // TODO check fee based on received amounts
      expect(swapInfoLog.parsedEventData.amountIn.sub(swapInfoLog.parsedEventData.amountInAfterFees)).eq(
        applyFactor(swapInfoLog.parsedEventData.amountIn, atomicSwapFeeFactor)
      );
      expect(swapFeesCollectedLog.parsedEventData.swapFeeType).eq(keys.ATOMIC_SWAP_FEE_TYPE);

      await logGasUsage({
        tx,
        label: "gelatoRelayRouter.createOrder with swap",
      });
    });
  });

  describe("updateOrder", () => {
    let updateOrderParams: Parameters<typeof sendUpdateOrder>[0];

    beforeEach(() => {
      updateOrderParams = {
        sender: relaySigner,
        signer: user0,
        feeParams: {
          feeToken: wnt.address,
          feeAmount: expandDecimals(2, 15), // 0.002 ETH
          feeSwapPath: [],
        },
        tokenPermits: [],
        account: user0.address,
        params: {
          sizeDeltaUsd: decimalToFloat(1),
          acceptablePrice: decimalToFloat(2),
          triggerPrice: decimalToFloat(3),
          minOutputAmount: 4,
          validFromTime: 5,
          autoCancel: true,
        },
        key: ethers.constants.HashZero,
        deadline: 9999999999,
        relayRouter: gelatoRelayRouter,
        chainId,
        relayFeeToken: wnt.address,
        relayFeeAmount: expandDecimals(1, 15),
        increaseExecutionFee: false,
      };
    });

    it("DisabledFeature", async () => {
      await dataStore.setBool(keys.gaslessFeatureDisabledKey(gelatoRelayRouter.address), true);
      await expect(sendUpdateOrder(updateOrderParams)).to.be.revertedWithCustomError(errorsContract, "DisabledFeature");
    });

    it("GelatoRelayContext._transferRelayFeeCapped: maxFee", async () => {
      await wnt.connect(user0).approve(router.address, expandDecimals(1, 18));
      await sendCreateOrder(createOrderParams);
      const orderKeys = await getOrderKeys(dataStore, 0, 1);

      updateOrderParams.feeParams.feeAmount = 1;
      await expect(sendUpdateOrder({ ...updateOrderParams, key: orderKeys[0] })).to.be.revertedWith(
        "GelatoRelayContext._transferRelayFeeCapped: maxFee"
      );
    });

    it("InvalidSignature", async () => {
      await expect(
        sendUpdateOrder({
          ...updateOrderParams,
          signature: BAD_SIGNATURE,
        })
      ).to.be.revertedWithCustomError(errorsContract, "InvalidSignature");
    });

    it("onlyGelatoRelay", async () => {
      await expect(
        sendUpdateOrder({
          ...updateOrderParams,
          sender: user0,
        })
      ).to.be.revertedWith("onlyGelatoRelay");
    });

    it("Unauthorized", async () => {
      await wnt.connect(user1).deposit({ value: expandDecimals(1000, 18) });
      await wnt.connect(user1).approve(router.address, expandDecimals(1, 18));
      await sendCreateOrder({ ...createOrderParams, account: user1.address, signer: user1 });
      const orderKeys = await getOrderKeys(dataStore, 0, 1);

      await wnt.connect(user0).approve(router.address, expandDecimals(1, 18));
      await expect(sendUpdateOrder({ ...updateOrderParams, key: orderKeys[0] })).to.be.revertedWithCustomError(
        errorsContract,
        "Unauthorized"
      );
    });

    it("relay fee insufficient allowance", async () => {
      await wnt.connect(user0).approve(router.address, expandDecimals(1, 18));
      await sendCreateOrder(createOrderParams);
      const orderKeys = await getOrderKeys(dataStore, 0, 1);
      await wnt.connect(user0).approve(router.address, 0);

      await expect(sendUpdateOrder({ ...updateOrderParams, key: orderKeys[0] })).to.be.revertedWith(
        "ERC20: insufficient allowance"
      );
    });

    it("updates order and sends relay fee", async () => {
      await wnt.connect(user0).approve(router.address, expandDecimals(1, 18));
      await sendCreateOrder(createOrderParams);
      const orderKeys = await getOrderKeys(dataStore, 0, 1);
      let order = await reader.getOrder(dataStore.address, orderKeys[0]);

      expect(order.numbers.sizeDeltaUsd).eq(decimalToFloat(1000));
      expect(order.numbers.acceptablePrice).eq(decimalToFloat(4900));
      expect(order.numbers.triggerPrice).eq(decimalToFloat(4800));
      expect(order.numbers.minOutputAmount).eq(700);
      expect(order.numbers.validFromTime).eq(0);
      expect(order.flags.autoCancel).eq(false);

      const gelatoRelayFee = updateOrderParams.relayFeeAmount;
      await expectBalance(wnt.address, GELATO_RELAY_ADDRESS, gelatoRelayFee);
      await sendUpdateOrder({ ...updateOrderParams, key: orderKeys[0] });
      await expectBalance(wnt.address, GELATO_RELAY_ADDRESS, bigNumberify(gelatoRelayFee).mul(2));

      order = await reader.getOrder(dataStore.address, orderKeys[0]);

      expect(order.numbers.sizeDeltaUsd).eq(decimalToFloat(1));
      expect(order.numbers.acceptablePrice).eq(decimalToFloat(2));
      expect(order.numbers.triggerPrice).eq(decimalToFloat(3));
      expect(order.numbers.minOutputAmount).eq(4);
      expect(order.numbers.validFromTime).eq(5);
      expect(order.flags.autoCancel).eq(true);
    });

    it("increases execution fee", async () => {
      await wnt.connect(user0).approve(router.address, expandDecimals(1, 18));
      await sendCreateOrder(createOrderParams);
      const orderKeys = await getOrderKeys(dataStore, 0, 1);
      let order = await reader.getOrder(dataStore.address, orderKeys[0]);

      updateOrderParams.relayFeeAmount = expandDecimals(1, 15);
      updateOrderParams.feeParams.feeAmount = expandDecimals(3, 15);

      const initialWethBalance = await wnt.balanceOf(user0.address);
      const gelatoRelayFee = updateOrderParams.relayFeeAmount;
      await expectBalance(wnt.address, GELATO_RELAY_ADDRESS, gelatoRelayFee);
      await sendUpdateOrder({ ...updateOrderParams, key: orderKeys[0] });
      await expectBalance(wnt.address, GELATO_RELAY_ADDRESS, bigNumberify(gelatoRelayFee).mul(2));

      // user receives the residual amount
      await expectBalance(wnt.address, user0.address, initialWethBalance.sub(expandDecimals(1, 15)));
      // and the execution fee stays the same
      order = await reader.getOrder(dataStore.address, orderKeys[0]);
      expect(order.numbers.executionFee).eq(expandDecimals(1, 15));

      await sendUpdateOrder({ ...updateOrderParams, key: orderKeys[0], increaseExecutionFee: true });

      // user doesn't receive the residual amount
      await expectBalance(wnt.address, user0.address, initialWethBalance.sub(expandDecimals(4, 15)));
      // and the execution fee is increased
      order = await reader.getOrder(dataStore.address, orderKeys[0]);
      expect(order.numbers.executionFee).eq(expandDecimals(3, 15));
    });
  });

  describe("cancelOrder", () => {
    let cancelOrderParams: Parameters<typeof sendCancelOrder>[0];

    beforeEach(() => {
      cancelOrderParams = {
        sender: relaySigner,
        signer: user0,
        feeParams: {
          feeToken: wnt.address,
          feeAmount: expandDecimals(2, 15), // 0.002 ETH
          feeSwapPath: [],
        },
        tokenPermits: [],
        key: ethers.constants.HashZero,
        account: user0.address,
        deadline: 9999999999,
        relayRouter: gelatoRelayRouter,
        chainId,
        relayFeeToken: wnt.address,
        relayFeeAmount: expandDecimals(1, 15),
      };
    });

    it("DisabledFeature", async () => {
      await dataStore.setBool(keys.gaslessFeatureDisabledKey(gelatoRelayRouter.address), true);
      await expect(sendCancelOrder(cancelOrderParams)).to.be.revertedWithCustomError(errorsContract, "DisabledFeature");
    });

    it("GelatoRelayContext._transferRelayFeeCapped: maxFee", async () => {
      await wnt.connect(user0).approve(router.address, expandDecimals(1, 18));
      await sendCreateOrder(createOrderParams);
      const orderKeys = await getOrderKeys(dataStore, 0, 1);

      cancelOrderParams.feeParams.feeAmount = 1;
      await expect(sendCancelOrder({ ...cancelOrderParams, key: orderKeys[0] })).to.be.revertedWith(
        "GelatoRelayContext._transferRelayFeeCapped: maxFee"
      );
    });

    it("InvalidSignature", async () => {
      await expect(
        sendCancelOrder({
          ...cancelOrderParams,
          signature: BAD_SIGNATURE,
        })
      ).to.be.revertedWithCustomError(errorsContract, "InvalidSignature");
    });

    it("onlyGelatoRelay", async () => {
      await expect(
        sendCancelOrder({
          ...cancelOrderParams,
          sender: user0,
        })
      ).to.be.revertedWith("onlyGelatoRelay");
    });

    it("Unauthorized", async () => {
      await wnt.connect(user1).deposit({ value: expandDecimals(1000, 18) });
      await wnt.connect(user1).approve(router.address, expandDecimals(1, 18));
      await sendCreateOrder({ ...createOrderParams, account: user1.address, signer: user1 });
      const orderKeys = await getOrderKeys(dataStore, 0, 1);

      await wnt.connect(user0).approve(router.address, expandDecimals(1, 18));
      await expect(sendCancelOrder({ ...cancelOrderParams, key: orderKeys[0] })).to.be.revertedWithCustomError(
        errorsContract,
        "Unauthorized"
      );
    });

    it("cancels order and sends relay fee", async () => {
      await wnt.connect(user0).approve(router.address, expandDecimals(1, 18));
      await sendCreateOrder(createOrderParams);
      const orderKeys = await getOrderKeys(dataStore, 0, 1);
      const gelatoRelayFee = createOrderParams.relayFeeAmount;

      await expectBalance(wnt.address, GELATO_RELAY_ADDRESS, gelatoRelayFee);
      await sendCancelOrder({ ...cancelOrderParams, key: orderKeys[0] });
      await expectBalance(wnt.address, GELATO_RELAY_ADDRESS, bigNumberify(gelatoRelayFee).mul(2));

      const orderCount = await getOrderCount(dataStore);
      expect(orderCount).eq(0);
    });
  });

  it.skip("swaps should not work if sequencer is down");
});
