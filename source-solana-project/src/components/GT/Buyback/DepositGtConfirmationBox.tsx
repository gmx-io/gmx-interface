import Button from '@/components/Common/Button/Button';
import BuyInputSection from './BuyInputSection';
import Modal from '@/components/Common/Modal/Modal';
import { usePayer } from '@/components/TradeBoxNew/Hooks/usePayer';
import { BN_ZERO, USD_DECIMALS } from '@/config/constants';
import SliderComponent from '@/components/ExchangeNew/ExchangeList/PositionList/components/compose-components/slider/index';
import { useDepositGtExchangeGt } from '@/hooks/gtHooks/useDepositGtExchangeGt';
import { selectGtGlobalDetailsDecimals } from '@/selectors/gt/gtGlobalDetailsSelectors';
import TooltipWithPortal from '@/components/Common/Tooltip/TooltipWithPortal';
import {
  selectGtDepositInputValue,
  selectGtSetDepositInputValue,
} from '@/selectors/gt/selectGtDepositAmount';
import InfoSvg from '@/components/TradeBoxNew/assets/Info.svg';
import { selectSkipPreflight } from '@/selectors/setting/baseSelectors';
import { formatAmount, formatAmountFree } from '@/utils/legacy/format';
import { parseValue } from '@/utils/legacy/parse';
import { useAppStore } from '@/zustand/useAppStore';
import { t, Trans } from '@lingui/macro';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatInput } from '@/components/TradeBoxNew/utils/formatInput';
import { BN } from '@coral-xyz/anchor';
import { useWallet } from '@solana/wallet-adapter-react';
import { useTokenPriceMap } from '../Hooks/useTokenPriceMap';
import './Deposit.scss';
import { useShallow } from 'zustand/react/shallow';
interface Props {
  isVisible: boolean;
  onClose: () => void;
  buybackPrice: BN;
  estBuybackValue: BN;
  maxBuybackValue: BN;
  totalDepositedGTAmount: BN;
  recommendedDepositedAmount: BN;
}

