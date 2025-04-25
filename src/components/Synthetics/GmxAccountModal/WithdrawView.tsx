import { Trans } from "@lingui/macro";
import { useCallback, useEffect, useMemo, useState } from "react";
import Skeleton from "react-loading-skeleton";
import { encodeAbiParameters } from "viem";
import { useAccount, usePublicClient } from "wagmi";

import { getChainName } from "config/chains";
import { getContract } from "config/contracts";
import { CHAIN_ID_TO_NETWORK_ICON } from "config/icons";
import {
  MULTI_CHAIN_SUPPORTED_TOKEN_MAP,
  getStargateEndpointId,
  getStargatePoolAddress,
} from "context/GmxAccountContext/config";
import { useGmxAccountSettlementChainId } from "context/GmxAccountContext/hooks";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { selectMarketsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getOracleParamsPayload, getOraclePriceParamsForRelayFee } from "domain/synthetics/express/oracleParamsUtils";
import { MultichainRelayParamsPayload } from "domain/synthetics/express/types";
import { useExpressOrdersParams } from "domain/synthetics/express/useRelayerFeeHandler";
import { buildAndSignBridgeOutTxn } from "domain/synthetics/orders/expressOrderUtils";
import { TokenData, convertToUsd } from "domain/tokens";
import { helperToast } from "lib/helperToast";
import { formatAmountFree, formatBalanceAmount, formatUsd, parseValue } from "lib/numbers";
import { getByKey } from "lib/objects";
import { ExpressTxnData, sendExpressTransaction } from "lib/transactions/sendExpressTransaction";
import { useEthersSigner } from "lib/wallets/useEthersSigner";
import { abis } from "sdk/abis";
import { getTokenBySymbol } from "sdk/configs/tokens";
import { gelatoRelay } from "sdk/utils/gelatoRelay";
import { ExternalCallsPayload } from "sdk/utils/orderTransactions";
import { RelayUtils } from "typechain-types-arbitrum-sepolia/MultichainTransferRouter";

import Button from "components/Button/Button";
import NumberInput from "components/NumberInput/NumberInput";
import {
  useGmxAccountTokensDataObject,
  useGmxAccountTokensDataRequest,
  useGmxAccountWithdrawNetworks,
  useMultichainTokens,
} from "components/Synthetics/GmxAccountModal/hooks";
import TokenIcon from "components/TokenIcon/TokenIcon";
import { ValueTransition } from "components/ValueTransition/ValueTransition";

import { SyntheticsInfoRow } from "../SyntheticsInfoRow";
import { Selector } from "./Selector";

