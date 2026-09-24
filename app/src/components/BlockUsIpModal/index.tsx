import { Trans } from '@lingui/macro'
import { isRestrictedArea } from '../Pools/utils/getApyData'
import './index.scss'

export const BlockUsIpModal: React.FC = () => {
    const isUs = isRestrictedArea();

    if (!isUs) return null;

    return (
        <div className="block-us-ip-modal-overlay">
            <div className="block-us-ip-modal-container">
                <div className="block-us-ip-modal-content">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <span className="block-us-ip-modal-title">
                                <Trans>
                                    This website is not available in your current jurisdiction. Please refer to our <a href="https://docs.gmtrade.xyz/legal/user_terms" target="_blank" rel="noopener noreferrer">User Terms</a> for more information.
                                </Trans>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};