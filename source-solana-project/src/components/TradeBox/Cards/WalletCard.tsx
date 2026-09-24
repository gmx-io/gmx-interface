import TokenIcon from '@/components/Common/TokenIcon/TokenIcon';
import {
  Table,
  TableTd,
  TableTh,
  TableTr,
  TableTheadTr,
} from '@/components/Common/Table/Table';
import { BN_ZERO } from '@/config/constants';
import { selectTokensData } from '@/selectors/token/selectTokensData';
import { useAppStore } from '@/zustand/useAppStore';
import { t, Trans } from '@lingui/macro';
import { formatAmount, formatUsd } from '@/utils/legacy/format';
import { convertTokenAmountToUsd } from '@/utils/legacy/convert';
import { useMemo } from 'react';
import { useAnchor } from '@/contexts/anchor';

export function WalletCard() {
  const tokensData = useAppStore(selectTokensData);
  const { active, owner } = useAnchor();

  // Filter and sort tokens by value
  const sortedTokens = useMemo(() => {
    return Object.values(tokensData)
      .filter((token) => token.balance && !token.balance.isZero())
      .sort((a, b) => {
        const aBalanceUsd = a.balance
          ? convertTokenAmountToUsd(a.balance, a.decimals, a.prices.minPrice)
          : BN_ZERO;
        const bBalanceUsd = b.balance
          ? convertTokenAmountToUsd(b.balance, b.decimals, b.prices.minPrice)
          : BN_ZERO;

        return bBalanceUsd.cmp(aBalanceUsd);
      });
  }, [tokensData]);

  const totalBalanceUsd = useMemo(() => {
    return sortedTokens.reduce((total, token) => {
      const balanceUsd = token.balance
        ? convertTokenAmountToUsd(
            token.balance,
            token.decimals,
            token.prices.minPrice
          )
        : BN_ZERO;
      return total.add(balanceUsd);
    }, BN_ZERO);
  }, [sortedTokens]);

  // If not connected, show connect wallet message
  if (!active || !owner) {
    return (
      <>
        <Table className="border-radius-4 mt-0 min-h-[20rem] w-full max-w-full overflow-hidden overflow-x-auto rounded-lg sm:overflow-visible [@media(min-width:1100px)]:mt-10">
          <thead>
            <TableTheadTr bordered={false}>
              <TableTh className="py-10">{/* Column 1 */}</TableTh>
              <TableTh className="py-10">{/* Column 2 */}</TableTh>
              <TableTh className="py-10">{/* Column 3 */}</TableTh>
            </TableTheadTr>
          </thead>
          <tbody>
            <TableTr hoverable={false} bordered={false}>
              <TableTd
                className="text-body-medium py-20 text-center text-gray-400"
                colSpan={3}
              >
                <Trans>Connect your wallet to view balance</Trans>
              </TableTd>
            </TableTr>
          </tbody>
        </Table>
      </>
    );
  }

  // If connected but no tokens, show loading instead of hiding
  if (sortedTokens.length === 0) {
    return (
      <>
        <Table className="border-radius-4 mt-0 min-h-[20rem] w-full max-w-full overflow-hidden overflow-x-auto rounded-lg sm:overflow-visible [@media(min-width:1100px)]:mt-10">
          <thead>
            <TableTheadTr bordered={false}>
              <TableTh className="py-10">{/* Column 1 */}</TableTh>
              <TableTh className="py-10">{/* Column 2 */}</TableTh>
              <TableTh className="py-10">{/* Column 3 */}</TableTh>
            </TableTheadTr>
          </thead>
          <tbody>
            <TableTr hoverable={false} bordered={false}>
              <TableTd
                className="text-body-medium py-20 text-center text-gray-400"
                colSpan={3}
              >
                <Trans>Loading...</Trans>
              </TableTd>
            </TableTr>
          </tbody>
        </Table>
      </>
    );
  }

  return (
    <>
      <Table className="border-radius-4 mt-0 w-full max-w-full overflow-hidden overflow-x-auto rounded-lg sm:overflow-visible [@media(min-width:1100px)]:mt-10">
        <thead>
          {/* Total Value Row */}
          <TableTheadTr bordered={false}>
            <TableTh className="text-body-medium py-10 text-left text-slate-300">
              {t`Total`}
            </TableTh>
            <TableTh
              colSpan={2}
              className="text-body-medium py-10 text-right text-white"
            >
              {formatUsd(totalBalanceUsd)}
            </TableTh>
          </TableTheadTr>
        </thead>
        <tbody>
          {sortedTokens.map((token) => {
            const balance = token.balance || BN_ZERO;
            const balanceUsd = convertTokenAmountToUsd(
              balance,
              token.decimals,
              token.prices.minPrice
            );

            return (
              <TableTr
                key={token.address.toBase58()}
                hoverable={false}
                bordered={false}
              >
                <TableTd className="text-body-medium py-10">
                  <div className="flex items-center gap-2">
                    <TokenIcon
                      symbol={token.symbol}
                      displaySize={20}
                      importSize={24}
                      className="relative flex-shrink-0 overflow-hidden rounded-full"
                    />
                    <div className="max-w-[100px] truncate sm:max-w-none">
                      {token.symbol}
                    </div>
                  </div>
                </TableTd>
                <TableTd className="text-body-medium whitespace-nowrap py-10 text-left">
                  {formatAmount(balance, token.decimals, 4, true, true)}
                </TableTd>
                <TableTd className="text-body-medium whitespace-nowrap py-10 text-right">
                  {formatUsd(balanceUsd)}
                </TableTd>
              </TableTr>
            );
          })}
        </tbody>
      </Table>
    </>
  );
}
