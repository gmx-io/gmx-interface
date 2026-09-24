import closeIcons from '@/img/header/close.svg';
import { t } from '@lingui/macro';
import './Setting.scss';
import './LeverageSetPanelAdapter.scss';
import { useState, useEffect } from 'react';
import PercentageInput from '@/components/Common/Input/PercentageInput';
import Button from '@/components/Common/Button/Button';
import ToggleSwitch from '@/components/Common/ToggleSwitch/ToggleSwitch';
import { useAppStore } from '@/zustand/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import cx from 'classnames';
import { useRpcLatency } from '@/hooks/utilsHooks/useRpcLatency';
import { useBodyScrollLock } from '@/hooks/utilsHooks/useBodyScrollLock';
import {
  selectIsPnlInLeverage,
  selectSetIsPnlInLeverage,
  selectShowPnlAfterFees,
  selectSetShowPnlAfterFees,
  selectRpcEndpointType,
  selectSetRpcEndpointType,
  selectCustomRpcUrl,
  selectSetCustomRpcUrl,
} from '@/selectors/setting/baseSelectors';
import { checkRpcEndpoint } from '@/utils/rpc/checkRpcEndpoint';
import { validateRpcUrl } from '@/utils/validation/validateRpcUrl';
import { RpcEndpointType } from '@/zustand/slices/settingsSlice';

interface SettingProps {
  isOpen: boolean;
  onClose: () => void;
}

function Settings({ isOpen, onClose }: SettingProps) {
  if (!isOpen) return null;

  return <SettingsContent onClose={onClose} />;
}

