import './SellGtModal.scss';
import { useCallback, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { VersionedTransaction } from '@solana/web3.js';
import { t, Trans } from '@lingui/macro';
import Button from '@/components/Common/Button/Button';
import Modal from '@/components/Common/Modal/Modal';
import TooltipWithPortal from '@/components/Common/Tooltip/TooltipWithPortal';
import InfoSvg from '@/components/TradeBoxNew/assets/Info.svg';
import SliderComponent from '@/components/ExchangeNew/ExchangeList/PositionList/components/compose-components/slider/index';
import { NumberInput } from '@/components/Common/Input/NumberInput';
import { usePayer } from '@/components/TradeBoxNew/Hooks/usePayer';
import { GMX_SOLANA_STORE_ADDRESS } from '@/config/program';
import {
  prepareGtBuybackSellRequest,
  submitGtBuybackSellRequest,
  type GtBuybackSellContext,
} from './api/gtBuybackSqd';
import { deriveSellRequestParameters } from './utils/sellRequestDerivations';
import {
  calcEstimatedSellProceeds,
  formatGtAmount,
  formatSellGtInputAmount,
  formatUsdcAmount,
  parseNum,
} from './utils/buybackDerivations';

type Props = {
  isVisible: boolean;
  onClose: () => void;
  availableToSell: number;
  gtDecimals: number;
  maxBuybackValue: number;
  queuedGtForSell: number;
  estBuybackPrice: number;
  currentMintingPrice: number;
  sellContext: GtBuybackSellContext | undefined;
};

function clampAmount(value: number, max: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  if (value > max) return max;
  return value;
}

export function SellGtModal({
  isVisible,
  onClose,
  availableToSell,
  gtDecimals,
  maxBuybackValue,
  queuedGtForSell,
  estBuybackPrice,
  currentMintingPrice,
  sellContext,
}: Props) {
  const isTestMode = window.localStorage.getItem('buyback_test') === '1';
  const { connected, publicKey, signTransaction } = useWallet();
  const { openConnectWalletModal } = usePayer();
  const [inputValue, setInputValue] = useState('');
  const [rate, setRate] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);
  const [preparedStatus, setPreparedStatus] = useState<string | null>(null);
  const [showSlider, setShowSlider] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [preparedTransaction, setPreparedTransaction] = useState<string | null>(
    null
  );
  const [signedRequest, setSignedRequest] = useState<string | null>(null);
  const [useLocalSigner, setUseLocalSigner] = useState(false);
  const mnemonicInput = useRef<HTMLInputElement>(null);
  const derivationPathInput = useRef<HTMLInputElement>(null);

  const inputAmount = parseNum(inputValue);
  const exceedsMax = inputAmount > availableToSell + 1e-12;
  const isValid = inputAmount > 0 && !exceedsMax;
  const isBusy = isConfirming;

  const estimatedSellProceeds = useMemo(() => {
    if (!isValid) return 0;
    return calcEstimatedSellProceeds(
      inputAmount,
      maxBuybackValue,
      queuedGtForSell,
      estBuybackPrice,
      currentMintingPrice
    );
  }, [
    isValid,
    inputAmount,
    maxBuybackValue,
    queuedGtForSell,
    estBuybackPrice,
    currentMintingPrice,
  ]);

  const reset = useCallback(() => {
    setInputValue('');
    setRate(0);
    setSubmitError(null);
    setSubmitStatus(null);
    setShowSlider(false);
    setPreparedTransaction(null);
    setPreparedStatus(null);
    setSignedRequest(null);
    setUseLocalSigner(false);
    if (mnemonicInput.current) mnemonicInput.current.value = '';
  }, []);

  const handleClose = useCallback(() => {
    if (isBusy) return;
    reset();
    onClose();
  }, [isBusy, onClose, reset]);

  const applyAmount = useCallback(
    (amount: number, nextRate?: number) => {
      const clamped = clampAmount(amount, availableToSell);
      setInputValue(formatSellGtInputAmount(clamped));
      if (typeof nextRate === 'number') {
        setRate(nextRate);
      } else if (availableToSell > 0) {
        setRate(Math.round((clamped / availableToSell) * 100));
      } else {
        setRate(0);
      }
      setSubmitError(null);
      setSubmitStatus(null);
      setPreparedTransaction(null);
      setPreparedStatus(null);
    },
    [availableToSell]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
        setInputValue(raw);
        const amount = parseNum(raw);
        if (availableToSell > 0 && amount > 0) {
          setRate(
            Math.min(100, Math.round((amount / availableToSell) * 100))
          );
        } else {
          setRate(0);
        }
        setSubmitError(null);
        setSubmitStatus(null);
        setPreparedTransaction(null);
        setPreparedStatus(null);
      }
    },
    [availableToSell]
  );

  const handleSliderChange = useCallback(
    (percentage: number) => {
      const pct = Math.min(100, Math.max(0, percentage));
      const amount = (availableToSell * pct) / 100;
      applyAmount(amount, pct);
    },
    [availableToSell, applyAmount]
  );

  const handleMaxClick = useCallback(() => {
    applyAmount(availableToSell, 100);
  }, [availableToSell, applyAmount]);

  const errorMessage = useMemo(() => {
    if (isBusy) return t`Selling GT...`;
    if (!inputValue) return t`Enter GT amount`;
    if (exceedsMax) return t`Max GT amount exceeded`;
    if (inputAmount <= 0) return t`Enter GT amount`;
    return '';
  }, [isBusy, inputValue, exceedsMax, inputAmount]);

  const handleSubmit = useCallback(async () => {
    if (!connected) {
      openConnectWalletModal();
      return;
    }
    if (isBusy || signedRequest || !isValid) return;

    setSubmitError(null);
    setSubmitStatus(null);
    setPreparedStatus(null);
    setShowSlider(false);
    setIsConfirming(true);
    try {
      if (!publicKey) {
        throw new Error('Wallet is not connected');
      }
      let transactionBase64 = isTestMode ? preparedTransaction : null;
      if (!transactionBase64) {
        if (!sellContext) {
          throw new Error('Sell context is not available');
        }
        const parameters = deriveSellRequestParameters(
          sellContext,
          inputAmount,
          gtDecimals
        );
        const result = await prepareGtBuybackSellRequest({
          ...parameters,
          owner: publicKey.toBase58(),
          store: GMX_SOLANA_STORE_ADDRESS.toBase58(),
        });
        transactionBase64 = result.transaction;
        if (isTestMode) {
          setPreparedTransaction(result.transaction);
          setPreparedStatus(
            `Prepared nonce ${result.nonce}, reference slot ${result.quotaReferenceSlot}, amount ${result.amountRaw} raw`
          );
          return;
        }
      }

      const transaction = VersionedTransaction.deserialize(
        Buffer.from(transactionBase64, 'base64')
      );
      let signed: VersionedTransaction;
      if (useLocalSigner && isTestMode) {
        const { signLocalSellRequest } = await import('./utils/signLocalSellRequest');
        try {
          signed = signLocalSellRequest(
            transaction,
            mnemonicInput.current?.value ?? '',
            derivationPathInput.current?.value ?? '',
            publicKey
          );
        } finally {
          if (mnemonicInput.current) mnemonicInput.current.value = '';
        }
      } else {
        if (!signTransaction) {
          throw new Error('Wallet does not support transaction signing');
        }
        signed = await signTransaction(transaction);
      }
      const signedBase64 = Buffer.from(signed.serialize()).toString('base64');
      const result = await submitGtBuybackSellRequest({
        transaction: signedBase64,
        store: GMX_SOLANA_STORE_ADDRESS.toBase58(),
      });
      setSignedRequest(signedBase64);
      if (result.error) {
        throw new Error(
          `Submit failed. Signature: ${result.signature}. ${result.error}`
        );
      }
      setSubmitStatus(
        `Submitted successfully. Signature: ${result.signature}, slot: ${result.slot ?? 'pending'}`
      );
    } catch (e) {
      const message =
        e instanceof Error ? e.message : t`Failed to sell GT. Please try again.`;
      setSubmitError(message);
    } finally {
      setIsConfirming(false);
    }
  }, [
    connected,
    openConnectWalletModal,
    isValid,
    isBusy,
    preparedTransaction,
    signTransaction,
    publicKey,
    inputAmount,
    gtDecimals,
    sellContext,
    useLocalSigner,
    isTestMode,
    signedRequest,
  ]);

  if (!isVisible) return null;

  return createPortal(
    <div className="Confirmation-box sell-gt-s2-wrap">
      <Modal
        className="PositionEditor-modal sell-gt-s2-modal"
        isVisible={isVisible}
        setIsVisible={handleClose}
        label={t`Sell GT`}
        qa="sell-gt-season2-modal"
        animateOnMount={false}
      >
        <div
          className={`sell-gt-s2-input-box${showSlider ? ' is-active' : ''}`}
          onClick={() => setShowSlider(true)}
        >
          <div className="sell-gt-s2-input-head">
            <span>
              <Trans>Pay</Trans>
            </span>
            <button
              type="button"
              className="sell-gt-s2-max-label"
              onClick={handleMaxClick}
              disabled={isBusy || Boolean(signedRequest)}
            >
              <Trans>Max:</Trans> {formatGtAmount(availableToSell)} GT
            </button>
          </div>
          <div className="sell-gt-s2-input-row">
            <span className="token-name">GT</span>
            <NumberInput
              value={inputValue}
              onValueChange={handleInputChange}
              onFocus={() => setShowSlider(true)}
              placeholder="0.0"
              className="sell-gt-s2-amount-input"
              disabled={isBusy || Boolean(signedRequest)}
            />
          </div>
          {showSlider && !isBusy && !signedRequest && (
            <div className="sell-gt-s2-slider">
              <SliderComponent value={rate} onInputChange={handleSliderChange} />
            </div>
          )}
        </div>

        <div className="sell-gt-s2-proceeds">
          <div className="title">
            <div>
              <Trans>Est. Sell Proceeds</Trans>
            </div>
            <TooltipWithPortal
              handle={<img src={InfoSvg} alt="info" />}
              position="bottom"
              className="block h-[1.6rem]"
              renderContent={() => (
                <div>
                  <p>
                    <Trans>
                      Calculated using the current Est. Buyback Price. The final proceeds may differ when the buyback executes.
                    </Trans>
                  </p>
                </div>
              )}
            />
          </div>
          <div className="value">
            {`${formatUsdcAmount(estimatedSellProceeds, 2)} USDC`}
          </div>
        </div>

        {isTestMode && preparedTransaction && !signedRequest && (
          <div className="sell-gt-s2-local-signing" data-dd-privacy="hidden">
            <label>
              <input
                type="checkbox"
                checked={useLocalSigner}
                disabled={isBusy}
                onChange={(event) => setUseLocalSigner(event.target.checked)}
              />
              Sign locally with a test recovery phrase
            </label>
            {useLocalSigner && (
              <>
                <div>Owner: {publicKey?.toBase58()}</div>
                <label>
                  Derivation path
                  <input
                    ref={derivationPathInput}
                    defaultValue="m/44'/501'/0'/0'"
                    disabled={isBusy}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </label>
                <label>
                  Test recovery phrase
                  <input
                    ref={mnemonicInput}
                    type="password"
                    disabled={isBusy}
                    autoComplete="off"
                    spellCheck={false}
                    autoCapitalize="none"
                  />
                </label>
                <div>Signs the original transaction and submits it to Keeper.</div>
              </>
            )}
          </div>
        )}

        {isTestMode && preparedStatus && (
          <div className="sell-gt-s2-status" role="status">{preparedStatus}</div>
        )}
        {submitStatus && (
          <div className="sell-gt-s2-status" role="status">{submitStatus}</div>
        )}
        {submitError && (
          <div className="sell-gt-s2-error">{submitError}</div>
        )}
        {signedRequest && (
          <div className="sell-gt-s2-status">
            Sell request sent to Keeper. Check the submission result above.
          </div>
        )}

        <div className="Exchange-swap-button-container">
          <Button
            className="w-full"
            variant="primary-action"
            onClick={() => void handleSubmit()}
            disabled={
              connected
                ? Boolean(errorMessage) || isBusy || Boolean(signedRequest)
                : false
            }
          >
            {connected
              ? signedRequest
                ? <Trans>Request Sent</Trans>
                : errorMessage || (isTestMode
                  ? preparedTransaction
                    ? useLocalSigner
                      ? 'Sign Locally and Submit'
                      : <Trans>Sign Sell Request</Trans>
                    : <Trans>Prepare Sell Request</Trans>
                  : <Trans>Sell GT</Trans>)
              : <Trans>Connect Wallet</Trans>}
          </Button>
        </div>
      </Modal>
    </div>,
    document.body
  );
}
