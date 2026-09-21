import { ReactNode, useMemo, useState } from "react";
import { zeroAddress } from "viem";

import { ARBITRUM, SOURCE_BASE_MAINNET } from "config/chains";
import {
  getCollateralCloseDestinationKey,
  getExpressOrdersEnabledKey,
  SELECTED_NETWORK_LOCAL_STORAGE_KEY,
  SELECTED_NETWORK_WAS_APP_SELECTED_LOCAL_STORAGE_KEY,
} from "config/localStorage";
import { useGmxAccountDepositViewTokenAddress, useGmxAccountModalOpen } from "context/GmxAccountContext/hooks";
import type { PoolsDetailsState } from "context/PoolsDetailsContext/PoolsDetailsContext";
import {
  selectOrderEditorOrder,
  selectSetEditingOrderState,
} from "context/SyntheticsStateContext/selectors/orderEditorSelectors";
import { selectPositionEditorSetEditingPositionKey } from "context/SyntheticsStateContext/selectors/positionEditorSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import type { RebateInfoItem } from "domain/synthetics/fees/useRebatesInfo";
import type { MarketInfo, MarketsInfoData } from "domain/synthetics/markets";
import { Mode, Operation, type GmPaySource } from "domain/synthetics/markets/types";
import type { OrderInfo, OrdersInfoData } from "domain/synthetics/orders";
import type { PositionInfo, PositionsInfoData } from "domain/synthetics/positions";
import type { TokenData, TokensData } from "domain/synthetics/tokens";
import { CtAppProviders } from "domain/testUtils/CtAppProviders";
import { MOCK_L1_EXPRESS_ORDER_GAS_REFERENCE } from "domain/testUtils/mockChainData";
import { createMockMarketInfo, MOCK_MARKET_ADDRESS, SECOND_ETH_MARKET_ADDRESS } from "domain/testUtils/mockMarketInfo";
import { createMockPositionInfo } from "domain/testUtils/mockPositionInfo";
import { MOCK_ACCOUNT, mockMultichainWagmiConfig, mockWagmiConfig, noop } from "domain/testUtils/mockSyntheticsState";
import { DEFAULT_MOCK_TOKENS_DATA, MockSyntheticsStateProvider } from "domain/testUtils/MockSyntheticsStateProvider";
import { ETH_ADDRESS, NATIVE_ETH_ADDRESS, USDC_ADDRESS } from "domain/testUtils/mockTokens";
import { useChainId } from "lib/chains";
import { expandDecimals } from "lib/numbers";
import { getGasPaymentTokens } from "sdk/configs/express";
import { getToken, getWrappedToken } from "sdk/configs/tokens";
import { DecreasePositionSwapType, OrderType, type Order } from "sdk/utils/orders/types";
import { getOrderInfo } from "sdk/utils/orders/utils";

import { ClaimablePositionPriceImpactRebateModal } from "components/ClaimablePositionPriceImpactRebateModal/ClaimablePositionPriceImpactRebateModal";
import { ClaimModal } from "components/ClaimModal/ClaimModal";
import { GmSwapBoxDepositWithdrawal } from "components/GmSwap/GmSwapBox/GmDepositWithdrawalBox/GmDepositWithdrawalBox";
import type { FocusedInput } from "components/GmSwap/GmSwapBox/GmDepositWithdrawalBox/types";
import { OrderEditor } from "components/OrderEditor/OrderEditor";
import { AddTPSLModal } from "components/OrdersModal/AddTPSLModal";
import { PositionEditor } from "components/PositionEditor/PositionEditor";
import { PositionSeller } from "components/PositionSeller/PositionSeller";
import { SettleAccruedFundingFeeModal } from "components/SettleAccruedFundingFeeModal/SettleAccruedFundingFeeModal";
import { TradeBox } from "components/TradeBox/TradeBox";

const EXPRESS_FEATURES = { relayRouterEnabled: true, subaccountRelayRouterEnabled: true };
const SPONSORED_CALL_ALLOWED = { isSponsoredCallAllowed: true };
const SURFACES_WITHOUT_APPROVE_STEP: NetworkFeeSurface[] = ["addTpsl", "orderEditor"];

