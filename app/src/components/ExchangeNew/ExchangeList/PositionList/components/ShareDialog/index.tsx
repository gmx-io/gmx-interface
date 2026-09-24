import './index.scss';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Trans, t } from '@lingui/macro';
import { QRCodeSVG } from 'qrcode.react';
import { useMedia } from 'react-use';
import { toJpeg } from 'html-to-image';

import CopyIcon from '@/img/share/Copy.svg';
import DownloadIcon from '@/img/share/Download.svg';
import GMXSOL from '@/img/logo-gm-trade-white.svg';
import ShareCardFigure from '@/img/share/share-card-figure.svg';
import ShareCardCandles from '@/img/share/share-card-candles.svg';
import xIcon from '@/img/X.svg';
import UpRightArrow from '@/img/up-right.svg';
import DownRightArrow from '@/img/down-right.svg';
import LoadingBlue from '@/img/Loading-bule.svg?react';

import Modal from '@/components/Common/Modal/Modal';
import ToggleSwitch from '@/components/Common/ToggleSwitch/ToggleSwitch';
import Button from '@/components/Common/Button/Button';

import { useAppStore } from '@/zustand/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { selectReferralCode } from '@/selectors/referral/baseSelectors';
import { useDecodeReferralCode } from '@/hooks/referralHooks';
import {
  selectIsPnlInLeverage,
  selectShowPnlAfterFees,
} from '@/selectors/setting/baseSelectors';
import { PositionInfo } from '@/selectors/position/types';
import { getPositionPendingFeesUsd } from '@/utils/position/getPositionPendingFeesUsd';
import { getBasisPoints } from '@/utils/legacy/common';
import { formatLeverage, formatUsd, formatPriceUsd, formatParseUsdToBN } from '@/utils/legacy/format';
import { getIconUrlPath } from '@/utils/lib/icon';
import { BN } from '@coral-xyz/anchor';
import {
  GMX_SOLANA_SHARE_ENDPOINT,
  GMX_SOLANA_UPLOAD_ENDPOINT,
} from '@/config/url';
import { helperNotice } from '@/utils/lib/helperNotice';
import { GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS } from '@/config/program';

function waitForImages(container: HTMLElement) {
  const images = Array.from(container.querySelectorAll('img'));
  return Promise.all(
    images.map(
      (img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          })
    )
  );
}

async function captureStableJpeg(element: HTMLElement) {
  await new Promise((r) => requestAnimationFrame(r));
  await new Promise((r) => requestAnimationFrame(r));
  await waitForImages(element);

  return toJpeg(element, { backgroundColor: 'transparent', quality: 0.95, pixelRatio: 2 })
    .then(() => toJpeg(element, { backgroundColor: 'transparent', quality: 0.95, pixelRatio: 2 }))
    .then(() => toJpeg(element, { backgroundColor: 'transparent', quality: 0.95, pixelRatio: 2 }));
}


interface RawPositionFields {
  entry_price?: string | number;
  mark_price?: string | number;
  decimals?: number;
  symbol?: string;
  leverage?: BN | string | number;
  sizeInUsd?: BN;
  pending_borrowing_fee_value?: string | number;
  pending_funding_fee_value?: string | number;
  collateral_value?: string | number;
  pending_pnl?: string | number;
  close_order_fee_value?: string | number;
  marketInfo?: {
    indexToken?: string;
  };
}

type PositionWithRawFields = PositionInfo & RawPositionFields;

export interface ShareDialogProps {
  position: PositionInfo;
  isVisible: boolean;
  onClose: () => void;
  type: 'position' | 'trade';
}

