import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { ApproveTokenButton } from "components/ApproveTokenButton/ApproveTokenButton";
import Button from "components/Button/Button";
import ExternalLink from "components/ExternalLink/ExternalLink";
import Modal from "components/Modal/Modal";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { getContract } from "config/contracts";
import { getNativeToken, getWrappedToken } from "config/tokens";
import {
  useOneClickTradingGenerateSubaccount,
  useOneClickTradingModalOpen,
  useOneClickTradingState,
} from "context/OneClickTradingContext/OneClickTradingContext";
import { useBigNumberState } from "domain/synthetics/common/useBigNumberInput";
import { getNeedTokenApprove, useTokenBalances, useTokensAllowanceData } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import copyIcon from "img/ic_copy_20.svg";
import infoIcon from "img/ic_info.svg";
import externalLinkIcon from "img/ic_new_link_20.svg";
import { useChainId } from "lib/chains";
import { getAccountUrl } from "lib/legacy";
import { formatTokenAmount } from "lib/numbers";
import { getByKey } from "lib/objects";
import { museNeverExist } from "lib/types";
import { shortenAddressOrEns } from "lib/wallets";
import useWallet from "lib/wallets/useWallet";
import { ReactNode, memo, useCallback, useEffect, useMemo, useState } from "react";
import { useCopyToClipboard } from "react-use";
import "./OneClickTradingModal.scss";

const defaults = {
  initialTopUp: BigNumber.from(1000000000000000),
  maxAutoTopUpAmount: BigNumber.from(1000000000000000),
  wethForAutoTopUps: BigNumber.from(1000000000000000),
  maxAllowedActions: BigNumber.from(20),
} as const;

export function OneClickTradingModal() {
  const [isVisible, setIsVisible] = useOneClickTradingModalOpen();
  const oneClickTradingState = useOneClickTradingState();
  const state = oneClickTradingState.state;

  let content: ReactNode = null;

  switch (state) {
    case "off":
      content = <OffStateView />;
      break;
    case "created":
    case "active":
      content = <MainView />;
      break;

    default:
      throw museNeverExist(state);
  }

  return (
    <Modal label="One-Click Trading" isVisible={isVisible} setIsVisible={setIsVisible}>
      <div className="OneClickTrading-modal-content">{content}</div>
    </Modal>
  );
}

const OffStateView = memo(() => {
  const generateSubaccount = useOneClickTradingGenerateSubaccount();
  const onGenerateSubaccountClick = useCallback(() => {
    generateSubaccount();
  }, [generateSubaccount]);

  return (
    <>
      <div className="OneClickTrading-alert">
        <img src={infoIcon} alt="Info Icon" />
        <span>
          Enable <ExternalLink href="#">One-Click Trading</ExternalLink> to reduce signing popups.
        </span>
      </div>
      <Button variant="primary-action" onClick={onGenerateSubaccountClick} className="w-full">
        Generate Subaccount
      </Button>
    </>
  );
});