function getGasPaymentTokenAllowance(amount: bigint) {
  return {
    tokensAllowanceData: Object.fromEntries(getGasPaymentTokens(ARBITRUM).map((address) => [address, amount])),
    isLoaded: true,
    isLoading: false,
  };
}

/**
 * Mock token prices use a 30-dec-per-whole-token convention, which skews Express fee estimates in
 * token units by orders of magnitude (see TradeBox.ct.stories): huge balances keep every gas token viable.
 */
const HUGE_BALANCE = expandDecimals(1, 30);

export type NetworkFeeSurface =
  | "tradeBox"
  | "close"
  | "editMargin"
  | "addTpsl"
  | "settle"
  | "orderEditor"
  | "claimFunding"
  | "claimRebates"
  | "gmBuy";

export type NetworkFeeSurfaceStoryProps = {
  surface: NetworkFeeSurface;
  /** Express available (relay features + sponsored calls) and the Express setting on; off = Classic */
  express?: boolean;
  /** Connect on Base: srcChainId is set and the GMX Account pays every fee */
  multichain?: boolean;
  /** Close position: send the remaining margin to the GMX Account (Express only) */
  receiveToGmxAccount?: boolean;
  /** Edit margin: deposit collateral from the GMX Account balance (Express only) */
  collateralFromGmxAccount?: boolean;
  /** Zero every balance, native ETH and GMX Account included: no gas token can pay an Express fee */
  zeroBalances?: boolean;
  /** Trade box: the wallet holds exactly the 1000 USDC margin the test enters and nothing else, so no gas token is left for the Express fee */
  marginOnlyBalances?: boolean;
  /** Settle: fund the wallet and the GMX Account separately (`nativeOnly` = the wallet holds ETH but no gas token) */
  balances?: BalanceShape;
  /** Add TP/SL and the order editor have no approve step: an unapproved gas payment token sends a Classic transaction */
  isGasPaymentTokenApproved?: boolean;
  /** GM buy: which balance funds the deposit (`settlementChain` = wallet, `gmxAccount` = GMX Account) */
  gmPaySource?: GmPaySource;
};

type Fixtures = {
  tokensData: TokensData;
  marketTokensData: TokensData;
  marketsInfoData: MarketsInfoData;
  positionsInfoData: PositionsInfoData;
  ordersInfoData: OrdersInfoData;
  position: PositionInfo;
  order: OrderInfo;
  claims: { accruedPositionPriceImpactFees: RebateInfoItem[]; claimablePositionPriceImpactFees: RebateInfoItem[] };
};

type Balances = "huge" | "zero" | "marginOnly" | "nativeOnly";
export type BalanceShape = { wallet: Balances; gmxAccount: Balances };

const MARGIN_ONLY_USDC_BALANCE = expandDecimals(1000, 6);

function getMockBalance(address: string, balances: Balances): bigint {
  switch (balances) {
    case "huge":
      return HUGE_BALANCE;
    case "zero":
      return 0n;
    case "marginOnly":
      return address === USDC_ADDRESS ? MARGIN_ONLY_USDC_BALANCE : 0n;
    case "nativeOnly":
      return address === NATIVE_ETH_ADDRESS ? HUGE_BALANCE : 0n;
  }
}

/**
 * Express fee swaps (gas token -> WETH) only route through markets whose tokens have a price feed
 * provider, which prod learns from the tokens api; the default fixtures carry no such flag.
 * The default fixtures also label WETH "ETH" for market names; fee rows must not confuse the wrapped
 * token with the native one, so WETH keeps its real symbol here.
 */
