import { addressToBytes32, Options } from "@layerzerolabs/lz-v2-utilities";
import { Trans } from "@lingui/macro";
import type { Signer } from "ethers";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Skeleton from "react-loading-skeleton";
import useSWR from "swr";
import {
  Address,
  BaseError,
  decodeErrorResult,
  encodeAbiParameters,
  encodePacked,
  Hex,
  PublicClient,
  StateOverride,
  toHex,
  zeroAddress,
} from "viem";
import { useAccount, usePublicClient } from "wagmi";

import { getChainName, UiSettlementChain, UiSourceChain } from "config/chains";
import { getContract } from "config/contracts";
import { getSwapDebugSettings } from "config/externalSwaps";
import { CHAIN_ID_TO_NETWORK_ICON } from "config/icons";
import {
  getMultichainTokenId,
  getStargateEndpointId,
  getStargatePoolAddress,
  MULTI_CHAIN_TOKEN_MAPPING,
  MULTI_CHAIN_WITHDRAW_SUPPORTED_TOKENS,
  OVERRIDE_ERC20_BYTECODE,
} from "context/GmxAccountContext/config";
import { useGmxAccountSettlementChainId, useGmxAccountWithdrawViewTokenAddress } from "context/GmxAccountContext/hooks";
import { IStargateAbi } from "context/GmxAccountContext/stargatePools";
import { TokenChainData } from "context/GmxAccountContext/types";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import {
  selectGasPaymentToken,
  selectMarketsInfoData,
  selectRelayerFeeToken,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { makeSelectFindSwapPath } from "context/SyntheticsStateContext/selectors/tradeSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getOracleParamsPayload, getOraclePriceParamsForRelayFee } from "domain/synthetics/express/oracleParamsUtils";
import { getRelayerFeeParams } from "domain/synthetics/express/relayParamsUtils";
import { ExpressParams, MultichainRelayParamsPayload } from "domain/synthetics/express/types";
import { callRelayTransaction, GELATO_RELAY_ADDRESS } from "domain/synthetics/gassless/txns/expressOrderDebug";
import { buildAndSignBridgeOutTxn } from "domain/synthetics/orders/expressOrderUtils";
import { useTokenRecentPricesRequest } from "domain/synthetics/tokens";
import { getSwapAmountsByToValue } from "domain/synthetics/trade/utils/swap";
import { convertToTokenAmount, convertToUsd, TokenData } from "domain/tokens";
import { helperToast } from "lib/helperToast";
import {
  bigintToNumber,
  expandDecimals,
  formatAmountFree,
  formatBalanceAmount,
  formatUsd,
  parseValue,
  USD_DECIMALS,
} from "lib/numbers";
import { getByKey } from "lib/objects";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import { ExpressTxnData } from "lib/transactions/sendExpressTransaction";
import { switchNetwork } from "lib/wallets";
import { useEthersSigner } from "lib/wallets/useEthersSigner";
import { abis } from "sdk/abis";
import { GMX_SIMULATION_ORIGIN } from "sdk/configs/dataStore";
import { convertTokenAddress, getToken } from "sdk/configs/tokens";
import { extendError, OrderErrorContext } from "sdk/utils/errors";
import { gelatoRelay } from "sdk/utils/gelatoRelay";
import { ExternalCallsPayload } from "sdk/utils/orderTransactions";
import { getMidPrice } from "sdk/utils/tokens";
import { BridgeOutParamsStruct } from "typechain-types-arbitrum-sepolia/MultichainTransferRouter";
import {
  MessagingFeeStruct,
  OFTFeeDetailStruct,
  OFTLimitStruct,
  OFTReceiptStruct,
  SendParamStruct,
} from "typechain-types-stargate/interfaces/IStargate";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import Button from "components/Button/Button";
import NumberInput from "components/NumberInput/NumberInput";
import {
  useGmxAccountTokensDataObject,
  useGmxAccountWithdrawNetworks,
  useMultichainTokensRequest,
} from "components/Synthetics/GmxAccountModal/hooks";
import TokenIcon from "components/TokenIcon/TokenIcon";
import { ValueTransition } from "components/ValueTransition/ValueTransition";

import { SyntheticsInfoRow } from "../SyntheticsInfoRow";
import { OftCmd, SEND_MODE_TAXI } from "./OftCmd";
import { Selector } from "./Selector";

// TODO: debound input value to make requests

export const WithdrawView = () => {
  const [settlementChainId] = useGmxAccountSettlementChainId();
  const { chainId: walletChainId, address: account, isConnected } = useAccount();
  const [inputValue, setInputValue] = useState("");
  const [selectedTokenAddress, setSelectedTokenAddress] = useGmxAccountWithdrawViewTokenAddress();

  const gmxAccountTokensData = useGmxAccountTokensDataObject();
  const networks = useGmxAccountWithdrawNetworks();
  const multichainTokens = useMultichainTokensRequest();
  const gasPaymentToken = useSelector(selectGasPaymentToken);
  const relayerFeeToken = useSelector(selectRelayerFeeToken);

  const signer = useEthersSigner();
  const tokensData = useTokensData();
  const marketsInfoData = useSelector(selectMarketsInfoData);
  const settlementChainClient = usePublicClient({ chainId: settlementChainId });

  const selectedToken = useMemo(() => {
    return getByKey(gmxAccountTokensData, selectedTokenAddress);
  }, [selectedTokenAddress, gmxAccountTokensData]);

  const selectedTokenSettlementChainTokenId =
    selectedTokenAddress && settlementChainId !== undefined
      ? getMultichainTokenId(settlementChainId, selectedTokenAddress)
      : undefined;

  const inputAmount = selectedToken ? parseValue(inputValue, selectedToken.decimals) : undefined;
  const inputAmountUsd = selectedToken
    ? convertToUsd(inputAmount, selectedToken.decimals, selectedToken.prices.maxPrice)
    : undefined;

  const options = useMemo(() => {
    return MULTI_CHAIN_WITHDRAW_SUPPORTED_TOKENS[settlementChainId]
      .map((tokenAddress) => gmxAccountTokensData[tokenAddress])
      .filter((token) => token.address !== zeroAddress)
      .sort((a, b) => {
        const aFloat = bigintToNumber(a.balance ?? 0n, a.decimals);
        const bFloat = bigintToNumber(b.balance ?? 0n, b.decimals);

        return bFloat - aFloat;
      });
  }, [gmxAccountTokensData, settlementChainId]);

  const handleMaxButtonClick = useCallback(() => {
    if (selectedToken === undefined || selectedToken.balance === undefined || selectedToken.balance === 0n) {
      return;
    }

    setInputValue(formatAmountFree(selectedToken.balance, selectedToken.decimals));
  }, [selectedToken]);

  const gmxAccountTokenBalanceUsd = convertToUsd(
    selectedToken?.balance,
    selectedToken?.decimals,
    selectedToken?.prices.maxPrice
  );

  const sourceChainSelectedUnwrappedToken = useMemo((): TokenChainData | undefined => {
    if (walletChainId === undefined || selectedToken === undefined) {
      return undefined;
    }

    const unwrappedSelectedTokenAddress = convertTokenAddress(settlementChainId, selectedToken?.address, "native");
    const sourceChainToken = multichainTokens.find(
      (token) => token.address === unwrappedSelectedTokenAddress && token.sourceChainId === walletChainId
    );

    return sourceChainToken;
  }, [multichainTokens, selectedToken, settlementChainId, walletChainId]);

  const sourceChainTokenBalanceUsd = useMemo(() => {
    if (sourceChainSelectedUnwrappedToken === undefined) {
      return 0n;
    }

    return convertToUsd(
      sourceChainSelectedUnwrappedToken.sourceChainBalance,
      sourceChainSelectedUnwrappedToken.sourceChainDecimals,
      sourceChainSelectedUnwrappedToken.sourceChainPrices?.maxPrice
    );
  }, [sourceChainSelectedUnwrappedToken]);

  const { nextGmxAccountBalanceUsd, nextSourceChainBalanceUsd } = useMemo(() => {
    if (selectedToken === undefined || inputAmount === undefined || inputAmountUsd === undefined) {
      return { nextGmxAccountBalanceUsd: undefined, nextSourceChainBalanceUsd: undefined };
    }

    const nextGmxAccountBalanceUsd = (gmxAccountTokenBalanceUsd ?? 0n) - (inputAmountUsd ?? 0n);
    const nextSourceChainBalanceUsd = (sourceChainTokenBalanceUsd ?? 0n) + (inputAmountUsd ?? 0n);

    return { nextGmxAccountBalanceUsd, nextSourceChainBalanceUsd };
  }, [selectedToken, inputAmount, inputAmountUsd, gmxAccountTokenBalanceUsd, sourceChainTokenBalanceUsd]);

  const selectFindSwapPath = useMemo(() => {
    return makeSelectFindSwapPath(gasPaymentToken?.address, relayerFeeToken?.address, true);
  }, [gasPaymentToken?.address, relayerFeeToken?.address]);
  const findSwapPath = useSelector(selectFindSwapPath);

  const sendParamsWithoutSlippage: SendParamStruct | undefined = useMemo(() => {
    if (!account || inputAmount === undefined || inputAmount <= 0n || walletChainId === undefined) {
      return;
    }

    const oftCmd: OftCmd = new OftCmd(SEND_MODE_TAXI, []);

    const dstEid = getStargateEndpointId(walletChainId);

    if (dstEid === undefined) {
      return;
    }

    const to = toHex(addressToBytes32(account));
    const builder = Options.newOptions();

    const sendParams: SendParamStruct = {
      dstEid,
      to,
      amountLD: inputAmount,
      minAmountLD: 0n,
      extraOptions: builder.toHex(),
      composeMsg: "",
      oftCmd: oftCmd.toBytes(),
    };

    return sendParams;
  }, [account, inputAmount, walletChainId]);

  const quoteOftCondition =
    sendParamsWithoutSlippage !== undefined &&
    selectedTokenSettlementChainTokenId !== undefined &&
    settlementChainClient !== undefined &&
    selectedTokenAddress !== undefined;
  const quoteOftQuery = useSWR<
    | {
        limit: OFTLimitStruct;
        oftFeeDetails: OFTFeeDetailStruct[];
        receipt: OFTReceiptStruct;
      }
    | undefined
  >(
    quoteOftCondition
      ? [
          "quoteOft",
          sendParamsWithoutSlippage.dstEid,
          sendParamsWithoutSlippage.to,
          sendParamsWithoutSlippage.amountLD,
          selectedTokenSettlementChainTokenId?.stargate,
        ]
      : null,
    {
      fetcher: async () => {
        if (!quoteOftCondition) {
          return;
        }

        const settlementChainStargateAddress = selectedTokenSettlementChainTokenId!.stargate;

        const [limit, oftFeeDetails, receipt]: [OFTLimitStruct, OFTFeeDetailStruct[], OFTReceiptStruct] =
          (await settlementChainClient.readContract({
            address: settlementChainStargateAddress,
            abi: IStargateAbi,
            functionName: "quoteOFT",
            args: [sendParamsWithoutSlippage],
          })) as any;

        return {
          limit,
          oftFeeDetails,
          receipt,
        };
      },
      refreshInterval: CONFIG_UPDATE_INTERVAL,
    }
  );
  const quoteOft = quoteOftQuery.data;

  let protocolFeeAmount: bigint | undefined = undefined;
  let protocolFeeUsd: bigint | undefined = undefined;
  if (quoteOft !== undefined && selectedToken !== undefined) {
    protocolFeeAmount = 0n;
    for (const feeDetail of quoteOft.oftFeeDetails) {
      if (feeDetail.feeAmountLD) {
        protocolFeeAmount -= feeDetail.feeAmountLD as bigint;
      }
    }
    protocolFeeUsd = convertToUsd(
      protocolFeeAmount,
      selectedTokenSettlementChainTokenId?.decimals,
      getMidPrice(selectedToken.prices)
    );
  }

  const lastMinAmountLD = useRef<bigint | undefined>(undefined);
  const lastMaxAmountLD = useRef<bigint | undefined>(undefined);
  if (quoteOft && quoteOft.limit.maxAmountLD && quoteOft.limit.minAmountLD) {
    lastMaxAmountLD.current = quoteOft.limit.maxAmountLD as bigint;
    lastMinAmountLD.current = quoteOft.limit.minAmountLD as bigint;
  }
  const isBelowLimit =
    lastMinAmountLD.current !== undefined && inputAmount !== undefined && inputAmount > 0n
      ? inputAmount < lastMinAmountLD.current
      : false;
  const lowerLimitFormatted =
    isBelowLimit && selectedTokenSettlementChainTokenId && lastMinAmountLD.current !== undefined
      ? formatBalanceAmount(lastMinAmountLD.current, selectedTokenSettlementChainTokenId?.decimals)
      : undefined;
  const isAboveLimit =
    lastMaxAmountLD.current !== undefined && inputAmount !== undefined && inputAmount > 0n
      ? inputAmount > lastMaxAmountLD.current
      : false;
  const upperLimitFormatted =
    isAboveLimit && selectedTokenSettlementChainTokenId && lastMaxAmountLD.current !== undefined
      ? formatBalanceAmount(lastMaxAmountLD.current, selectedTokenSettlementChainTokenId?.decimals)
      : undefined;

  const handleWithdraw = useCallback(async () => {
    if (walletChainId === undefined || selectedTokenAddress === undefined) {
      return;
    }

    const dstEid = getStargateEndpointId(walletChainId);
    const stargateAddress = getStargatePoolAddress(settlementChainId, selectedTokenAddress);

    if (
      selectedToken === undefined ||
      inputAmount === undefined ||
      dstEid === undefined ||
      stargateAddress === undefined ||
      signer === undefined ||
      marketsInfoData === undefined ||
      tokensData === undefined ||
      settlementChainClient === undefined ||
      relayerFeeToken === undefined ||
      gasPaymentToken === undefined
    ) {
      helperToast.error("Missing required parameters");
      return;
    }

    const bridgeOutParams: BridgeOutParamsStruct = {
      token: selectedTokenAddress,
      amount: inputAmount,
      data: encodeAbiParameters(
        [
          {
            type: "uint32",
            name: "dstEid",
          },
        ],
        [dstEid]
      ),
      provider: stargateAddress,
    };

    const relayContractAddress = getContract(settlementChainId, "MultichainTransferRouter");

    const userNonce = await settlementChainClient.readContract({
      address: relayContractAddress,
      abi: abis.GelatoRelayRouterArbitrumSepolia,
      functionName: "userNonces",
      args: [account],
    });
    console.log({
      gasPaymentToken,
      relayerFeeToken,
    });

    const externalCalls: ExternalCallsPayload = {
      sendTokens: [],
      sendAmounts: [],
      externalCallTargets: [],
      externalCallDataList: [],
      refundTokens: [],
      refundReceivers: [],
    };

    const baseRelayerFeeAmount = convertToTokenAmount(
      expandDecimals(1, USD_DECIMALS - 2),
      relayerFeeToken.decimals,
      relayerFeeToken.prices.maxPrice
    )!;

    const swapAmounts = getSwapAmountsByToValue({
      tokenIn: gasPaymentToken,
      tokenOut: relayerFeeToken,
      amountOut: baseRelayerFeeAmount,
      isLimit: false,
      findSwapPath,
      uiFeeFactor: 0n,
    });

    const baseRelayFeeSwapParams = getRelayerFeeParams({
      chainId: settlementChainId,
      srcChainId: walletChainId as UiSourceChain,
      account: account as Address,
      relayerFeeTokenAmount: baseRelayerFeeAmount,
      totalNetworkFeeAmount: baseRelayerFeeAmount,
      relayerFeeTokenAddress: relayerFeeToken.address,
      gasPaymentTokenAddress: gasPaymentToken.address,
      internalSwapAmounts: swapAmounts,
      externalSwapQuote: undefined,
      tokensData,
      gasPaymentAllowanceData: undefined,
      forceExternalSwaps: getSwapDebugSettings()?.forceExternalSwaps ?? false,
    });

    console.log("baseRelayFeeSwapParams", baseRelayFeeSwapParams);

    if (!baseRelayFeeSwapParams) {
      helperToast.error("Failed to get relayer fee params");
      return;
    }

    const relayParamsPayload: MultichainRelayParamsPayload = {
      oracleParams: getOracleParamsPayload(
        getOraclePriceParamsForRelayFee({
          chainId: settlementChainId,
          marketsInfoData,
          tokensData,
          // relayFeeParams: {
          //   externalCalls,
          //   feeParams: {
          //     feeToken: DEV_WETH,
          //     feeAmount: FEE_AMOUNT,
          //     feeSwapPath: [],
          //   },
          //   relayerTokenAddress: DEV_WETH,
          //   relayerTokenAmount: FEE_AMOUNT,
          //   totalNetworkFeeAmount: FEE_AMOUNT,
          //   gasPaymentTokenAmount: FEE_AMOUNT,
          //   gasPaymentTokenAddress: DEV_WETH,
          //   isOutGasTokenBalance: false,
          //   needGasPaymentTokenApproval: false,
          //   externalSwapGasLimit: 0n,
          // },
          relayFeeParams: baseRelayFeeSwapParams,
        })
      ),
      tokenPermits: [],
      externalCalls,
      fee: {
        feeToken: baseRelayFeeSwapParams.gasPaymentTokenAddress,
        feeAmount: baseRelayFeeSwapParams.totalNetworkFeeAmount,
        feeSwapPath: [],
      },
      userNonce: userNonce,
      deadline: 9999999999999n,
      desChainId: BigInt(settlementChainId),
    };

    console.log({
      relayParamsPayload,
    });

    // return await client.call({
    //   account: GMX_SIMULATION_ORIGIN as Address,
    //   to: relayRouterAddress,
    //   data: encodePacked(
    //     ["bytes", "address", "address", "uint256"],
    //     [calldata as Hex, GELATO_RELAY_ADDRESS, gelatoRelayFeeToken as Address, gelatoRelayFeeAmount]
    //   ),
    // });

    const { callData, feeAmount, feeToken, to }: ExpressTxnData = await buildAndSignBridgeOutTxn({
      chainId: settlementChainId,
      signer: signer,
      relayParamsPayload,
      params: bridgeOutParams,
      emptySignature: true,
    });

    try {
      const estimateResult = await fallbackCustomError(async () => {
        const stateOverride: StateOverride = [];

        if (!selectedToken.isWrapped) {
          const stateOverrideForErc20: StateOverride[number] = {
            address: selectedTokenAddress as Address,
            code: OVERRIDE_ERC20_BYTECODE,
          };
          stateOverride.push(stateOverrideForErc20);
        } else {
          throw new Error("Not implemented");
          // const stateOverrideForNative: StateOverride[number] = {
          //   address: account as Address,
          //   balance: fakeInputAmount * 10n,
          // };
          // stateOverride.push(stateOverrideForNative);
        }

        const data = encodePacked(
          ["bytes", "address", "address", "uint256"],
          [callData as Hex, GELATO_RELAY_ADDRESS, feeToken as Address, feeAmount]
        );

        console.log({
          from: GMX_SIMULATION_ORIGIN as Address,
          to: to as Address,
          data,
          stateOverride,
          selectedTokenAddress,
        });

        return await settlementChainClient.estimateGas({
          account: GMX_SIMULATION_ORIGIN as Address,
          to: to as Address,
          data,
          // stateOverride,
        });
      }, "gasLimit");

      const fee = await gelatoRelay.getEstimatedFee(
        BigInt(settlementChainId),
        baseRelayFeeSwapParams.relayerTokenAddress,
        estimateResult,
        false
      );

      console.log({
        fee,
      });
    } catch (error) {
      debugger;
      console.log({
        error,
      });
    }

    // await gelatoRelay.getEstimatedFee(BigInt(settlementChainId), baseRelayFeeSwapParams.relayerTokenAddress, 0n, false);
    // try {
    //   await simulateWithdraw({
    //     chainId: settlementChainId,
    //     expressParams: {
    //       isSponsoredCall: false,
    //       relayParamsPayload,
    //       relayFeeParams: baseRelayFeeSwapParams,
    //       subaccount: undefined,
    //     },
    //     params: bridgeOutParams,
    //     signer,
    //     settlementChainClient: settlementChainClient,
    //   });
    // } catch (error) {
    //   const toastContext = getTxnErrorToast(
    //     settlementChainId,
    //     {
    //       errorMessage: error.message,
    //     },
    //     {
    //       defaultMessage: error.name,
    //     }
    //   );
    //   helperToast.error(toastContext.errorContent, {
    //     autoClose: toastContext.autoCloseToast,
    //   });
    // }

    // const signedTxnData: ExpressTxnData = await buildAndSignBridgeOutTxn({
    //   chainId: settlementChainId,
    //   signer: signer,
    //   relayParamsPayload,
    //   params: bridgeOutParams,
    // });

    // await sendExpressTransaction({
    //   chainId: settlementChainId,
    //   txnData: signedTxnData,
    //   // TODO
    //   isSponsoredCall: false,
    // });
  }, [
    account,
    inputAmount,
    findSwapPath,
    gasPaymentToken,
    marketsInfoData,
    relayerFeeToken,
    selectedToken,
    selectedTokenAddress,
    settlementChainId,
    settlementChainClient,
    signer,
    tokensData,
    walletChainId,
  ]);

  const hasSelectedToken = selectedTokenAddress !== undefined;
  useEffect(
    function fallbackWithdrawTokens() {
      if (hasSelectedToken || !walletChainId) {
        return;
      }

      const tokenIdMap = MULTI_CHAIN_TOKEN_MAPPING[settlementChainId]?.[walletChainId];
      if (!tokenIdMap) {
        return;
      }

      let maxGmxAccountBalanceUsd = 0n;
      let maxBalanceSettlementChainTokenAddress: string | undefined = undefined;

      for (const sourceChainTokenAddress in tokenIdMap) {
        const tokenId = tokenIdMap[sourceChainTokenAddress];
        const tokenData = gmxAccountTokensData[tokenId.settlementChainTokenAddress];
        if (tokenData === undefined) {
          continue;
        }

        const prices = tokenData.prices;
        const balance = tokenData.balance;
        if (prices === undefined || balance === undefined) {
          continue;
        }

        const price = getMidPrice(prices);
        const balanceUsd = convertToUsd(balance, tokenData.decimals, price)!;
        if (balanceUsd > maxGmxAccountBalanceUsd) {
          maxGmxAccountBalanceUsd = balanceUsd;
          maxBalanceSettlementChainTokenAddress = tokenId.settlementChainTokenAddress;
        }
      }

      if (maxBalanceSettlementChainTokenAddress) {
        setSelectedTokenAddress(maxBalanceSettlementChainTokenAddress);
      }
    },
    [gmxAccountTokensData, hasSelectedToken, setSelectedTokenAddress, settlementChainId, walletChainId]
  );

  return (
    <div className="grow overflow-y-auto p-16">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <div className="text-body-small text-slate-100">Asset</div>
          <Selector
            value={selectedTokenAddress}
            onChange={setSelectedTokenAddress}
            placeholder="Select token"
            button={
              selectedTokenAddress && selectedToken ? (
                <div className="flex items-center gap-8">
                  <TokenIcon symbol={selectedToken.symbol} displaySize={20} importSize={40} />
                  <span>{selectedToken.symbol}</span>
                </div>
              ) : undefined
            }
            options={options}
            item={WithdrawAssetItem}
            itemKey={withdrawAssetItemKey}
          />
        </div>

        {/* Network selector */}
        <div className="flex flex-col gap-4">
          <div className="text-body-small text-slate-100">
            <Trans>To Network</Trans>
          </div>
          <Selector
            value={walletChainId}
            onChange={(value) => {
              switchNetwork(Number(value), isConnected);
            }}
            placeholder="Select network"
            button={
              <div className="flex items-center gap-8">
                {walletChainId !== undefined ? (
                  <>
                    <img
                      src={CHAIN_ID_TO_NETWORK_ICON[walletChainId]}
                      alt={getChainName(walletChainId)}
                      className="size-20"
                    />
                    <span className="text-body-large">{getChainName(walletChainId)}</span>
                  </>
                ) : (
                  <>
                    <Skeleton
                      baseColor="#B4BBFF1A"
                      highlightColor="#B4BBFF1A"
                      width={20}
                      height={20}
                      borderRadius={10}
                    />
                    <Skeleton baseColor="#B4BBFF1A" highlightColor="#B4BBFF1A" width={40} height={16} />
                  </>
                )}
              </div>
            }
            options={networks}
            item={NetworkItem}
            itemKey={networkItemKey}
          />
        </div>
      </div>

      <div className="h-20" />

      <div className="flex flex-col gap-4">
        <div className="text-body-small flex items-center justify-between text-slate-100">
          <Trans>Withdraw</Trans>
          {selectedToken !== undefined && selectedToken.balance !== undefined && selectedToken !== undefined && (
            <div>
              <Trans>Available:</Trans>{" "}
              {formatBalanceAmount(selectedToken.balance, selectedToken.decimals, selectedToken.symbol)}
            </div>
          )}
        </div>
        <div className="text-body-large relative">
          <NumberInput
            value={inputValue}
            onValueChange={(e) => setInputValue(e.target.value)}
            className="text-body-large w-full rounded-4 bg-cold-blue-900 py-12 pl-14 pr-72"
            placeholder={`0.0 ${selectedToken?.symbol || ""}`}
          />
          {inputValue !== "" && (
            <div className="pointer-events-none absolute left-14 top-1/2 flex max-w-[calc(100%-72px)] -translate-y-1/2 overflow-hidden">
              <div className="invisible whitespace-pre font-[RelativeNumber]">{inputValue} </div>
              <div className="text-slate-100">{selectedToken?.symbol || ""}</div>
            </div>
          )}
          <button
            className="text-body-small absolute right-14 top-1/2 -translate-y-1/2 rounded-4 bg-cold-blue-500 px-8 py-2 hover:bg-[#484e92] active:bg-[#505699]"
            onClick={handleMaxButtonClick}
          >
            <Trans>MAX</Trans>
          </button>
        </div>
        <div className="text-body-small text-slate-100">{formatUsd(inputAmountUsd ?? 0n)}</div>
      </div>

      {isAboveLimit && (
        <AlertInfoCard type="warning" className="my-4">
          <Trans>
            The amount you are trying to withdraw exceeds the limit. Please try an amount smaller than{" "}
            {upperLimitFormatted}.
          </Trans>
        </AlertInfoCard>
      )}
      {isBelowLimit && (
        <AlertInfoCard type="warning" className="my-4">
          <Trans>
            The amount you are trying to withdraw is below the limit. Please try an amount larger than{" "}
            {lowerLimitFormatted}.
          </Trans>
        </AlertInfoCard>
      )}

      <div className="h-32" />

      <div className="flex flex-col gap-8">
        <SyntheticsInfoRow label="Network Fee" value="$0.37" />
        <SyntheticsInfoRow
          label="Withdraw Fee"
          value={protocolFeeUsd !== undefined ? formatUsd(protocolFeeUsd) : "..."}
        />
        <SyntheticsInfoRow
          label="GMX Balance"
          value={
            <ValueTransition from={formatUsd(gmxAccountTokenBalanceUsd)} to={formatUsd(nextGmxAccountBalanceUsd)} />
          }
        />
        <SyntheticsInfoRow
          label="Asset Balance"
          value={
            <ValueTransition from={formatUsd(sourceChainTokenBalanceUsd)} to={formatUsd(nextSourceChainBalanceUsd)} />
          }
        />
      </div>

      <div className="h-16" />

      <Button variant="primary" className="w-full" onClick={handleWithdraw}>
        <Trans>Withdraw</Trans>
      </Button>
    </div>
  );
};

function networkItemKey(option: { id: number; name: string; fee: string }) {
  return option.id;
}

function NetworkItem({ option }: { option: { id: number; name: string; fee: string } }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-8">
        <img src={CHAIN_ID_TO_NETWORK_ICON[option.id]} alt={option.name} className="size-20" />
        <span className="text-body-large">{option.name}</span>
      </div>
      {/* <span className="text-body-medium text-slate-100">{option.fee}</span> */}
    </div>
  );
}

