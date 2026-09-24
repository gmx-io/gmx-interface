import './TopGtHoldersModal.scss';

import { useEffect, useMemo, useState } from 'react';
import External from '@/img/externalGmw411.svg'
import { t, Trans } from '@lingui/macro';

import Modal from '@/components/Common/Modal/Modal';
import { BottomTablePagination } from '@/components/Common/Pagination/BottomTablePagination';
import CellSkeleton from '@/components/Common/Skeleton/CellSkeleton';
import { useGtGlobalDetails } from '@/hooks/fetchHooks/useGtGlobalDetails';
import { useBatchReferralCodes } from '@/hooks/referralHooks/useBatchReferralCodes';
import { useGtRankStats } from '@/hooks/statsHooks/useGtRankStats';
import mobileCopyIcon from '@/img/ic_copy_12.svg';
import copyIcon from '@/img/ic_copy_16.svg';
import { getGmw465Enabled } from '@/config/featureFlagEnable';
import { formatAmount } from '@/utils/legacy/format';
import { EXPLORER_URL, getAddressUrl } from '@/utils/lib/explorer';
import { helperNotice } from '@/utils/lib/helperNotice';
import { generateAccountInfo } from '@/utils/index';

const TOP_GT_HOLDERS_PAGE_SIZE = 20;
const GT_VAULT_ADDRESS = 'UxcS4ZQqkm2Aw9nTVQp1CXRqZ1J1qagnUhcu72yVwt9';

function getExplorerAccountUrl(address: string) {
  if (getGmw465Enabled()) {
    return getAddressUrl(address);
  }
  return `${EXPLORER_URL}/address/${address}`;
}

export type TopGtHoldersModalProps = {
  isVisible: boolean;
  onClose: () => void;
  onReferralCodeCopied?: (referralCode: string) => void;
  initialPage?: number;
  zIndex?: number;
};