function buildTokensData(balances: BalanceShape): TokensData {
  return Object.fromEntries(
    Object.entries(DEFAULT_MOCK_TOKENS_DATA).map(([address, token]) => {
      const walletAmount = getMockBalance(address, balances.wallet);
      const gmxAccountAmount = getMockBalance(address, balances.gmxAccount);

      return [
        address,
        {
          ...token,
          ...(address === ETH_ADDRESS ? { symbol: "WETH", name: "Wrapped Ethereum" } : {}),
          balance: walletAmount,
          walletBalance: walletAmount,
          gmxAccountBalance: gmxAccountAmount,
          hasPriceFeedProvider: true,
        },
      ];
    })
  );
}

const GM_TOKEN_PRICE = expandDecimals(15, 29); // $1.5 per GM

function createGmTokenData(marketAddress: string): TokenData {
  return {
    address: marketAddress,
    name: "GMX Market",
    symbol: "GM",
    decimals: 18,
    prices: { minPrice: GM_TOKEN_PRICE, maxPrice: GM_TOKEN_PRICE },
    balance: expandDecimals(1000, 18),
    walletBalance: expandDecimals(1000, 18),
    gmxAccountBalance: expandDecimals(1000, 18),
    // pool value / GM price; mint math divides by it
    totalSupply: expandDecimals(2_600_000, 18),
    isMarketToken: true,
  } as TokenData;
}

/**
 * The GM box state prod builds from the route and the market-token requests; the setters are local
 * state so the box's own inputs and pay-source switch keep working.
 */
function useMockPoolsDetailsState({
  glvOrMarketAddress,
  paySource,
  marketTokensData,
}: {
  glvOrMarketAddress: string;
  paySource: GmPaySource;
  marketTokensData: TokensData;
}): PoolsDetailsState {
  const [operation, setOperation] = useState<Operation>(Operation.Deposit);
  const [mode, setMode] = useState<Mode>(Mode.Single);
  const [focusedInput, setFocusedInput] = useState<FocusedInput>("first");
  const [paySourceState, setPaySourceState] = useState<GmPaySource>(paySource);
  const [firstTokenAddress, setFirstTokenAddress] = useState<PoolsDetailsState["firstTokenAddress"]>(
    USDC_ADDRESS as PoolsDetailsState["firstTokenAddress"]
  );
  const [secondTokenAddress, setSecondTokenAddress] = useState<PoolsDetailsState["secondTokenAddress"]>(undefined);
  const [firstTokenInputValue, setFirstTokenInputValue] = useState("");
  const [secondTokenInputValue, setSecondTokenInputValue] = useState("");
  const [marketOrGlvTokenInputValue, setMarketOrGlvTokenInputValue] = useState("");
  const [isMarketForGlvSelectedManually, setIsMarketForGlvSelectedManually] = useState(false);

  return useMemo(
    () => ({
      glvOrMarketAddress,
      selectedMarketAddressForGlv: undefined,
      operation,
      mode,
      withdrawalMarketTokensData: marketTokensData,
      focusedInput,
      paySource: paySourceState,
      firstTokenAddress,
      secondTokenAddress,
      firstTokenInputValue,
      secondTokenInputValue,
      marketOrGlvTokenInputValue,
      isMarketForGlvSelectedManually,
      multichainTokensResult: {
        tokenChainDataArray: [],
        isPriceDataLoading: false,
        isBalanceDataLoading: false,
      },
      setOperation,
      setMode,
      setGlvOrMarketAddress: noop,
      setSelectedMarketAddressForGlv: noop,
      setFocusedInput,
      setPaySource: setPaySourceState,
      setFirstTokenAddress,
      setSecondTokenAddress,
      setFirstTokenInputValue,
      setSecondTokenInputValue,
      setMarketOrGlvTokenInputValue,
      setIsMarketForGlvSelectedManually,
    }),
    [
      paySourceState,
      firstTokenAddress,
      firstTokenInputValue,
      focusedInput,
      glvOrMarketAddress,
      isMarketForGlvSelectedManually,
      marketOrGlvTokenInputValue,
      marketTokensData,
      mode,
      operation,
      secondTokenAddress,
      secondTokenInputValue,
    ]
  );
}

