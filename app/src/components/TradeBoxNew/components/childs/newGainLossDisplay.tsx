import type { RefObject } from 'react';
import TooltipWithPortal from '@/components/Common/Tooltip/TooltipWithPortal';

type NewGainLossDisplayProps = {
  label: string;
  rawMoney?: string;
  rawRate?: string;
  displayMoney: string;
  displayRate: string;
  fullRate: string;
  needTooltip: boolean;
  gainInputRef: RefObject<HTMLDivElement>;
  prefixRef: RefObject<HTMLSpanElement>;
  measureRef: RefObject<HTMLSpanElement>;
};

export default function NewGainLossDisplay({
  label,
  rawMoney,
  rawRate,
  displayMoney,
  displayRate,
  fullRate,
  needTooltip,
  gainInputRef,
  prefixRef,
  measureRef,
}: NewGainLossDisplayProps) {
  const isEmpty = rawMoney === '$0.00' || !rawRate;
  const gainClass = isEmpty
    ? ''
    : rawMoney?.startsWith('-')
      ? 'redStyle'
      : 'greenStyle';

  const wrapper = (
    <div
      className={`gain-input-wrapper ${gainClass} compact-display`}
      style={isEmpty ? { color: '#A3A3A3' } : {}}
    >
      <span className="gain-display-text">
        {!isEmpty ? displayMoney : ''}
        {!isEmpty ? `(${displayRate})` : '-'}
      </span>
    </div>
  );

  return (
    <div ref={gainInputRef} className="gain-input">
      <span ref={prefixRef} className="input-prefix">{label}</span>
      {needTooltip ? (
        <TooltipWithPortal
          className="w-full"
          disableHandleStyle
          fitContentWidth
          tooltipClassName="!min-w-0 !w-auto !max-w-none !whitespace-nowrap"
          position="top-end"
          handle={wrapper}
          renderContent={() => (
            <div>{`${displayMoney}(${fullRate})`}</div>
          )}
        />
      ) : (
        wrapper
      )}
      <span
        ref={measureRef}
        style={{
          position: 'absolute',
          visibility: 'hidden',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          fontSize: '1.3rem',
        }}
      >
        {!isEmpty ? `${displayMoney}(${fullRate})` : '-'}
      </span>
    </div>
  );
}