export const WithdrawView = () => {
  const [settlementChainId] = useGmxAccountSettlementChainId();
  const { chainId: walletChainId, address: account } = useAccount();
  const [inputValue, setInputValue] = useState("");
  const [selectedNetwork, setSelectedNetwork] = useState<number | undefined>(walletChainId);

  useEffect(() => {
    const sourceChains = Object.keys(MULTI_CHAIN_SUPPORTED_TOKEN_MAP[settlementChainId] || {}).map(Number);

    if (sourceChains.length === 0) {
      return;
    }

    if (selectedNetwork !== undefined && sourceChains.includes(selectedNetwork)) {
      return;
    }

    console.log("resetting selected network", { sourceChains, selectedNetwork });

    setSelectedNetwork(sourceChains[0]);
  }, [settlementChainId, selectedNetwork]);

  const [selectedTokenAddress, setSelectedTokenAddress] = useState<string | undefined>(undefined);

  const gmxAccountTokensData = useGmxAccountTokensDataObject();

  const networks = useGmxAccountWithdrawNetworks();

  const multichainTokens = useMultichainTokens();

  const selectedToken = useMemo(() => {
    return getByKey(gmxAccountTokensData, selectedTokenAddress);
  }, [selectedTokenAddress, gmxAccountTokensData]);

  const amount = selectedToken ? parseValue(inputValue, selectedToken.decimals) : undefined;
  const amountUsd = selectedToken
    ? convertToUsd(amount, selectedToken.decimals, selectedToken.prices.maxPrice)
    : undefined;

  const options = useMemo(() => {
    return Object.values(gmxAccountTokensData);
  }, [gmxAccountTokensData]);

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

  const sourceChainSelectedToken = useMemo(() => {
    const sourceChainToken = multichainTokens.find(
      (token) => token.address === selectedToken?.address && token.sourceChainId === selectedNetwork
    );

    return sourceChainToken;
  }, [multichainTokens, selectedNetwork, selectedToken?.address]);

  const sourceChainTokenBalanceUsd = useMemo(() => {
    if (sourceChainSelectedToken === undefined) {
      return 0n;
    }

    return convertToUsd(
      sourceChainSelectedToken.sourceChainBalance,
      sourceChainSelectedToken.sourceChainDecimals,
      sourceChainSelectedToken.sourceChainPrices?.maxPrice
    );
  }, [sourceChainSelectedToken]);

  const { nextGmxAccountBalanceUsd, nextSourceChainBalanceUsd } = useMemo(() => {
    if (selectedToken === undefined || amount === undefined || amountUsd === undefined) {
      return { nextGmxAccountBalanceUsd: undefined, nextSourceChainBalanceUsd: undefined };
    }

    const nextGmxAccountBalanceUsd = (gmxAccountTokenBalanceUsd ?? 0n) - (amountUsd ?? 0n);
    const nextSourceChainBalanceUsd = (sourceChainTokenBalanceUsd ?? 0n) + (amountUsd ?? 0n);

    return { nextGmxAccountBalanceUsd, nextSourceChainBalanceUsd };
  }, [selectedToken, amount, amountUsd, gmxAccountTokenBalanceUsd, sourceChainTokenBalanceUsd]);

  // const relayFeeState = useRelayerFeeHandler();
  // const relayerFeeSwapParams = useSelector(selectRelayerFeeSwapParams);
  const expressOrdersParams = useExpressOrdersParams({
    orderParams: {
      cancelOrderParams: [],
      createOrderParams: [],
      updateOrderParams: [],
    },
  });
  const signer = useEthersSigner();
  const tokensData = useTokensData();
  const marketsInfoData = useSelector(selectMarketsInfoData);
  const settlementChainPublicClient = usePublicClient({ chainId: settlementChainId });

  const handleWithdraw = useCallback(async () => {
    // console.log({ relayFeeState, relayerFeeSwapParams });
    const paymentTokens = await gelatoRelay.getPaymentTokens(BigInt(settlementChainId));

    console.log({ paymentTokens });

    if (selectedNetwork === undefined || selectedTokenAddress === undefined) {
      return;
    }

    const dstEid = getStargateEndpointId(selectedNetwork);
    const stargateAddress = getStargatePoolAddress(settlementChainId, selectedTokenAddress);

    if (
      selectedToken === undefined ||
      amount === undefined ||
      dstEid === undefined ||
      stargateAddress === undefined ||
      signer === undefined ||
      marketsInfoData === undefined ||
      tokensData === undefined ||
      // relayerFeeSwapParams === undefined ||
      settlementChainPublicClient === undefined
    ) {
      helperToast.error("Missing required parameters");
      return;
    }

    // oracleParams: getExpressOrderOracleParams({
    //   chainId,
    //   createOrderParams: [],
    //   marketsInfoData,
    //   tokensData,
    //   gasPaymentTokenAddress: relayFeeParams.feeParams.feeToken,
    //   feeSwapPath: relayFeeParams.feeParams.feeSwapPath,
    //   feeTokenAddress: relayFeeParams.relayFeeToken,
    // }),
    // tokenPermits: tokenPermits ?? [],
    // externalCalls: relayFeeParams.externalCalls,
    // fee: relayFeeParams.feeParams,
    // userNonce: userNonce,

    const bridgeOutParams: RelayUtils.BridgeOutParamsStruct = {
      token: selectedTokenAddress,
      amount: amount,
      // data: encodePacked(["uint32"], [dstEid]),
      data: encodeAbiParameters(
        [
          {
            type: "uint32",
            name: "dstEid",
          },
        ],
        [dstEid]
      ),
      provider: stargateAddress, // "0x543BdA7c6cA4384FE90B1F5929bb851F52888983",
    };

    const relayContractAddress = getContract(settlementChainId, "MultichainTransferRouter");

    const userNonce = await settlementChainPublicClient.readContract({
      address: relayContractAddress,
      abi: abis.GelatoRelayRouterArbitrumSepolia,
      functionName: "userNonces",
      args: [account],
    });

    const DEV_WETH = getTokenBySymbol(settlementChainId, "WETH").address;

    const FEE_AMOUNT = (93372639126447n * 130n) / 100n;

    const externalCalls: ExternalCallsPayload = {
      sendTokens: [],
      sendAmounts: [],
      externalCallTargets: [],
      externalCallDataList: [],
      refundTokens: [],
      refundReceivers: [],
    };

    const relayParamsPayload: MultichainRelayParamsPayload = {
      oracleParams: getOracleParamsPayload(
        getOraclePriceParamsForRelayFee({
          chainId: settlementChainId,
          marketsInfoData,
          tokensData,
          relayFeeParams: {
            externalCalls,
            feeParams: {
              feeToken: DEV_WETH,
              feeAmount: FEE_AMOUNT,
              feeSwapPath: [],
            },
            relayerTokenAddress: DEV_WETH,
            relayerTokenAmount: FEE_AMOUNT,
            totalNetworkFeeAmount: FEE_AMOUNT,
            gasPaymentTokenAmount: FEE_AMOUNT,
            gasPaymentTokenAddress: DEV_WETH,
            isOutGasTokenBalance: false,
            needGasPaymentTokenApproval: false,
            externalSwapGasLimit: 0n,
          },
        })
      ),
      tokenPermits: [],
      externalCalls,
      fee: {
        feeToken: DEV_WETH,
        feeAmount: FEE_AMOUNT,
        feeSwapPath: [],
      },
      userNonce: userNonce,
      deadline: 9999999999999n,
      desChainId: BigInt(settlementChainId),
    };

    const signedTxnData: ExpressTxnData = await buildAndSignBridgeOutTxn({
      chainId: settlementChainId,
      signer: signer,
      relayParamsPayload,
      params: bridgeOutParams,
    });

    await sendExpressTransaction({
      chainId: settlementChainId,
      txnData: signedTxnData,
      // TODO
      isSponsoredCall: false,
      // relayFeeToken: "0xeBDCbab722f9B4614b7ec1C261c9E52acF109CF8", // WETH.G
    });

    // MultichainVault -> MultichainTransferRouter 666wei
    // MultichainTransferRouter -> EIP173 1wei
    // MultichainTransferRouter -> MultichainVault 666wei (but the balance is 665wei)
  }, [
    account,
    amount,
    marketsInfoData,
    selectedNetwork,
    selectedToken,
    selectedTokenAddress,
    settlementChainId,
    settlementChainPublicClient,
    signer,
    tokensData,
  ]);

  return (
    <div className=" grow  overflow-y-auto p-16">
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
          <div className="text-body-small text-slate-100">To Network</div>
          <Selector
            value={selectedNetwork}
            onChange={(value) => setSelectedNetwork(Number(value))}
            placeholder="Select network"
            button={
              <div className="flex items-center gap-8">
                {selectedNetwork !== undefined ? (
                  <>
                    <img
                      src={CHAIN_ID_TO_NETWORK_ICON[selectedNetwork]}
                      alt={getChainName(selectedNetwork)}
                      className="size-20"
                    />
                    <span className="text-body-large">{getChainName(selectedNetwork)}</span>
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
            MAX
          </button>
        </div>
        <div className="text-body-small text-slate-100">{formatUsd(amountUsd ?? 0n)}</div>
      </div>

      <div className="h-32" />

      <div className="flex flex-col gap-8">
        <SyntheticsInfoRow label="Network Fee" value="$0.37" />
        <SyntheticsInfoRow label="Withdraw Fee" value="$0.22" />
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

      {/* Withdraw button */}
      <Button variant="primary" className="w-full" onClick={handleWithdraw}>
        Withdraw
      </Button>
    </div>
  );
};

function networkItemKey(option: { id: number; name: string; fee: string }) {
  return option.id.toString();
}

function NetworkItem({ option }: { option: { id: number; name: string; fee: string } }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-8">
        <img src={CHAIN_ID_TO_NETWORK_ICON[option.id]} alt={option.name} className="size-20" />
        <span className="text-body-large">{option.name}</span>
      </div>
      <span className="text-body-medium text-slate-100">{option.fee}</span>
    </div>
  );
}

function WithdrawAssetItem({ option }: { option: TokenData }) {
  return (
    <div className="flex items-center gap-8">
      <TokenIcon symbol={option.symbol} displaySize={20} importSize={40} />
      <span>
        {option.symbol} <span className="text-slate-100">{option.name}</span>
      </span>
    </div>
  );
}

function withdrawAssetItemKey(option: TokenData) {
  return option.address;
}
