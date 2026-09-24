import './ConnectWalletButton.scss';

import Button from '@/components/Common/Button/Button';
import walletImg from '@/img/Wallet.svg';
import { Trans } from '@lingui/macro';
import cx from 'classnames';
import { useCallback, useState } from 'react';
import { MdOutlineStopCircle } from 'react-icons/md';

type Props = {
  small?: boolean;
  onConnect: () => void;
  onCancel?: () => void;
  connecting: boolean;
  disconnecting: boolean;
};

export default function ConnectWalletButton({
  small,
  onConnect,
  onCancel,
  connecting,
  disconnecting,
}: Props) {
  const [hover, setHover] = useState(false);

  const handleClick = useCallback(() => {
    if (!connecting && !disconnecting) {
      onConnect();
    } else if (connecting && !disconnecting) {
      if (onCancel) {
        onCancel();
      }
    }
  }, [connecting, disconnecting, onCancel, onConnect]);

  return (
    <Button
      variant="primary"
      type="button"
      className={cx('connect-wallet-btn connect-wallet-common-button', {
        'connect-wallet-btn-connecting': connecting,
      })}
      onClick={handleClick}
      disabled={disconnecting}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {!(connecting && hover) && (
        <img className="btn-icon" src={walletImg} alt="Connect Wallet" />
      )}
      {connecting && hover && <MdOutlineStopCircle size={18} />}
      <span className="btn-label">
        {connecting ? (
          <Trans>Connecting...</Trans>
        ) : disconnecting ? (
          <Trans>Disconnecting...</Trans>
        ) : small ? (
          <Trans>Connect</Trans>
        ) : (
          <Trans>Connect Wallet</Trans>
        )}
      </span>
    </Button>
  );
}