function WithdrawAssetItem({ option }: { option: TokenData }) {
  return (
    <div className="flex items-center justify-between gap-8">
      <div className="flex gap-8">
        <TokenIcon symbol={option.symbol} displaySize={20} importSize={40} />
        <span>
          {option.symbol} <span className="text-slate-100">{option.name}</span>
        </span>
      </div>
      <div className="text-slate-100">
        {option.balance !== undefined ? formatBalanceAmount(option.balance, option.decimals) : "-"}
      </div>
    </div>
  );
}

function withdrawAssetItemKey(option: TokenData) {
  return option.address;
}

async function simulateWithdraw({
  settlementChainClient,
  signer,
  chainId,
  expressParams,
  params,
}: {
  settlementChainClient: PublicClient;
  signer: Signer;
  chainId: UiSettlementChain;
  expressParams: ExpressParams;
  params: BridgeOutParamsStruct;
}): Promise<void> {
  if (!settlementChainClient) {
    throw new Error("settlementChainClient is required");
  }

  const { callData, feeAmount, feeToken, to } = await buildAndSignBridgeOutTxn({
    signer,
    chainId,
    relayParamsPayload: expressParams.relayParamsPayload as MultichainRelayParamsPayload,
    params,
    emptySignature: true,
  });

  await fallbackCustomError(async () => {
    await callRelayTransaction({
      calldata: callData,
      client: settlementChainClient!,
      gelatoRelayFeeAmount: feeAmount,
      gelatoRelayFeeToken: feeToken,
      relayRouterAddress: to as Address,
    });
  }, "simulation");
}