const MainView = memo(() => {
  const oneClickTradingState = useOneClickTradingState();
  const { chainId } = useChainId();
  const [state, copyToClipboard] = useCopyToClipboard();
  const [copyStatus, setCopyStatus] = useState<null | string>(null);
  const [copyCounter, setCopyCounter] = useState(0);
  const { account } = useWallet();

  const subaccountUrl = useMemo(
    () => getAccountUrl(chainId, oneClickTradingState.subaccount?.address),
    [chainId, oneClickTradingState.subaccount?.address]
  );

  const handleCopyClick = useCallback(() => {
    if (!oneClickTradingState.subaccount?.address) return;
    setCopyCounter((x) => x + 1);
    copyToClipboard(oneClickTradingState.subaccount?.address);
  }, [copyToClipboard, oneClickTradingState.subaccount?.address]);

  useEffect(() => {
    if (state.error) {
      setCopyStatus("Failed to copy");
    } else if (state.value) {
      setCopyStatus("Copied to clipboard");
    }

    const timeoutId = setTimeout(() => {
      setCopyStatus(null);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [state.error, state.value, copyCounter]);

  const renderSubaccountBalance = useCallback(() => {
    return "123";
  }, []);

  const onDisableClick = useCallback(() => {
    oneClickTradingState.clearSubaccount();
  }, [oneClickTradingState]);

  const mainBalances = useTokenBalances(chainId, account);
  const subBalances = useTokenBalances(chainId, oneClickTradingState.subaccount?.address);

  const wrappedToken = useMemo(() => getWrappedToken(chainId), [chainId]);
  const nativeToken = useMemo(() => getNativeToken(chainId), [chainId]);

  const { displayValue: initialTopUpString, setDisplayValue: setInitialTopUpString } = useBigNumberState(
    defaults.initialTopUp,
    nativeToken.decimals,
    4
  );

  if (oneClickTradingState.state === "off") {
    return null;
  }
  const { subaccount } = oneClickTradingState;

  const mainWethBalance = getByKey(mainBalances.balancesData, wrappedToken.address);
  const subEthBalance = getByKey(subBalances.balancesData, nativeToken.address);

  return (
    <div className="OneClickTrading-controls">
      <div className="OneClickTrading-subaccount">
        <div className="OneClickTrading-subaccount-details">
          <span className="OneClickTrading-subaccount-label">
            <Trans>Subaccount:</Trans>
          </span>
          <span>{copyStatus ?? shortenAddressOrEns(subaccount.address, 13)}</span>
        </div>
        <div className="relative">
          <ButtonIcon onClick={handleCopyClick} icon={copyIcon} title="Copy" />
          <ExternalLink href={subaccountUrl}>
            <ButtonIcon icon={externalLinkIcon} title="Open in Explorer" />
          </ExternalLink>
        </div>
      </div>
      <div className="OneClickTrading-buttons">
        <button className="OneClickTrading-mini-button">
          <Trans>Withdraw</Trans>
        </button>
        <button onClick={onDisableClick} className="OneClickTrading-mini-button warning">
          <Trans>Disable</Trans>
        </button>
      </div>
      <div className="OneClickTrading-stats">
        <div className="OneClickTrading-section">
          <StatsTooltipRow
            label={t`Subaccount Balance`}
            showColon={false}
            value={
              <TooltipWithPortal
                handle={formatTokenAmount(subEthBalance, nativeToken.decimals, nativeToken.symbol, {
                  displayDecimals: 4,
                })}
                renderContent={renderSubaccountBalance}
                position="right-bottom"
              />
            }
            showDollar={false}
          />
          <StatsTooltipRow
            label={t`Main Account Balance`}
            showColon={false}
            value={formatTokenAmount(mainWethBalance, wrappedToken.decimals, wrappedToken.symbol, {
              displayDecimals: 4,
            })}
            showDollar={false}
          />
        </div>
        <div className="OneClickTrading-section">
          <InputRow
            value={initialTopUpString}
            setValue={setInitialTopUpString}
            label={t`Initial top up`}
            symbol={nativeToken.symbol}
            decimals={nativeToken.decimals}
            showDecimals={4}
            tooltipText={t`Initial top up`}
          />
        </div>
        <TokenApproval />
        <Button variant="primary-action" disabled className="w-full">
          <Trans>Activate</Trans>
        </Button>
      </div>
    </div>
  );
});

const ButtonIcon = memo(({ icon, title, onClick }: { icon: string; title: string; onClick?: () => void }) => {
  return (
    <span title={title} className="OneClickTrading-button-icon" onClick={onClick}>
      <img src={icon} alt={title} />
    </span>
  );
});

const TokenApproval = memo(() => {
  const { chainId } = useChainId();
  const wrappedToken = useMemo(() => getWrappedToken(chainId), [chainId]);
  const oneClickTradingState = useOneClickTradingState();

  const { account } = useWallet();

  const { tokensAllowanceData } = useTokensAllowanceData(chainId, {
    spenderAddress: getContract(chainId, "SyntheticsRouter"),
    tokenAddresses: [wrappedToken.address],
    skip: !oneClickTradingState.modalOpen,
  });

  // FIXME
  const payAmount = BigNumber.from(1);

  const needPayTokenApproval = useMemo(
    () => (tokensAllowanceData ? getNeedTokenApprove(tokensAllowanceData, wrappedToken.address, payAmount) : false),
    [payAmount, tokensAllowanceData, wrappedToken.address]
  );

  if (!needPayTokenApproval || !account) return null;

  return (
    <div className="OneClickTrading-approve-token-btn">
      <ApproveTokenButton
        spenderAddress={account}
        tokenAddress={wrappedToken.address}
        tokenSymbol={wrappedToken.symbol}
      />
    </div>
  );
});

const InputRow = memo(
  ({
    value,
    setValue,
    label,
    symbol,
    decimals,
    showDecimals,
    tooltipText,
  }: {
    value: string;
    setValue: (value: string) => void;
    label: string;
    symbol: string;
    decimals: number;
    showDecimals: number;
    tooltipText: string;
  }) => {
    const renderTooltipContent = useCallback(() => {
      return tooltipText;
    }, [tooltipText]);

    return (
      <StatsTooltipRow
        showColon={false}
        label={<TooltipWithPortal handle={label} renderContent={renderTooltipContent} position="right-bottom" />}
        value={
          <Input value={value} setValue={setValue} symbol={symbol} decimals={decimals} showDecimals={showDecimals} />
        }
        showDollar={false}
      />
    );
  }
);

const Input = memo(
  ({
    value,
    setValue,
    symbol,
    decimals,
    showDecimals,
  }: {
    value: string;
    setValue: (value: string) => void;
    symbol: string;
    decimals: number;
    showDecimals: number;
  }) => {
    const onChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setValue(e.target.value);
      },
      [setValue]
    );
    const id = useMemo(() => `input-${Math.random()}`, []);

    return (
      <div className="OneClickTrading-input-wrapper">
        <div className={cx("OneClickTrading-input")}>
          <input onChange={onChange} id={id} value={value} />
          <label htmlFor={id}>
            <span>{symbol}</span>
          </label>
        </div>
      </div>
    );
  }
);