function createLimitIncreaseOrder({
  marketsInfoData,
  tokensData,
}: {
  marketsInfoData: MarketsInfoData;
  tokensData: TokensData;
}): OrderInfo {
  const order: Order = {
    key: "0x" + "11".repeat(32),
    account: MOCK_ACCOUNT,
    callbackContract: zeroAddress,
    initialCollateralTokenAddress: USDC_ADDRESS,
    marketAddress: MOCK_MARKET_ADDRESS,
    decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
    receiver: MOCK_ACCOUNT,
    swapPath: [],
    // contract prices carry 30 - indexToken.decimals precision
    contractAcceptablePrice: expandDecimals(1900, 12),
    contractTriggerPrice: expandDecimals(1800, 12),
    callbackGasLimit: 0n,
    // below the current requirement, so the editor shows the additional-network-fee row
    executionFee: expandDecimals(1, 12),
    initialCollateralDeltaAmount: expandDecimals(1000, 6),
    minOutputAmount: 0n,
    sizeDeltaUsd: expandDecimals(2000, 30),
    updatedAtTime: 0n,
    isFrozen: false,
    isLong: true,
    orderType: OrderType.LimitIncrease,
    shouldUnwrapNativeToken: false,
    autoCancel: false,
    data: [],
    uiFeeReceiver: zeroAddress,
    uiFeeFactor: 0n,
    validFromTime: 0n,
  };

  const orderInfo = getOrderInfo({ marketsInfoData, tokensData, wrappedNativeToken: getWrappedToken(ARBITRUM), order });

  if (!orderInfo) {
    throw new Error("Unable to build the mock order info");
  }

  return orderInfo;
}

function createFixtures(balances: BalanceShape): Fixtures {
  const tokensData = buildTokensData(balances);

  const ethToken = tokensData[ETH_ADDRESS];
  const usdcToken = tokensData[USDC_ADDRESS];
  const marketInfo: MarketInfo = createMockMarketInfo(ethToken, {
    longToken: ethToken,
    shortToken: usdcToken,
    claimableFundingAmountLong: expandDecimals(1, 16),
    claimableFundingAmountShort: expandDecimals(25, 6),
  });
  // a second ETH-USDC pool, so the shift box has somewhere to shift to
  const secondMarketInfo: MarketInfo = createMockMarketInfo(ethToken, {
    marketTokenAddress: SECOND_ETH_MARKET_ADDRESS,
    longToken: ethToken,
    shortToken: usdcToken,
    name: "ETH/USD [ETH-USDC] 2",
  });
  const marketsInfoData: MarketsInfoData = {
    [MOCK_MARKET_ADDRESS]: marketInfo,
    [SECOND_ETH_MARKET_ADDRESS]: secondMarketInfo,
  };
  const marketTokensData: TokensData = {
    [MOCK_MARKET_ADDRESS]: createGmTokenData(MOCK_MARKET_ADDRESS),
    [SECOND_ETH_MARKET_ADDRESS]: createGmTokenData(SECOND_ETH_MARKET_ADDRESS),
  };

  const basePosition = createMockPositionInfo({ account: MOCK_ACCOUNT, marketInfo, collateralToken: usdcToken });
  const position: PositionInfo = {
    ...basePosition,
    // above the Settle modal's preselection threshold, so the position is checked on open
    pendingClaimableFundingFeesUsd: expandDecimals(50, 30),
  };
  const positionsInfoData: PositionsInfoData = { [position.key]: position };

  const order = createLimitIncreaseOrder({ marketsInfoData, tokensData });
  const ordersInfoData: OrdersInfoData = { [order.key]: order };

  const rebate: RebateInfoItem = {
    factor: expandDecimals(1, 30),
    value: expandDecimals(5, 6),
    valueByFactor: expandDecimals(5, 6),
    reductionFactor: 0n,
    marketAddress: MOCK_MARKET_ADDRESS,
    tokenAddress: USDC_ADDRESS,
    timeKey: "1000",
    id: "rebate-1",
  };

  return {
    tokensData,
    marketTokensData,
    marketsInfoData,
    positionsInfoData,
    ordersInfoData,
    position,
    order,
    claims: { accruedPositionPriceImpactFees: [], claimablePositionPriceImpactFees: [rebate] },
  };
}

