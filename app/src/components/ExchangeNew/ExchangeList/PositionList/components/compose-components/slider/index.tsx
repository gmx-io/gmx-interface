import { NumberInput } from '@/components/Common/Input/NumberInput';
import { getGmw390Enabled } from '@/config/featureFlagEnable';
import Slider from 'rc-slider';
import { t } from '@lingui/macro';
import './index.scss';

export default function SliderComponent({
  value,
  onInputChange,
  marks,
}: {
  value: number;
  onInputChange: (value: number) => void;
  marks?: Record<number, string>;
}) {
  const handleSliderChange = (percentage: number) => {
    onInputChange(percentage);
  };
  const handleMaxClick = () => {
    onInputChange(100);
  };

  const SLIDER_MARKS = {
    0: '0%',
    25: '',
    50: '50%',
    75: '',
    100: '100%',
  };
  return (
    <div className="compose-slider select-none">
      <Slider
        marks={marks || SLIDER_MARKS}
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={handleSliderChange}
      />
      <div className="compose-slider-input">
        <NumberInput
          value={value === 0 ? '' : value}
          className={`item-input ${getGmw390Enabled() ? 'h-[2.4rem]' : 'h-[2.8rem]'} w-full bg-transparent px-[0] py-[0.2rem] text-[1.6rem] placeholder-[#A3A3A3] outline-none`}
          onValueChange={(e) =>
            handleSliderChange(Math.min(Number(e.target.value), 100))
          }
          placeholder="0.0"
        />
        <span>%</span>
        <div
          className={`maxLev ${value === 100 ? 'selected' : ''}`}
          onClick={handleMaxClick}
          style={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            minWidth: '4rem',
            justifyContent: 'center',
          }}
        >
          {t`Max`}
        </div>
      </div>
    </div>
  );
}
