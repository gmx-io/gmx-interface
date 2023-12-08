import { Trans, t } from "@lingui/macro";
import Button from "components/Button/Button";
import ExternalLink from "components/ExternalLink/ExternalLink";
import Modal from "components/Modal/Modal";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { getContract } from "config/contracts";
import { getTokenBySymbol } from "config/tokens";
import {
  useOneClickTradingGenerateSubaccount,
  useOneClickTradingModalOpen,
  useOneClickTradingState,
} from "context/OneClickTradingContext/OneClickTradingContext";
import { getNeedTokenApprove, useTokensAllowanceData } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import copyIcon from "img/ic_copy_20.svg";
import infoIcon from "img/ic_info.svg";
import externalLinkIcon from "img/ic_new_link_20.svg";
import { useChainId } from "lib/chains";
import { getAccountUrl } from "lib/legacy";
import { museNeverExist } from "lib/types";
import { shortenAddressOrEns } from "lib/wallets";
import useWallet from "lib/wallets/useWallet";
import { ReactNode, memo, useCallback, useEffect, useMemo, useState } from "react";
import { useCopyToClipboard } from "react-use";
import "./OneClickTradingModal.scss";

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
  const { chainId } = useWallet();
  const [state, copyToClipboard] = useCopyToClipboard();
  const [copyStatus, setCopyStatus] = useState<null | string>(null);
  const [copyCounter, setCopyCounter] = useState(0);

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

  if (oneClickTradingState.state === "off") {
    return null;
  }
  const { subaccount } = oneClickTradingState;

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
            value={
              <TooltipWithPortal
                handle={"0.0000 ETH"}
                renderContent={renderSubaccountBalance}
                position="right-bottom"
              />
            }
            showDollar={false}
          />
          <StatsTooltipRow label={t`Main Account Balance`} value="0.0000 ETH" showDollar={false} />
        </div>
        <div className="OneClickTrading-section">
          <StatsTooltipRow
            label={t`Subaccount Balance`}
            value={
              <TooltipWithPortal
                handle={"0.0000 ETH"}
                renderContent={renderSubaccountBalance}
                position="right-bottom"
              />
            }
            showDollar={false}
          />
          <StatsTooltipRow label={t`Main Account Balance`} value="0.0000 ETH" showDollar={false} />
          <StatsTooltipRow
            label={t`Subaccount Balance`}
            value={
              <TooltipWithPortal
                handle={"0.0000 ETH"}
                renderContent={renderSubaccountBalance}
                position="right-bottom"
              />
            }
            showDollar={false}
          />
          <StatsTooltipRow label={t`Main Account Balance`} value="0.0000 ETH" showDollar={false} />
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
  const wethToken = getTokenBySymbol(chainId, "WETH");
  const { tokensAllowanceData } = useTokensAllowanceData(chainId, {
    spenderAddress: getContract(chainId, "SubaccountRouter"),
    tokenAddresses: [wethToken.address],
    skip: false,
  });

  // FIXME
  const payAmount = BigNumber.from(1e15);

  const needPayTokenApproval = useMemo(
    () => (tokensAllowanceData ? getNeedTokenApprove(tokensAllowanceData, wethToken.address, payAmount) : false),
    [payAmount, tokensAllowanceData, wethToken.address]
  );

  // eslint-disable-next-line no-console
  console.log({ needPayTokenApproval });

  return null;
});