function formatOwnerAddress(address: string) {
  if (address.length <= 12) {
    return address;
  }

  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

function formatMobileOwnerAddress(address: string) {
  if (address.length <= 12) {
    return address;
  }

  return `${address.slice(0, 7)}...${address.slice(-5)}`;
}

function formatGtHoldings(
  amount: Parameters<typeof formatAmount>[0],
  decimals?: number
) {
  if (decimals === undefined || decimals === null) {
    return '-';
  }

  return `${formatAmount(amount, decimals, 2, true)} GT`;
}

export default function TopGtHoldersModal({
  isVisible,
  onClose,
  onReferralCodeCopied,
  initialPage = 1,
  zIndex,
}: TopGtHoldersModalProps) {
  const [page, setPage] = useState(initialPage);
  const { gtGlobalDetails } = useGtGlobalDetails();
  const gtDecimals = gtGlobalDetails?.decimals;
  const { gtRankStats, pageCount, isLoading } = useGtRankStats({
    page,
    pageSize: TOP_GT_HOLDERS_PAGE_SIZE,
  });

  const currentPageItems = gtRankStats.userRanks;
  const currentPageOwners = useMemo(
    () => currentPageItems.map((user) => user.owner),
    [currentPageItems]
  );
  const { referralCodes, isLoading: isReferralCodesLoading } =
    useBatchReferralCodes(currentPageOwners);

  useEffect(() => {
    if (isVisible) {
      setPage(initialPage);
    }
  }, [initialPage, isVisible]);

  useEffect(() => {
    setPage((currentPage) => Math.min(currentPage, Math.max(pageCount, 1)));
  }, [pageCount]);

  useEffect(() => {
    if (!currentPageItems.length) {
      return undefined;
    }

    const prefetchOwners = () => {
      currentPageItems.forEach((user) => {
        generateAccountInfo(user.owner.toBase58());
      });
    };

    if (window.requestIdleCallback) {
      const idleCallbackId = window.requestIdleCallback(prefetchOwners);
      return () => window.cancelIdleCallback(idleCallbackId);
    }

    const timeoutId = window.setTimeout(prefetchOwners, 0);
    return () => window.clearTimeout(timeoutId);
  }, [currentPageItems]);

  const handleVisibilityChange = (nextVisible: boolean) => {
    if (!nextVisible) {
      onClose();
    }
  };

  const handleCopyReferralCode = (referralCode: string) => {
    void navigator.clipboard.writeText(referralCode).then(() => {
      onReferralCodeCopied?.(referralCode);
      helperNotice.success(t`Referral code copied to clipboard.`);
    });
  };

  return (
    <Modal
      isVisible={isVisible}
      setIsVisible={handleVisibilityChange}
      zIndex={zIndex}
      className="referral-top-gt-holders-modal"
      qa="referral-top-gt-holders-modal"
      label={<Trans>Top GT Holders</Trans>}
      noDivider
      contentPadding={false}
    >
      <div className="referral-top-gt-holders-modal__content">
        <div className="referral-top-gt-holders-modal__table-scroll">
          <table className="referral-top-gt-holders-modal__table">
            <colgroup>
              <col className="referral-top-gt-holders-modal__rank-col" />
              <col className="referral-top-gt-holders-modal__address-col" />
              <col className="referral-top-gt-holders-modal__holdings-col" />
              <col className="referral-top-gt-holders-modal__code-col" />
            </colgroup>
            <thead>
              <tr>
                <th>
                  <Trans>Rank</Trans>
                </th>
                <th>
                  <Trans>Address</Trans>
                </th>
                <th>
                  <Trans>GT HOLDINGS</Trans>
                </th>
                <th>
                  <Trans>REFERRAL CODE</Trans>
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: TOP_GT_HOLDERS_PAGE_SIZE }).map(
                  (_, index) => (
                    <tr
                      className="referral-top-gt-holders-modal__row"
                      key={`top-gt-holder-skeleton-${index}`}
                    >
                      <td>
                        <CellSkeleton width={24} height={16} />
                      </td>
                      <td>
                        <div className="referral-top-gt-holders-modal__address-cell">
                          <CellSkeleton width={20} height={20} radius="50%" />
                          <CellSkeleton width={120} height={16} />
                        </div>
                      </td>
                      <td>
                        <CellSkeleton width={112} height={16} />
                      </td>
                      <td>
                        <div className="referral-top-gt-holders-modal__code-cell">
                          <CellSkeleton width={64} height={16} />
                        </div>
                      </td>
                    </tr>
                  )
                )
                : null}

              {!isLoading && currentPageItems.length
                ? currentPageItems.map((user, index) => {
                  const ownerAddress = user.owner.toBase58();
                  const accountInfo = generateAccountInfo(ownerAddress);
                  const referralCode = referralCodes[ownerAddress];
                  const displayName =
                    ownerAddress === GT_VAULT_ADDRESS
                      ? 'GMX GT Vault'
                      : formatOwnerAddress(ownerAddress);
                  const displayRank =
                    (page - 1) * TOP_GT_HOLDERS_PAGE_SIZE + index + 1;

                    return (
                      <tr
                        className="referral-top-gt-holders-modal__row"
                        key={ownerAddress}
                      >
                        <td>{displayRank}</td>
                        <td>
                          <div className="referral-top-gt-holders-modal__address-cell">
                            <img
                              src={accountInfo.avator}
                              alt={accountInfo.nickName}
                              className="referral-top-gt-holders-modal__avatar"
                            />
                            <span>{displayName}</span>
                            <a
                              href={getExplorerAccountUrl(ownerAddress)}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={t`View address on explorer`}
                              className="referral-top-gt-holders-modal__external-link"
                            >
                            <img src={External} className='w-[1.2rem] h-[1.2rem]' />
                            </a>
                          </div>
                        </td>
                        <td>{formatGtHoldings(user.gt, gtDecimals)}</td>
                        <td>
                          <div className="referral-top-gt-holders-modal__code-cell">
                            {isReferralCodesLoading && !referralCode ? (
                              <CellSkeleton width={56} height={16} />
                            ) : (
                              <span>{referralCode || '-'}</span>
                            )}
                            {referralCode ? (
                              <button
                                type="button"
                                className="referral-top-gt-holders-modal__copy-button"
                                onClick={() =>
                                  handleCopyReferralCode(referralCode)
                                }
                                aria-label={t`Copy referral code`}
                              >
                                <img src={copyIcon} alt="" aria-hidden="true" />
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                : null}

              {!isLoading && !currentPageItems.length ? (
                <tr>
                  <td colSpan={4}>
                    <div className="referral-top-gt-holders-modal__empty">
                      <Trans>No data available</Trans>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {pageCount > 1 ? (
          <div className="referral-top-gt-holders-modal__pagination">
            <BottomTablePagination
              page={page}
              pageCount={pageCount}
              onPageChange={setPage}
            />
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

export function TopGtHoldersMobileModal({
  isVisible,
  onClose,
  onReferralCodeCopied,
  initialPage = 1,
  zIndex,
}: TopGtHoldersModalProps) {
  const [page, setPage] = useState(initialPage);
  const { gtGlobalDetails } = useGtGlobalDetails();
  const gtDecimals = gtGlobalDetails?.decimals;
  const { gtRankStats, pageCount, isLoading } = useGtRankStats({
    page,
    pageSize: TOP_GT_HOLDERS_PAGE_SIZE,
  });

  const currentPageItems = gtRankStats.userRanks;
  const currentPageOwners = useMemo(
    () => currentPageItems.map((user) => user.owner),
    [currentPageItems]
  );
  const { referralCodes, isLoading: isReferralCodesLoading } =
    useBatchReferralCodes(currentPageOwners);

  useEffect(() => {
    if (isVisible) {
      setPage(initialPage);
    }
  }, [initialPage, isVisible]);

  useEffect(() => {
    setPage((currentPage) => Math.min(currentPage, Math.max(pageCount, 1)));
  }, [pageCount]);

  useEffect(() => {
    if (!currentPageItems.length) {
      return undefined;
    }

    const prefetchOwners = () => {
      currentPageItems.forEach((user) => {
        generateAccountInfo(user.owner.toBase58());
      });
    };

    if (window.requestIdleCallback) {
      const idleCallbackId = window.requestIdleCallback(prefetchOwners);
      return () => window.cancelIdleCallback(idleCallbackId);
    }

    const timeoutId = window.setTimeout(prefetchOwners, 0);
    return () => window.clearTimeout(timeoutId);
  }, [currentPageItems]);

  const handleVisibilityChange = (nextVisible: boolean) => {
    if (!nextVisible) {
      onClose();
    }
  };

  const handleCopyReferralCode = (referralCode: string) => {
    void navigator.clipboard.writeText(referralCode).then(() => {
      onReferralCodeCopied?.(referralCode);
      helperNotice.success(t`Referral code copied to clipboard.`);
    });
  };

  return (
    <Modal
      isVisible={isVisible}
      setIsVisible={handleVisibilityChange}
      zIndex={zIndex}
      className="referral-top-gt-holders-mobile-modal"
      qa="referral-top-gt-holders-mobile-modal"
      label={<Trans>Top GT Holders</Trans>}
      noDivider
      contentPadding={false}
    >
      <div className="referral-top-gt-holders-mobile-modal__content">
        <div className="referral-top-gt-holders-mobile-modal__list" role="list">
          {isLoading
            ? Array.from({ length: TOP_GT_HOLDERS_PAGE_SIZE }).map(
              (_, index) => (
                <div
                  className="referral-top-gt-holders-mobile-modal__row"
                  key={`top-gt-holder-mobile-skeleton-${index}`}
                  role="listitem"
                >
                  <div className="referral-top-gt-holders-mobile-modal__left">
                    <CellSkeleton width={16} height={18} />
                    <CellSkeleton width={24} height={24} radius="50%" />
                    <div className="referral-top-gt-holders-mobile-modal__identity">
                      <CellSkeleton width={112} height={18} />
                      <CellSkeleton width={68} height={18} />
                    </div>
                  </div>
                  <CellSkeleton width={96} height={18} />
                </div>
              )
            )
            : null}

          {!isLoading && currentPageItems.length
            ? currentPageItems.map((user, index) => {
              const ownerAddress = user.owner.toBase58();
              const accountInfo = generateAccountInfo(ownerAddress);
              const referralCode = referralCodes[ownerAddress];
              const displayName =
                ownerAddress === GT_VAULT_ADDRESS
                  ? 'GMX GT Vault'
                  : formatMobileOwnerAddress(ownerAddress);
              const displayRank =
                (page - 1) * TOP_GT_HOLDERS_PAGE_SIZE + index + 1;

                return (
                  <div
                    className="referral-top-gt-holders-mobile-modal__row"
                    key={ownerAddress}
                    role="listitem"
                  >
                    <div className="referral-top-gt-holders-mobile-modal__left">
                      <span className="referral-top-gt-holders-mobile-modal__rank">
                        {displayRank}
                      </span>
                      <img
                        src={accountInfo.avator}
                        alt={accountInfo.nickName}
                        className="referral-top-gt-holders-mobile-modal__avatar"
                      />
                      <div className="referral-top-gt-holders-mobile-modal__identity">
                        <div className="referral-top-gt-holders-mobile-modal__address">
                          <span>{displayName}</span>
                          <a
                            href={getExplorerAccountUrl(ownerAddress)}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={t`View address on explorer`}
                            className="referral-top-gt-holders-mobile-modal__external-link"
                          >
                            <img src={External} className='w-[1.2rem] h-[1.2rem]' />
                          </a>
                        </div>
                        <div className="referral-top-gt-holders-mobile-modal__code">
                          {isReferralCodesLoading && !referralCode ? (
                            <CellSkeleton width={56} height={18} />
                          ) : (
                            <span>{referralCode || '-'}</span>
                          )}
                          {referralCode ? (
                            <button
                              type="button"
                              className="referral-top-gt-holders-mobile-modal__copy-button"
                              onClick={() =>
                                handleCopyReferralCode(referralCode)
                              }
                              aria-label={t`Copy referral code`}
                            >
                              <img
                                src={mobileCopyIcon}
                                alt=""
                                aria-hidden="true"
                              />
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="referral-top-gt-holders-mobile-modal__holdings">
                      {formatGtHoldings(user.gt, gtDecimals)}
                    </div>
                  </div>
                );
              })
            : null}

          {!isLoading && !currentPageItems.length ? (
            <div className="referral-top-gt-holders-mobile-modal__empty">
              <Trans>No data available</Trans>
            </div>
          ) : null}
        </div>

        {pageCount > 1 ? (
          <div className="referral-top-gt-holders-mobile-modal__pagination">
            <BottomTablePagination
              page={page}
              pageCount={pageCount}
              onPageChange={setPage}
            />
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
