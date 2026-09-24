import { t } from '@lingui/macro'
import { MdClose } from 'react-icons/md';
import './index.scss';
import closeIcons from '@/img/header/close.svg';

export default function MarketDecrease({ title = 'Market: Long SOL/USD Decrease', onClose = () => { } }: { title: string, onClose: () => void }) {
    return (
        <div className="compose-title">
            <h3>{t`${title}`}</h3>
            <button className="close-button" onClick={onClose}>
                <img src={closeIcons} alt="close" />
            </button>
        </div>
    );
}