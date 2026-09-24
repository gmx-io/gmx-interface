import { memo, useRef, useEffect, useState, useMemo } from 'react';
import { t } from '@lingui/macro';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { useAppStore } from '@/zustand/useAppStore';
import closeIcon from '@/img/header/close.svg';
import './AdjustLeverageModal.scss';
import { formatAmount, formatAmountToIntegerNumber } from '@/utils/legacy';
import { USD_DECIMALS } from '@/config/constants';
import { BN } from '@coral-xyz/anchor';
import { NoticeCard } from '@/components/NoticeCard';
import { getNoticeConfig } from '@/components/useNotice';
import { LEVERAGE_SLIDER_MARKS } from '@/config/constants';
import Button from '@/components/Common/Button/Button';
import { useBodyScrollLock } from '@/hooks/utilsHooks/useBodyScrollLock';
import { GMX_SOLANA_TOKENS_RAW } from '@/config/program';
import { getGmw374Enabled, getGmw379Enabled, getGmw417Enabled } from '@/config/featureFlagEnable';
interface AdjustLeverageModalProps {
  isVisible: boolean;
  onClose: () => void;
  marketSymbol?: string;
}

function AdjustLeverageModal({ isVisible, onClose, marketSymbol = 'SOL/USD' }: AdjustLeverageModalProps) {
  const { leverage, setLeverage } = useAppStore(state => state.TradeboxNew);
  const { indexTokenData, indexToken } = useAppStore(state => state.indexTokens);
  const { marketInfo } = useAppStore(state => state.markets);
  const [sliderValue, setSliderValue] = useState<number | string>(Number(leverage) || '');
  const [marks, setMarks] = useState(LEVERAGE_SLIDER_MARKS);
  const modalRef = useRef<HTMLDivElement>(null);
  const tokenConfig = GMX_SOLANA_TOKENS_RAW[String(indexToken)];
  const isAlwaysOpen = tokenConfig?.tradingHours === '24/7';
  const isAuOrAg = useMemo(
    () => !isAlwaysOpen && (tokenConfig?.symbol === 'XAG' || tokenConfig?.symbol === 'XAU'),
    [isAlwaysOpen, tokenConfig?.symbol]
  );
  const isCommodity = useMemo(
    () =>
      !isAlwaysOpen &&
      (indexToken === 'wtikDoxPLXGSBHacYcLf6SwLQEW5dqGKhErA73QeCrJ' ||
        indexToken === 'xcu22Giuo4jqkDgv3KtfyUrco3a42BFLTnS7XjQ5Taz' ||
        indexToken === 'xptah2VhwW4pcLdkMvUinEsDNvMXpgHiVfG2mmkEuGR' ||
        indexToken === 'xpd2uvvfPfoogQxyrLyqE3NgSHSbkNNXr7bGnJWLB6n'),
    [isAlwaysOpen, indexToken]
  );
  const isForex = useMemo(() => {
    return !isAlwaysOpen && tokenConfig?.type === 'forex';
  }, [isAlwaysOpen, tokenConfig?.type]);
  const isStock = useMemo(() => tokenConfig?.type === 'stock', [tokenConfig?.type]);
  const { bgColor, icon } = getNoticeConfig(isAuOrAg || isCommodity || isForex || isStock ? 'warning' : 'info');
  const minLeverage = 0;
  const isGmw374Enabled = getGmw374Enabled();
  const maxLeverageValue = getGmw379Enabled()
    ? indexTokenData?.maxLeverage
    : indexTokenData.maxLeverage;
  const maxLeverage = isGmw374Enabled
    ? formatAmountToIntegerNumber(new BN(maxLeverageValue || 0), USD_DECIMALS) || 100
    : Number(formatAmount(new BN(indexTokenData?.maxLeverage || 0), USD_DECIMALS, 0)) || 100;
  useBodyScrollLock(getGmw417Enabled() ? isVisible : true);

  useEffect(() => {
    if (maxLeverage) {
      setMarks({
        0.1: '0.1x',
        [maxLeverage]: `${maxLeverage}x`
      });
    }
  }, [maxLeverage]);

  useEffect(() => {
    if (isVisible) {
      setSliderValue(Number(leverage) || 1);
    }
  }, [isVisible, leverage]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible, onClose]);

  const handleSliderChange = (value: number | number[]) => {
    const numValue = typeof value === 'number' ? value : value[0];
    let adjustedValue = numValue;
    if (numValue >= 0 && numValue < 1) {
      adjustedValue = 0.1;
    }
    setSliderValue(adjustedValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const regex = /^(\d*\.?\d{0,1}|\.\d{0,1})$/;
    if (value === '' || regex.test(value)) {
      const numValue = value.startsWith('.') ? parseFloat('0' + value) : parseFloat(value);
      setSliderValue(value === '' ? '' : (isNaN(numValue) ? value : value));
      if (value !== '' && !value.endsWith('.')) {
        if (!isNaN(numValue) && numValue >= minLeverage && numValue <= maxLeverage) {
          setSliderValue(value);
        }
      }
    }
  };

  const handleConfirm = () => {
    if (sliderValue && Number(sliderValue) >= minLeverage) {
      setLeverage(sliderValue.toString());
      localStorage.setItem(marketSymbol, sliderValue.toString());
      onClose();
    }
  };

  if (!isVisible) return null;

  return (
    <div className="adjust-leverage-modal-overlay">
      <div className="adjust-leverage-modal" ref={modalRef}>
        <div className="modal-header">
          <h2 className="title">{t`Adjust Leverage`}</h2>
          <button className="close-btn" onClick={onClose}>
            <img src={closeIcon} alt="close" />
          </button>
        </div>

        <div className="modal-content">
          <p className="description">{t`Control the leverage used for ${marketSymbol} positions.`}</p>

          <div className="slider-container no-copy select-none">
            <Slider
              min={minLeverage}
              max={maxLeverage}
              value={Number(sliderValue)}
              marks={marks}
              onChange={handleSliderChange}
              trackStyle={{ backgroundColor: '#FA7B4E' }}
              railStyle={{ backgroundColor: '#1F1F1F' }}
              handleStyle={{
                borderColor: '#FA7B4E',
                backgroundColor: '#181818',
                boxShadow: 'none',
              }}
              dotStyle={{
                backgroundColor: '#181818',
                borderColor: '#1F1F1F',
              }}
              activeDotStyle={{
                backgroundColor: '#181818',
                borderColor: '#FA7B4E',
              }}
              step={Number(sliderValue) <= 9.9 ? 0.1 : 1}
            />

            <div className="input-container">
              <input
                type="text"
                value={sliderValue.toString()}
                onChange={handleInputChange}
                onBlur={(e) => {
                  const value = e.target.value;
                  if (value === '0.' || value === '.') {
                    setSliderValue('0.1');
                    return;
                  }
                }}
                className="leverage-input"
              />
              <span className="input-suffix">x</span>
            </div>
          </div>

          <Button
            qa="confirm-trade-button"
            variant="primary-action"
            className={`tradeBox-exchangeForm-button w-full [text-decoration:inherit] h-12 mb-6`}
            type="submit"
            onClick={handleConfirm}
            disabled={!sliderValue || /^0+$/.test(Number(sliderValue).toString()) || /^0+\.0*$/.test(Number(sliderValue).toString()) || sliderValue === '0.' || Number(sliderValue) > maxLeverage}
          >
            {Number(sliderValue) > maxLeverage ? t`Max leverage exceeded` : t`Confirm`}
          </Button>

          <NoticeCard
            type={isAuOrAg || isCommodity || isForex || isStock ? "warning" : "info"}
            cardType="notice"
            title={
              isAuOrAg || isCommodity
                ? (
                  <div>
                    <p>{t`During non-trading periods:`}</p>
                    <p style={{ margin: '0.5rem 0' }}>• {t`Daily break: 17:00 – 18:00 ET`}</p>
                    <p style={{ marginBottom: '0.5rem' }}>• {t`Outside Sun 18:00 – Fri 17:00 ET`}</p>
                    <p style={{ marginBottom: '0.5rem' }}>• {t`Market holidays`}</p>
                    <p>{t`Maximum leverage is capped at ${marketInfo?.mCMCFForLiquidation && !new BN(marketInfo.mCMCFForLiquidation).isZero() ? formatAmount(new BN(10).pow(new BN(USD_DECIMALS * 2)).div(new BN(marketInfo.mCMCFForLiquidation)), USD_DECIMALS, 0) : '0'}x. Positions exceeding this limit may be forcibly closed.`}</p>
                  </div>
                )
                : isForex
                  ? t`During off-hours (outside Sun 17:00 – Fri 17:00 ET) and market holidays, maximum leverage is capped at ${marketInfo?.mCMCFForLiquidation && !new BN(marketInfo.mCMCFForLiquidation).isZero() ? formatAmount(new BN(10).pow(new BN(USD_DECIMALS * 2)).div(new BN(marketInfo.mCMCFForLiquidation)), USD_DECIMALS, 0) : '0'}x. Positions exceeding this limit may be forcibly closed.`
                  : isStock
                    ? t`During off-hours (outside 9:30 – 16:00 ET on trading days) and market holidays, maximum leverage is capped at ${marketInfo?.mCMCFForLiquidation && !new BN(marketInfo.mCMCFForLiquidation).isZero() ? formatAmount(new BN(10).pow(new BN(USD_DECIMALS * 2)).div(new BN(marketInfo.mCMCFForLiquidation)), USD_DECIMALS, 0) : '0'}x. Positions exceeding this limit may be forcibly closed.`
                    : t`Note that higher leverage increases liquidation risk.`
            }
            bgColor={bgColor}
            icon={icon}
          />

        </div>
      </div>
    </div>
  );
}

export default memo(AdjustLeverageModal);
