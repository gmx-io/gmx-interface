import SEO from "../../components/Common/SEO";
import { getChainIcon, getPageTitle, useChainId } from "../../lib/legacy";
import "./Leaderboard.css";
import Tab from "../../components/Tab/Tab";
import { IndividualLeaderboard } from "../../components/Leaderboard/IndividualLeaderboard";
import { TeamLeaderboard } from "../../components/Leaderboard/TeamLeaderboard";
import { useLocalStorage } from "react-use";
import { CURRENT_COMPETITION_INDEX, LEADERBOARD_SELECTED_TAB_KEY } from "../../domain/leaderboard/constants";

export default function Leaderboard() {
  const { chainId } = useChainId()

  const tabOptions = ["Individuals"]
  if (CURRENT_COMPETITION_INDEX !== null) {
    tabOptions.push("Teams")
  }
  const [activeTab, setActiveTab] = useLocalStorage(LEADERBOARD_SELECTED_TAB_KEY, tabOptions[0]);

  const handleTabChange = (option) => {
    setActiveTab(option)
  }

  return (
    <SEO title={getPageTitle("Leaderboard")}>
      <div className="default-container page-layout Leaderboard">
        <div className="section-title-block-wrapper">
          <div className="section-title-block">
            <div className="section-title-content">
              <div className="Page-title">
                Leaderboard <img alt="Chain Icon" src={getChainIcon(chainId)} />
              </div>
              <div className="Page-description">
                Get fee discounts and earn rebates through the GMX referral program. For more information, please read the
                referral program details.
              </div>
            </div>
          </div>
        </div>
        {tabOptions.length <= 1 || (
          <div className="Leaderboard-tabs-container">
            <Tab
              options={tabOptions}
              option={activeTab}
              onChange={handleTabChange}
              className="Leaderboard-tabs"
            />
          </div>
        )}
        {activeTab === tabOptions[0] && <IndividualLeaderboard/>}
        {activeTab === tabOptions[1] && <TeamLeaderboard competitionIndex={CURRENT_COMPETITION_INDEX}/>}
      </div>
    </SEO>
  );
}