async function fallbackCustomError<T = void>(f: () => Promise<T>, errorContext: OrderErrorContext) {
  try {
    return await f();
  } catch (error) {
    if ("walk" in error && typeof error.walk === "function") {
      const errorWithData = (error as BaseError).walk((e) => "data" in (e as any)) as (Error & { data: string }) | null;

      if (errorWithData && errorWithData.data) {
        const data = errorWithData.data;

        const decodedError = decodeErrorResult({
          abi: abis.CustomErrorsArbitrumSepolia,
          data: data as Hex,
        });

        const customError = new Error();

        customError.name = decodedError.errorName;
        customError.message = JSON.stringify(decodedError, null, 2);
        // customError.cause = error;

        throw extendError(customError, {
          errorContext,
        });
      }
    }

    throw extendError(error, {
      errorContext,
    });
  }
}

function useMultichainQuoteFeeUsd({
  quoteSend,
  quoteOft,
}: {
  quoteSend: MessagingFeeStruct | undefined;
  quoteOft:
    | {
        limit: OFTLimitStruct;
        oftFeeDetails: OFTFeeDetailStruct[];
        receipt: OFTReceiptStruct;
      }
    | undefined;
}): {
  networkFee: bigint | undefined;
  networkFeeUsd: bigint | undefined;
  protocolFeeAmount: bigint | undefined;
  protocolFeeUsd: bigint | undefined;
  amountReceivedLD: bigint | undefined;
} {
  const [settlementChainId] = useGmxAccountSettlementChainId();
  const { chainId: walletChainId } = useAccount();
  const { pricesData: settlementChainTokenPricesData } = useTokenRecentPricesRequest(settlementChainId);
  const [withdrawViewTokenAddress] = useGmxAccountWithdrawViewTokenAddress();

  if (!withdrawViewTokenAddress) {
    return {
      networkFee: undefined,
      networkFeeUsd: undefined,
      protocolFeeAmount: undefined,
      protocolFeeUsd: undefined,
      amountReceivedLD: undefined,
    };
  }

  // const sourceChainTokenId = getMappedTokenId(
  //   settlementChainId as UiSettlementChain,
  //   withdrawViewTokenAddress,
  //   walletChainId as UiSourceChain
  // );

  const settlementChainTokenId = getMultichainTokenId(settlementChainId, withdrawViewTokenAddress);

  if (!settlementChainTokenId) {
    return {
      networkFee: undefined,
      networkFeeUsd: undefined,
      protocolFeeAmount: undefined,
      protocolFeeUsd: undefined,
      amountReceivedLD: undefined,
    };
  }

  const nativeFee = quoteSend?.nativeFee as bigint;
  const amountReceivedLD = quoteOft?.receipt.amountReceivedLD as bigint;

  const nativeTokenPrices = settlementChainTokenPricesData?.[zeroAddress];
  const nativeTokenPrice = nativeTokenPrices ? getMidPrice(nativeTokenPrices) : undefined;
  const withdrawTokenPrices = settlementChainTokenPricesData?.[withdrawViewTokenAddress];
  const withdrawTokenPrice = withdrawTokenPrices ? getMidPrice(withdrawTokenPrices) : undefined;
  // ETH is the same as the source chain
  // TODO: check if this is correct
  const settlementChainNativeTokenDecimals = getToken(settlementChainId, zeroAddress)?.decimals ?? 18;

  // const sourceChainDepositTokenDecimals = sourceChainTokenId?.decimals;

  const nativeFeeUsd =
    nativeFee !== undefined
      ? convertToUsd(nativeFee as bigint, settlementChainNativeTokenDecimals, nativeTokenPrice)
      : undefined;

  let protocolFeeAmount: bigint | undefined = undefined;
  let protocolFeeUsd: bigint | undefined = undefined;
  if (quoteOft !== undefined) {
    protocolFeeAmount = 0n;
    for (const feeDetail of quoteOft.oftFeeDetails) {
      if (feeDetail.feeAmountLD) {
        protocolFeeAmount -= feeDetail.feeAmountLD as bigint;
      }
    }
    protocolFeeUsd = convertToUsd(protocolFeeAmount, settlementChainTokenId?.decimals, withdrawTokenPrice);
  }

  return {
    networkFee: nativeFee,
    networkFeeUsd: nativeFeeUsd,
    protocolFeeAmount,
    protocolFeeUsd,
    amountReceivedLD,
  };
}