export default function ShareDialog({ isVisible, onClose, position, type }: ShareDialogProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isScreen768 = useMedia('(max-width: 768px)');

  const referralCode = useAppStore(selectReferralCode);
  const decodeReferralCode = useDecodeReferralCode();

  const [decodedReferralCode, setDecodedReferralCode] = useState('');
  const [showPNL, setShowPNL] = useState(false);
  const [qrCodeValue, setQrCodeValue] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  //position
  const [cachedPosition, setCachedPosition] = useState<PositionInfo | null>(null);

  const prevVisibleRef = useRef(false);
  const prevShowPNLRef = useRef(false);
  const hasInitialUploadRef = useRef(false);

  const savedShowPnlAfterFees = useAppStore(selectShowPnlAfterFees);
  const isPnlInLeverage = useAppStore(selectIsPnlInLeverage);
  const { tokenPriceMap } = useAppStore(
    useShallow((state) => ({
      tokenPriceMap: state.tickersState.tokenPriceMap,
    }))
  );

  const gmxTrade = 'https://gmtrade.xyz';

  useEffect(() => {
    if (referralCode && !decodedReferralCode) {
      void decodeReferralCode(referralCode).then(setDecodedReferralCode);
    }
  }, [referralCode, decodedReferralCode]);

  useEffect(() => {
    const origin = window.location.origin;
    // setQrCodeValue('https://beta.gmxsol.io/');
    setQrCodeValue(origin);
  }, [cachedPosition]);


  const displayData = useMemo(() => {
    if (!cachedPosition) return null;

    const posWithRaw = cachedPosition as PositionWithRawFields;

    const pendingBorrowingFeeValue = new BN(posWithRaw?.pending_borrowing_fee_value?.toString() || '0');
    const pendingFundingFeeValue = new BN(posWithRaw?.pending_funding_fee_value?.toString() || '0');

    const pendingBorrowingFeesUsd = pendingBorrowingFeeValue.abs();
    const pendingFundingFeesUsd = pendingFundingFeeValue.abs();
    const collateralValue = new BN(posWithRaw?.collateral_value?.toString() || '0');
    const pendingPnl = new BN(posWithRaw?.pending_pnl?.toString() || '0');

    const totalPendingFeesUsd = getPositionPendingFeesUsd({
      pendingBorrowingFeesUsd,
      pendingFundingFeesUsd,
    });

    const pnlAfterFees = pendingPnl
      .sub(totalPendingFeesUsd)
      .sub(new BN(posWithRaw?.close_order_fee_value?.toString() || '0'));

    const pnlAfterFeesPercentage =
      !collateralValue.isZero()
        ? getBasisPoints(
          pnlAfterFees,
          collateralValue.add(new BN(posWithRaw?.close_order_fee_value?.toString() || '0'))
        )
        : 0;

    const pnlPercentage =
      !collateralValue.isZero() ? getBasisPoints(pendingPnl, collateralValue) : 0;

    const displayedPnl = savedShowPnlAfterFees ? pnlAfterFees : pendingPnl;
    const displayedPnlPercentage = savedShowPnlAfterFees
      ? pnlAfterFeesPercentage
      : pnlPercentage;

    const netCollateralValue = collateralValue
      .sub(pendingBorrowingFeesUsd)
      .sub(pendingFundingFeesUsd);

    let displayedLeverage: BN | undefined;
    if (isPnlInLeverage && posWithRaw?.leverage) {
      displayedLeverage = new BN(posWithRaw.leverage.toString());
    } else if (posWithRaw?.sizeInUsd && !netCollateralValue.isZero()) {
      displayedLeverage = posWithRaw.sizeInUsd
        .mul(new BN(10).pow(new BN(20)))
        .div(netCollateralValue);
    }

    const symbol = posWithRaw?.symbol || 'Unknown';
    const pnlSign = displayedPnlPercentage >= 0 ? '+' : '';

    const entryPriceText =
      formatPriceUsd(
        formatParseUsdToBN('1', posWithRaw?.decimals).mul(
          new BN(posWithRaw?.entry_price?.toString() || 0)
        ),
        {
          fallbackToZero: true,
          // displayDecimals: 2,
          isDisplayDecimals: GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(posWithRaw?.marketInfo?.indexToken)
        }
      ) || '$0.00';

    const indexToken = posWithRaw?.marketInfo?.indexToken;
    const tokenPrice = indexToken ? tokenPriceMap.get(indexToken)?.price : undefined;

    return {
      directionText: cachedPosition.isLong ? t`Long` : t`Short`,
      leverageText: displayedLeverage ? formatLeverage(displayedLeverage) : '0.00x',
      symbol,
      pnlPercentage: displayedPnlPercentage,
      pnlText: `${pnlSign}${(displayedPnlPercentage / 100).toFixed(2)}%`,
      pnlUsdText: formatUsd(displayedPnl, {
        displayDecimals: 2,
        signed: true,
        showDollarSign: false,
      }),
      entryPriceText,
      markPriceText: tokenPrice
        ? formatPriceUsd(new BN(tokenPrice), {
          fallbackToZero: true,
          // displayDecimals: 2,
          isDisplayDecimals: GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(indexToken)
        })
        : '$0.00',
      tokenIcon: getIconUrlPath(symbol, 24),
      directionIcon: cachedPosition.isLong ? UpRightArrow : DownRightArrow,
    };
  }, [cachedPosition, savedShowPnlAfterFees, isPnlInLeverage, tokenPriceMap]);

  /* ---------- upload ---------- */

  const uploadImage = useCallback(async () => {

    // debugger;

    if (!cardRef.current || !displayData) return null;
    try {
      setIsUploading(true);
      const dataUrl = await captureStableJpeg(cardRef.current);
      const blob = await (await fetch(dataUrl)).blob();

      const file = new File(
        [blob],
        `gmx_${displayData.symbol}_${type}_${Date.now()}.jpg`,
        { type: 'image/jpeg' }
      );

      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(GMX_SOLANA_UPLOAD_ENDPOINT, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');

      const data = await res.json();
      setUploadedImageUrl(data?.key);
      return data?.key;
    } finally {
      setIsUploading(false);
    }
  }, [displayData, type]);



  useEffect(() => {
    if (!prevVisibleRef.current && isVisible) {
      setCachedPosition(position);  // position
      setUploadedImageUrl(null);
      setShowPNL(false);
      prevShowPNLRef.current = false;
      hasInitialUploadRef.current = false;
    }
    prevVisibleRef.current = isVisible;
  }, [isVisible, position]);

  useEffect(() => {
    if (isVisible && cachedPosition && displayData && !hasInitialUploadRef.current) {
      hasInitialUploadRef.current = true;
      void uploadImage();
    }
  }, [isVisible, cachedPosition, displayData, uploadImage]);

  useEffect(() => {
    if (isVisible && cachedPosition && displayData && hasInitialUploadRef.current && prevShowPNLRef.current !== showPNL) {
      prevShowPNLRef.current = showPNL;
      void uploadImage();
    }
  }, [showPNL, isVisible, cachedPosition, displayData, uploadImage]);

  const handleShowPNLChange = (checked: boolean) => {
    setShowPNL(checked);
  };

  const handleDownloadImage = async () => {
    if (!cardRef.current) return;
    const dataUrl = await captureStableJpeg(cardRef.current);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `gmx-position-${Date.now()}.jpg`;
    link.click();
  };

  const assembleUrl = () => {
    const url = new URL(GMX_SOLANA_SHARE_ENDPOINT);
    url.searchParams.set('id', uploadedImageUrl || '');

    if (window.location.origin === gmxTrade) {
      url.searchParams.set('p', 'g');
    }
    return url;
  };

  const handleCopy = async () => {
    const url = assembleUrl();
    await navigator.clipboard.writeText(url.toString());
    helperNotice.success(t`Link copied to clipboard.`);
  };

  const handleShareOnTwitter = () => {
    const url = assembleUrl();
    const twitterUrl = new URL('https://twitter.com/intent/tweet');
    twitterUrl.searchParams.set('text', `Latest $${displayData?.symbol} trade on @GMX_SOL`);
    twitterUrl.searchParams.set('url', url.toString());

    window.open(twitterUrl.toString(), '_blank');
  };

  if (!isVisible || !displayData) return null;

  return (
    <Modal isVisible={isVisible} label={t`Share Position`} setIsVisible={onClose} className="share-dialog">
      <div className="container">
        {isUploading && (
          <div className="upload-status-overlay">
            <div className="upload-status-content">
              <LoadingBlue className="upload-spinner" />
              <span><Trans>Generating shareable image...</Trans></span>
            </div>
          </div>
        )}
        <div className="card" ref={cardRef}>
          <div className="card-bg">
            <img className="share-card-figure" src={ShareCardFigure} alt="" />
            <img className="share-card-candles" src={ShareCardCandles} alt="" />
            <div className="card-cover">
              <div className="card-content">
                <div className="card-content-header">
                  <div className="logo"><img src={GMXSOL} alt="GMTrade" /></div>
                  <div className="qr-code">
                    <QRCodeSVG
                      value={qrCodeValue || ''}
                      size={isScreen768 ? 26 : 34}
                      level="L"
                      marginSize={0}
                      bgColor="transparent"
                      fgColor="#FFFFFF"
                    />
                  </div>
                </div>
                <div className="card-content-main">
                  <div className="icons">
                    <div className={`icon-container ${displayData.directionText === 'Long' ? 'up' : 'down'}`}>
                      <div className="icon"><img src={displayData.directionIcon} alt="Direction" /></div>
                      <div className="text"><span className="font-text-number">{displayData.directionText} {displayData.leverageText}</span></div>
                    </div>
                    <div className="icon-container">
                      <div className="icon">{displayData.tokenIcon && <img src={displayData.tokenIcon} alt={displayData.symbol} />}</div>
                      <div className="text"><span className="font-text-number">{displayData.symbol} / USD</span></div>
                    </div>
                  </div>
                  <div className={`number ${displayData.pnlPercentage >= 0 ? 'positive' : 'negative'}`}>
                    <div className="font-text-number">
                      {displayData.pnlText}
                      {showPNL && <span className="pnl-usd"> {displayData.pnlUsdText} USD</span>}
                    </div>
                  </div>
                </div>
                <div className="card-content-footer mt-[2.4rem]">
                  <div className="text-container">
                    <div className="title font-relative"><Trans>ENTRY PRICE</Trans></div>
                    <span className="content font-text-number">{displayData.entryPriceText}</span>
                  </div>
                  <div className="text-container">
                    <div className="title font-relative"><Trans>MARK PRICE</Trans></div>
                    <span className="content font-text-number">{displayData.markPriceText}</span>
                  </div>
                  <div className="text-container">
                    <div className="title font-relative "><Trans>REFERRAL CODE</Trans></div>
                    <span className="content font-text-number">{decodedReferralCode || '-'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="show-pln">
          <ToggleSwitch isChecked={showPNL} setIsChecked={handleShowPNLChange} disabled={isUploading}><Trans>Show PNL Amounts</Trans></ToggleSwitch>
        </div>

        <div className="action">
          <Button className='!bg-fill-surface-elevated' variant="secondary" disabled={isUploading} onClick={() => void handleCopy()}>
            <div className="button-content"><img src={CopyIcon} alt="Copy" width={12} height={12} /><Trans>Copy link</Trans></div>
          </Button>
          <Button className='!bg-fill-surface-elevated' variant="secondary" disabled={isUploading} onClick={() => void handleDownloadImage()}>
            <div className="button-content"><img src={DownloadIcon} alt="Download" width={12} height={12} /><Trans>Download</Trans></div>
          </Button>
          <Button className='!bg-fill-surface-elevated' variant="secondary" disabled={isUploading} onClick={() => void handleShareOnTwitter()}>
            <div className="button-content"><img src={xIcon} alt="X" width={12} height={12} /><Trans>Tweet</Trans></div>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