function SettingsContent({ onClose }: { onClose: () => void }) {
  useBodyScrollLock(true);

  const handleModalClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const { slippage, setSlippage } = useAppStore(
    useShallow((state) => state.TradeboxNew)
  );
  const { latency } = useRpcLatency();
  const [localCustomRpcUrl, setLocalCustomRpcUrl] = useState('');
  const [localRpcEndpointType, setLocalRpcEndpointType] =
    useState<RpcEndpointType>('helius');
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const isPnlInLeverage = useAppStore(selectIsPnlInLeverage);
  const setIsPnlInLeverage = useAppStore(selectSetIsPnlInLeverage);
  const showPnlAfterFees = useAppStore(selectShowPnlAfterFees);
  const setShowPnlAfterFees = useAppStore(selectSetShowPnlAfterFees);
  const rpcEndpointType = useAppStore(selectRpcEndpointType);
  const setRpcEndpointType = useAppStore(selectSetRpcEndpointType);
  const customRpcUrl = useAppStore(selectCustomRpcUrl);
  const setCustomRpcUrl = useAppStore(selectSetCustomRpcUrl);
  const { shouldShowPositionLines, setShouldShowPositionLines } = useAppStore(
    (state) => state.settings
  );
  // const setShouldShowPositionLines = useAppStore(selectSetCustomRpcUrl);

  // const [showPositionsOnChart, setShowPositionsOnChart] = useState(shouldShowPositionLines);

  useEffect(() => {
    setLocalRpcEndpointType(rpcEndpointType);
    setLocalCustomRpcUrl(customRpcUrl);
  }, [rpcEndpointType, customRpcUrl]);

  const canSave =
    localRpcEndpointType === 'custom' &&
    localCustomRpcUrl.trim() !== '' &&
    !isSaving;

  const handleSaveCustomRpc = async () => {
    if (!canSave) {
      return;
    }

    const trimmedUrl = localCustomRpcUrl.trim();
    const validation = validateRpcUrl(trimmedUrl);
    if (!validation.valid) {
      setErrorMessage(validation.error ?? '');
      setHasError(true);
      return;
    }

    setIsSaving(true);
    try {
      const check = await checkRpcEndpoint(trimmedUrl);
      if (!check.ok) {
        setErrorMessage(check.error ?? '');
        setHasError(true);
        return;
      }

      setCustomRpcUrl(trimmedUrl);
      setRpcEndpointType('custom');
      setLocalRpcEndpointType('custom');
      setHasError(false);
      setErrorMessage('');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="setting-modal" onClick={handleModalClick}>
      <div className="setting-content">
        <div className="header">
          <div className="title">{t`Settings`}</div>
          <div className="close-btn" onClick={onClose}>
            <img src={closeIcons} alt="close" />
          </div>
        </div>
        <div className="setting-body">
          <div className="setting-group setting-group-with-slippage">
            <div className="setting-section">
              <div className="setting-row">
                <div className="setting-label">{t`Default Allowed Slippage`}</div>
                {/* <div className="setting-value"> */}
                <PercentageInput
                  className="settings-percentage-input"
                  negativeSign
                  defaultValue={100}
                  value={slippage}
                  onChange={(value) => {
                    setSlippage(value);
                    localStorage.setItem('slippage', value.toString());
                  }}
                  maxValue={500}
                  highValue={100}
                  lowValue={10}
                />
              </div>
            </div>
          </div>

          <div className="setting-group">
            {/* Show Positions on Chart */}
            <div className="setting-section">
              <div className="setting-row">
                <div className="setting-label">{t`Show Positions on Chart`}</div>
                <div className="setting-value">
                  <ToggleSwitch
                    isChecked={shouldShowPositionLines}
                    setIsChecked={() =>
                      // setShowPositionsOnChart(!showPositionsOnChart)
                      setShouldShowPositionLines(!shouldShowPositionLines)
                    }
                  />
                </div>
              </div>
            </div>

            {/* PnL in Leverage */}
            <div className="setting-section">
              <div className="setting-row">
                <div className="setting-label">{t`Include PnL in Leverage Display`}</div>
                <div className="setting-value">
                  <ToggleSwitch
                    isChecked={isPnlInLeverage}
                    setIsChecked={() => setIsPnlInLeverage(!isPnlInLeverage)}
                  />
                </div>
              </div>
            </div>

            {/* Display PnL After Fees */}
            <div className="setting-section">
              <div className="setting-row">
                <div className="setting-label">{t`Display PnL After Fees`}</div>
                <div className="setting-value">
                  <ToggleSwitch
                    isChecked={showPnlAfterFees}
                    setIsChecked={() => setShowPnlAfterFees(!showPnlAfterFees)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="setting-group">
            <div className="setting-section">
              <div className="setting-label setting-section-title">{t`RPC Endpoint`}</div>
              <div className="rpc-options">
                <div className="rpc-option">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="rpc"
                      value="helius"
                      checked={localRpcEndpointType === 'helius'}
                      onChange={() => {
                        setLocalRpcEndpointType('helius');
                        setRpcEndpointType('helius');
                      }}
                    />
                    <span className="radio-custom"></span>
                    <span>{t`Helius RPC`}</span>
                  </label>
                  <div className="ping-time">
                    <span
                      className={cx(
                        'mx-5 mt-2 h-[5px] w-[5px] rounded-full',
                        latency > 1000 ? 'bg-red-500' : 'bg-green-500'
                      )}
                    />
                    <span>{`${Math.round(latency)}ms`}</span>
                  </div>
                </div>
                <div className="rpc-option">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="rpc"
                      value="custom"
                      checked={localRpcEndpointType === 'custom'}
                      onChange={() => setLocalRpcEndpointType('custom')}
                    />
                    <span className="radio-custom"></span>
                    <span>{t`Custom RPC`}</span>
                  </label>
                </div>

                <div className={`custom-rpc-show bg-[#242424] rounded-[8px] ${hasError ? 'error' : ''}`}>
                  <input
                    name="custom-rpc-input"
                    type="text"
                    className="show"
                    value={localCustomRpcUrl}
                    onChange={(e) => {
                      setLocalCustomRpcUrl(e.target.value);
                      if (hasError) {
                        setHasError(false);
                        setErrorMessage('');
                      }
                    }}
                    placeholder={t`Start with http:// or https://`}
                  />
                  <Button
                    variant="ghost"
                    disabled={!canSave}
                    className={`save-btn ${canSave ? 'enabled hover:!bg-primary-300' : 'disabled hover:!bg-[#535353]'} !mb-[0.6rem] !mr-[0.8rem] !mt-[0.4rem] !rounded-[2rem] !bg-[#535353] !px-[0.8rem] !py-[0.2rem] !text-[1.2rem] !font-[500] !text-white`}
                    onClick={() => void handleSaveCustomRpc()}
                  >
                    {isSaving ? 'Saving...' : t`Save`}
                  </Button>
                </div>
                {hasError && errorMessage && (
                  <div className="error-message">{errorMessage}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default Settings;
