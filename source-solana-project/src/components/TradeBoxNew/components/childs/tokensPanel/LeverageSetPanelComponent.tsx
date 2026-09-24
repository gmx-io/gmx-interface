import lockGrey from '../../../assets/lockGrey.png';
import lockLight from '../../../assets/lockLight.png';
import unlockGrey from '../../../assets/unlockGrey.png';
import unlockLight from '../../../assets/unlockLight.png';
import notice from '../../../assets/notice.png';
import { t } from '@lingui/macro';

interface LeverageSetPanelComponentProps {
  selectedOption: 'disable' | 'enable';
  onOptionSelect: (option: 'disable' | 'enable') => void;
}

function LeverageSetPanelComponent({
  selectedOption,
  onOptionSelect
}: LeverageSetPanelComponentProps) {
  const handleOptionSelect = (option: 'disable' | 'enable') => {
    onOptionSelect(option);
  };

  return (
    <>
      <div
        className={`leverage-option ${selectedOption === 'disable' ? 'selected' : ''}`}
        onClick={() => handleOptionSelect('disable')}
      >
        <div className="option-icon lock-icon">
          {selectedOption === 'disable' ? (
            <img src={lockLight} alt="lock" />
          ) : (
            <img src={lockGrey} alt="lock" />
          )}
        </div>
        <div className="option-content">
          <div className="option-title">{t`Disable Max Leverage`}</div>
          <div className="option-description">
            {t`Leverage is limited to 50% of the maximum to reduce risk.`}
          </div>
        </div>
        <div className="option-status">{t`Default`}</div>
      </div>

      <div
        className={`leverage-option ${selectedOption === 'enable' ? 'selected' : ''}`}
        onClick={() => handleOptionSelect('enable')}
      >
        <div className="option-icon unlock-icon">
          {selectedOption === 'enable' ? (
            <img src={unlockLight} alt="lock" />
          ) : (
            <img src={unlockGrey} alt="lock" />
          )}
        </div>
        <div className="option-content">
          <div className="option-title">{t`Enable Max Leverage`}</div>
          <div className="option-description">
            {t`This allows you to use the full maximum leverage. The setting applies to all markets.`}
          </div>
        </div>
      </div>

      <div className="warning-section">
        <div className="warning-icon">
          <img src={notice} alt="notice" />
        </div>
        <div className="warning-text">
          {t`Warning: Higher leverage significantly increases liquidation risk. Proceed with caution.`}
        </div>
      </div>
    </>
  );
}
export default LeverageSetPanelComponent;
