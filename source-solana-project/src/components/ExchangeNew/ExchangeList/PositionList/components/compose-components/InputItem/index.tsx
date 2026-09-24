import { NumberInput } from '@/components/Common/Input/NumberInput';
import { getGmw402Enabled } from '@/config/featureFlagEnable';
import { t } from '@lingui/macro'
import { getIconUrlPath } from '@/utils/lib/icon';
import './index.scss'
import { getNormalizedTokenSymbol } from '@/utils/token/getNormalizedTokenSymbol';
export default function InputItem({
    title,
    mark,
    value,
    unit,
    onChange,
    onBlur,
    showIcon = false,
    className,
    disabled = false,
    decimalPlaces,
}: {
    title: string,
    mark?: string,
    value?: string,
    unit?: string | JSX.Element,
    onBlur?: (value: string) => void,
    onChange?: (value: string) => void,
    disabled?: boolean,
    showIcon?: boolean,
    className?: string,
    decimalPlaces?: number,
}) {
    const gmw402Enabled = getGmw402Enabled();

    return (
        <div className={`compose-input-item ${className}`}>
            <div className="label">
                <span className='title'>
                    {t`${title}`}
                </span>
                {
                    mark && <>
                        <span className='mark'>
                            <span>
                                {t`Mark`}
                            </span>
                            <span>
                                ${t`${mark}`}
                            </span>
                        </span>
                    </>
                }
            </div>
            <div className="value">
                <NumberInput
                    value={value}
                    className="bg-transparent text-[1.6rem] outline-none w-full px-[0] py-[0.2rem] h-[2.8rem] placeholder-[#A3A3A3]"
                    onValueChange={(e) => {
                        onChange?.(e.target.value);
                    }}
                    onFocus={() => { }}
                    onBlur={(e) => {
                        onBlur?.(e.target.value);
                    }}
                    placeholder="0.00"
                    disabled={disabled}
                    decimalPlaces={gmw402Enabled ? decimalPlaces : undefined}
                />
                <span className='unit flex items-center gap-6'>
                    {showIcon && typeof unit === 'string' && getIconUrlPath(unit, 24) && (
                        <img
                            src={getIconUrlPath(unit === 'WGMX' ? 'GMX' : unit, 24)}
                            alt={`${unit} icon`}
                            className="w-20 h-20"
                        />
                    )}
                    {unit === 'WGMX' ? 'GMX' : unit}
                </span>
            </div>
        </div>
    )
}