export function DepositGtConfirmationBox({
  isVisible,
  onClose,
  buybackPrice,
  estBuybackValue,
  maxBuybackValue,
  totalDepositedGTAmount,
  recommendedDepositedAmount,
}: Props) {

  const { connected } = useWallet();
  const { openConnectWalletModal } = usePayer();
  const { userDetails } = useAppStore(
    useShallow((state) => ({
      userDetails: state.gtState.userDetails,
    }))
  );
  // console.log('userDetails', userDetails)
  const { tokenPriceMap } = useTokenPriceMap();
  const skipPreflight = useAppStore(selectSkipPreflight);
  const depositInputValue = useAppStore(selectGtDepositInputValue);
  const gtDecimals = useAppStore(selectGtGlobalDetailsDecimals) || 7;
  const depositAmount = parseValue(depositInputValue, gtDecimals);
  const setDepositInputValue = useAppStore(selectGtSetDepositInputValue);
  // const userAmount = useMemo(() => userDetails?.amount, [userDetails]);
  const [gtAmountBN, setGtAmountBN] = useState<BN>(BN_ZERO);
  const [usdAmountBN, setUsdAmountBN] = useState<BN>(BN_ZERO);
  const [rate, setRate] = useState<number>(0);
  // Format the max value similar to how it's shown in GtCard
  const maxValue = formatAmount(userDetails?.amount || BN_ZERO, gtDecimals, 2, true);
  const [showSlider, setShowSlider] = useState(false);
  const [isGtMax, setIsGtMax] = useState(false);
  const { trigger: depositGt, isSending } = useDepositGtExchangeGt();
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setDepositInputValue(e.target.value);
      const payAmountBN = formatInput(e.target.value, gtDecimals);
      setGtAmountBN(payAmountBN);
      if (payAmountBN?.gt(userDetails?.amount || BN_ZERO)) {
        setIsGtMax(true);
      } else {
        setIsGtMax(false);
      }
      const rateBN = userDetails?.amount?.gt(BN_ZERO) ? payAmountBN?.mul(new BN(100))?.div(userDetails?.amount) : BN_ZERO;
      const rate = rateBN?.toNumber();
      setRate(rate);
    },
    [setDepositInputValue, gtDecimals, userDetails]
  );

  const handleMaxClick = useCallback(() => {
    if (!userDetails?.amount || !gtDecimals) return;

    let maxDepositAmount = userDetails?.amount;

    if (maxDepositAmount.lt(BN_ZERO)) {
      maxDepositAmount = BN_ZERO;
    }

    const formattedMaxDepositAmount = formatAmountFree(
      maxDepositAmount,
      gtDecimals
    );
    setIsGtMax(false);
    setDepositInputValue(formattedMaxDepositAmount);
  }, [userDetails?.amount, gtDecimals, setDepositInputValue]);

  const handleSubmit = useCallback(() => {
    if (!connected) {
      openConnectWalletModal();
      return;
    }
    if (!depositAmount) return;

    void depositGt({
      amount: depositAmount,
      skipPreflight,
    }).then(onClose);
  }, [depositGt, depositAmount, onClose, skipPreflight]);

  const error = useMemo(() => {
    if (!depositInputValue) return <Trans>Enter GT amount</Trans>;
    if (isSending) return <Trans>Selling GT...</Trans>;
    if (isGtMax) return <Trans>Max GT amount exceeded</Trans>;
    if (gtAmountBN?.eq(BN_ZERO)) return <Trans>Enter GT amount</Trans>;
    return '';
  }, [depositInputValue, isSending, isGtMax, gtAmountBN]);

  useEffect(() => {
    if (!gtAmountBN) return;
    let gtUsd;
    if (estBuybackValue?.gt(new BN(0))) {
      const inputAmount = gtAmountBN?.add(totalDepositedGTAmount);
      if (inputAmount?.gt(recommendedDepositedAmount)) {
        gtUsd = maxBuybackValue?.mul(gtAmountBN?.mul(new BN(10).pow(new BN(USD_DECIMALS))).div(inputAmount))?.div(new BN(10).pow(new BN(USD_DECIMALS)));
      } else {
        gtUsd = gtAmountBN?.mul(buybackPrice).div(new BN(10).pow(new BN(gtDecimals)));
      }
    }
    const usdcPrice = tokenPriceMap['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v']?.unitPrice || tokenPriceMap['UsdsBvJe6sPKBzZhEo9bDDVg6d3695gJonz9eVSAUpP']?.unitPrice;
    if (!usdcPrice) return;
    const usdcAmount = gtUsd?.div(new BN(usdcPrice));
    setUsdAmountBN(usdcAmount);

  }, [gtAmountBN, buybackPrice, tokenPriceMap]);

  if (!isVisible) return null;

  return (
    <div className="Confirmation-box">
      <Modal
        className="PositionEditor-modal buyback-modal"
        isVisible={isVisible}
        setIsVisible={() => {
          setShowSlider(false)
          setRate(0)
          setGtAmountBN(BN_ZERO)
          setUsdAmountBN(BN_ZERO)
          onClose()
        }}
        label={t`Sell GT`}
        qa="deposit-gt-confirmation-box"
      >
        <div className='inputBox' style={{ backgroundColor: '#1F1F1F', paddingBottom: showSlider ? '1rem' : '0rem', borderRadius: '0.8rem', border:showSlider?'1px solid #FA7B4E':'' }}>
          <BuyInputSection
            topLeftLabel={t`Pay`}
            topRightLabel={t`Balance`}
            topRightValue={maxValue}
            inputValue={depositInputValue}
            onInputValueChange={handleInputChange}
            showMaxButton={true}
            onClickMax={handleMaxClick}
            onFocus={() => setShowSlider(true)}
            onClickTopRightLabel={handleMaxClick}
          >
            <div className="selected-token">GT</div>
          </BuyInputSection>
          <div>
              {
                showSlider && <SliderComponent
                  value={rate}
                  onInputChange={(value) => {
                    const amountBN = userDetails?.amount?.muln(value).divn(100);
                    setGtAmountBN(amountBN);
                    setRate(value);
                    if (!amountBN) {
                      return;
                    }
                    if (amountBN.gt(userDetails?.amount || BN_ZERO)) {
                      setIsGtMax(true);
                      // setGtAmountBN(BN_ZERO);
                    } else {
                      setIsGtMax(false);
                    }
                    if (value === 100) {
                      handleMaxClick();
                    } else {
                      setDepositInputValue(formatAmountFree(
                        amountBN,
                        gtDecimals
                      ));
                    }
                  }}
                />
              }
            </div>
        </div>


        <div className="sell-proceeds">
          <div className="title">
            <span><Trans>Est. Sell Proceeds</Trans></span>
            <TooltipWithPortal
              handle={<img src={InfoSvg} alt="info" />}
              position="bottom"
              renderContent={() => (
                <div>
                  <p>
                    <Trans>Estimated using the current Buyback Value and your share of the total GT queued for sell.</Trans>
                  </p>
                  <p>
                    <Trans>Final proceeds may change if queued GT or the buyback value updates before execution.</Trans>
                  </p>
                </div>
              )}
            />
          </div>
          <div className="value">
            {
              usdAmountBN?.gte(new BN(10000)) ? formatAmountFree(usdAmountBN, 6, 6) :
                (usdAmountBN?.gt(BN_ZERO) ? '<0.01' : '0.00')
            } {' '}USDC
          </div>
        </div>

        <div className="Exchange-swap-button-container">
          <Button
            className="w-full"
            variant="primary-action"
            onClick={handleSubmit}
            disabled={connected ? Boolean(error) : false}
          >
            {
              connected ?
                (error || <Trans>Sell GT</Trans>) : <Trans>Connect Wallet</Trans>
            }
          </Button>
        </div>
      </Modal>
    </div>
  );
}
