import { Fragment } from 'react';

const VIP_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

type VipLevelSelectorProps = {
  selected: number;
  onSelect: (level: number) => void;
};

function VipLevelSelector({ selected, onSelect }: VipLevelSelectorProps) {
  return (
    <div className="vip-level-selector-container" role="tablist" aria-label="VIP Level">
      <div className="vip-level-selector">
      {VIP_LEVELS.map((level, index) => (
        <Fragment key={level}>
          <button
            type="button"
            role="tab"
            aria-selected={selected === level}
            className={`vip-level-item${selected === level ? ' is-selected' : ''}`}
            onClick={() => onSelect(level)}
          >
            <span className="vip-level-label">VIP {level}</span>
            <span className="vip-level-tick" aria-hidden="true" />
          </button>
          {index < VIP_LEVELS.length - 1 && (
            <span className="vip-level-divider" aria-hidden="true" />
          )}
        </Fragment>
      ))}
      </div>
    </div>
  );
}

export default VipLevelSelector;
