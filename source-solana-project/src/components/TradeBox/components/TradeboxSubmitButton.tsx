import Button from '@/components/Common/Button/Button';
import Tooltip from '@/components/Common/Tooltip/Tooltip';
import { useTradeBoxValidation } from '@/components/TradeBox/hooks/useTradeBoxValidation';
import { useTradeboxWarningsRows } from '@/components/TradeBox/hooks/useTradeWarningsRows';
import { NATIVE_TOKEN_ADDRESS } from '@/config/tokens';
import { useAnchor } from '@/contexts/anchor';
import { PriceImpactWarningState } from '@/hooks/tradeHooks/usePriceImpactWarningState';
import { selectTradeboxDecreasePositionAmounts } from '@/selectors/tradebox/selectTradeboxDecreasePositionAmounts';
import { selectTradeboxFromToken } from '@/selectors/tradebox/selectTradeboxFromToken';
import { selectTradeboxIsWrapOrUnwrap } from '@/selectors/tradebox/selectTradeboxIsWrapOrUnwrap';
import { selectTradeboxToToken } from '@/selectors/tradebox/selectTradeboxToToken';
import { selectTradeboxTradeFlags } from '@/selectors/tradebox/selectTradeboxTradeFlags';
import { getTriggerNameByOrderType } from '@/utils/order/getTriggerNameByOrderType';
import { useAppStore } from '@/zustand/useAppStore';
import { t } from '@lingui/macro';
import { useWallet } from '@solana/wallet-adapter-react';
import { useMemo } from 'react';

interface TradeboxSubmitButtonProps {
  priceImpactWarningState: PriceImpactWarningState;
  isSending: boolean;
  type?: 'submit' | 'button';
  onClick?: () => void;
  className?: string;
}

export function TradeboxSubmitButton({
  priceImpactWarningState,
  isSending,
  type = 'submit',
  onClick,
  className = '',
}: TradeboxSubmitButtonProps) {
  const { owner } = useAnchor();
  const { connecting } = useWallet();
  const { isSwap, isLong, isMarket, isLimit } = useAppStore(
    selectTradeboxTradeFlags
  );
  const fromToken = useAppStore(selectTradeboxFromToken);
  const toToken = useAppStore(selectTradeboxToToken);
  const decreaseAmounts = useAppStore(selectTradeboxDecreasePositionAmounts);
  const isWrapOrUnwrap = useAppStore(selectTradeboxIsWrapOrUnwrap);

  const { buttonErrorText, tooltipContent } = useTradeBoxValidation({
    priceImpactWarningState,
  });

  const [, consentError] = useTradeboxWarningsRows(priceImpactWarningState);

  const submitButtonText = useMemo(() => {
    if (!owner) {
      return t`Connect Wallet`;
    }

    if (buttonErrorText) {
      return buttonErrorText;
    }

    if (consentError) {
      return consentError;
    }

    if (isMarket) {
      if (isSwap) {
        if (isWrapOrUnwrap) {
          if (
            fromToken?.address.equals(NATIVE_TOKEN_ADDRESS) ||
            fromToken?.shouldWrap
          ) {
            return t`Wrap ${fromToken?.symbol}`;
          } else {
            return t`Unwrap ${fromToken?.symbol}`;
          }
        } else {
          return t`Swap ${fromToken?.symbol}`;
        }
      } else {
        return isLong
          ? `Long ${toToken?.symbol}`
          : `Short ${toToken?.symbol}`;
      }
    } else if (isLimit) {
      return t`Create Limit Order`;
    } else {
      return t`Create ${getTriggerNameByOrderType(decreaseAmounts?.triggerOrderType)} Order`;
    }
  }, [
    buttonErrorText,
    isWrapOrUnwrap,
    isLimit,
    isLong,
    isMarket,
    isSwap,
    fromToken,
    toToken,
    decreaseAmounts,
    consentError,
    owner,
  ]);

  const buttonContent = (
    <Button
      qa="confirm-trade-button"
      variant="primary-action"
      className={`w-full [text-decoration:inherit] ${className} ${isSending || connecting ? 'loading' : ''}`}
      type={type}
      onClick={onClick}
      disabled={(!!buttonErrorText && !!owner) || connecting || isSending}
    >
      {connecting || isSending ? 'loading..' : submitButtonText}
    </Button>
  );

  return (
    <div className="TradeBox-button-container">
      {tooltipContent ? (
        <Tooltip
          className="w-full"
          content={tooltipContent}
          handle={buttonContent}
          isHandlerDisabled
          handleClassName="w-full"
          position="bottom"
        />
      ) : (
        buttonContent
      )}
    </div>
  );
}