const OPEN_CONTROL_STYLE = { position: "fixed", top: 0, left: 0, zIndex: 2000 } as const;

/**
 * Opens the edit-margin modal the way the positions list does. Click-driven: the position editor
 * state clears its key in a mount effect, so a mount-time effect in a child would be overwritten.
 */
function OpenPositionEditorControl({
  positionKey,
  collateralFromGmxAccount,
}: {
  positionKey: string;
  collateralFromGmxAccount: boolean;
}) {
  const setEditingPositionKey = useSelector(selectPositionEditorSetEditingPositionKey);
  const setIsCollateralTokenFromGmxAccount = useSelector((s) => s.positionEditor.setIsCollateralTokenFromGmxAccount);

  return (
    <button
      type="button"
      data-qa="open-position-editor"
      style={OPEN_CONTROL_STYLE}
      onClick={() => {
        setIsCollateralTokenFromGmxAccount(collateralFromGmxAccount);
        setEditingPositionKey(positionKey);
      }}
    >
      Open position editor
    </button>
  );
}

/** The deposit CTA only changes the GMX Account modal state; the modal itself is not mounted here, so the state is echoed as text (view + preselected token symbol). */
function GmxAccountDepositProbe() {
  const [modalOpen] = useGmxAccountModalOpen();
  const [depositTokenAddress] = useGmxAccountDepositViewTokenAddress();

  return (
    <div data-qa="gmx-account-deposit-probe">
      {String(modalOpen)} {depositTokenAddress ? getToken(ARBITRUM, depositTokenAddress).symbol : ""}
    </div>
  );
}

/** Opens the order editor the way the orders list does: the editor mounts only once an order is being edited. */
function OrderEditorSurface({ orderKey }: { orderKey: string }) {
  const setEditingOrderState = useSelector(selectSetEditingOrderState);
  const editingOrder = useSelector(selectOrderEditorOrder);

  return (
    <>
      <GmxAccountDepositProbe />
      <button
        type="button"
        data-qa="open-order-editor"
        style={OPEN_CONTROL_STYLE}
        onClick={() => setEditingOrderState({ orderKey, source: "PositionsList" })}
      >
        Open order editor
      </button>
      {editingOrder && <OrderEditor order={editingOrder} source="PositionsList" onClose={noop} />}
    </>
  );
}

function SurfaceState({
  surface,
  express,
  multichain,
  gmPaySource,
  isGasPaymentTokenApproved,
  fixtures,
  children,
}: {
  surface: NetworkFeeSurface;
  express: boolean;
  multichain: boolean;
  gmPaySource: GmPaySource;
  isGasPaymentTokenApproved: boolean;
  fixtures: Fixtures;
  children: ReactNode;
}) {
  const { srcChainId } = useChainId();
  const isExpressAvailable = express || multichain;
  const gasPaymentTokenAllowance = useMemo(
    () =>
      SURFACES_WITHOUT_APPROVE_STEP.includes(surface)
        ? getGasPaymentTokenAllowance(isGasPaymentTokenApproved ? HUGE_BALANCE : 0n)
        : undefined,
    [isGasPaymentTokenApproved, surface]
  );
  const poolsDetails = useMockPoolsDetailsState({
    glvOrMarketAddress: MOCK_MARKET_ADDRESS,
    paySource: gmPaySource,
    marketTokensData: fixtures.marketTokensData,
  });

  return (
    <MockSyntheticsStateProvider
      tokensData={fixtures.tokensData}
      marketsInfoData={fixtures.marketsInfoData}
      positionsInfoData={fixtures.positionsInfoData}
      ordersInfoData={fixtures.ordersInfoData}
      features={isExpressAvailable ? EXPRESS_FEATURES : undefined}
      sponsoredCallBalanceData={isExpressAvailable ? SPONSORED_CALL_ALLOWED : undefined}
      srcChainId={multichain ? srcChainId : undefined}
      l1ExpressOrderGasReference={MOCK_L1_EXPRESS_ORDER_GAS_REFERENCE}
      closingPositionKey={surface === "close" ? fixtures.position.key : undefined}
      claims={fixtures.claims}
      poolsDetails={poolsDetails}
      depositMarketTokensData={fixtures.marketTokensData}
      gasPaymentTokenAllowance={gasPaymentTokenAllowance}
    >
      {children}
    </MockSyntheticsStateProvider>
  );
}

