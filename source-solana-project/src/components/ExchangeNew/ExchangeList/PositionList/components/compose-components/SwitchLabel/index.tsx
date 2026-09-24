import { t } from '@lingui/macro'
import ToggleSwitch from '@/components/Common/ToggleSwitch/ToggleSwitch';
import './index.scss'

export default function SwitchLabel({
    title,
    value,
    onChange
}: {
    title?: string;
    value?: boolean;
    onChange?: (v: boolean) => void;
}) {
    return (
        <div className="compose-keepLeverage">
            <span className='title'>{t`${title}`}</span>
            <ToggleSwitch
                isChecked={value}
                setIsChecked={(v) => onChange?.(v)}
            />
        </div>
    );
}