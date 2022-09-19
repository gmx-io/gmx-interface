import SEO from "../../components/Common/SEO";
import { getChainIcon, getPageTitle, useChainId } from "../../lib/legacy";
import "./Leaderboard.css";
import Tab from "../../components/Tab/Tab";
import { IndividualLeaderboard } from "../../components/Leaderboard/IndividualLeaderboard";
import { useLocalStorage } from "react-use";
import { getCurrentCompetitionIndex, LEADERBOARD_SELECTED_TAB_KEY } from "../../domain/leaderboard/constants";
import { useCompetition } from "../../domain/leaderboard/graph";
import Loader from "../../components/Common/Loader";
import { TeamLeaderboard } from "../../components/Leaderboard/TeamLeaderboard";

export default function Leaderboard() {
  const { chainId } = useChainId()
  const { exists: competitionExists, loading } = useCompetition(chainId, getCurrentCompetitionIndex(chainId))

  const tabOptions = ["Individuals"]
  const [activeTab, setActiveTab] = useLocalStorage(LEADERBOARD_SELECTED_TAB_KEY, tabOptions[0]);

  if (!loading && competitionExists) {
    tabOptions.push("Teams")
  } else if (!loading && !competitionExists && activeTab !== tabOptions[0]) {
    setActiveTab(tabOptions[0])
  }

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
        {loading && <Loader/>}
        {!loading && (
          <>
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
            {activeTab === tabOptions[1] && <TeamLeaderboard competitionIndex={getCurrentCompetitionIndex(chainId)}/>}
          </>
        )}
      </div>
    </SEO>
  );
}