function Surface({
  surface,
  fixtures,
  collateralFromGmxAccount,
}: {
  surface: NetworkFeeSurface;
  fixtures: Fixtures;
  collateralFromGmxAccount: boolean;
}) {
  switch (surface) {
    case "tradeBox":
      return (
        <div className="text-body-medium flex flex-col rounded-8">
          <TradeBox isMobile={false} activeFormId="tradebox" />
        </div>
      );
    case "close":
      return <PositionSeller />;
    case "editMargin":
      return (
        <>
          <OpenPositionEditorControl
            positionKey={fixtures.position.key}
            collateralFromGmxAccount={collateralFromGmxAccount}
          />
          <PositionEditor />
        </>
      );
    case "addTpsl":
      return <AddTPSLModal isVisible setIsVisible={noop} position={fixtures.position} initialTpPriceInput="2200" />;
    case "settle":
      return <SettleAccruedFundingFeeModal allowedSlippage={50} isVisible onClose={noop} />;
    case "orderEditor":
      return <OrderEditorSurface orderKey={fixtures.order.key} />;
    case "claimFunding":
      return <ClaimModal isVisible onClose={noop} setPendingTxns={noop} />;
    case "claimRebates":
      return <ClaimablePositionPriceImpactRebateModal isVisible onClose={noop} />;
    case "gmBuy":
      return <GmSwapBoxDepositWithdrawal />;
  }
}

export function NetworkFeeSurfaceStory({
  surface,
  express = false,
  multichain = false,
  receiveToGmxAccount = false,
  collateralFromGmxAccount = false,
  zeroBalances = false,
  marginOnlyBalances = false,
  balances: balancesProp,
  gmPaySource = "settlementChain",
  isGasPaymentTokenApproved = true,
}: NetworkFeeSurfaceStoryProps) {
  // eslint-disable-next-line react/hook-use-state
  useState(() => {
    localStorage.setItem(
      JSON.stringify(getExpressOrdersEnabledKey(ARBITRUM, MOCK_ACCOUNT)),
      express || multichain ? "true" : "false"
    );

    if (receiveToGmxAccount) {
      localStorage.setItem(JSON.stringify(getCollateralCloseDestinationKey(ARBITRUM, MOCK_ACCOUNT)), "true");
    }

    if (multichain) {
      localStorage.setItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY, String(SOURCE_BASE_MAINNET));
      localStorage.setItem(SELECTED_NETWORK_WAS_APP_SELECTED_LOCAL_STORAGE_KEY, "true");
    }

    return true;
  });

  const fixtures = useMemo(() => {
    const sharedBalances: Balances = zeroBalances ? "zero" : marginOnlyBalances ? "marginOnly" : "huge";

    return createFixtures(balancesProp ?? { wallet: sharedBalances, gmxAccount: sharedBalances });
  }, [balancesProp, marginOnlyBalances, zeroBalances]);

  return (
    <CtAppProviders
      wagmiConfig={multichain ? mockMultichainWagmiConfig : mockWagmiConfig}
      connectChainId={multichain ? SOURCE_BASE_MAINNET : undefined}
    >
      <SurfaceState
        surface={surface}
        express={express}
        multichain={multichain}
        gmPaySource={gmPaySource}
        isGasPaymentTokenApproved={isGasPaymentTokenApproved}
        fixtures={fixtures}
      >
        <Surface surface={surface} fixtures={fixtures} collateralFromGmxAccount={collateralFromGmxAccount} />
      </SurfaceState>
    </CtAppProviders>
  );
}
