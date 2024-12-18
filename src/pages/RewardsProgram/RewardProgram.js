export const RewardProgram = ({ title, description, data, type }) => {
  const handleBuyTLP = () => {
    window.location.hash = "/buy_tlp";
  };

  const renderTable = () => {
    if (type === "first-mover") {
      return (
        <>
          <div className="reward-table">
            <div className="reward-table-header">
              <div>Tier</div>
              <div>Liquidity Range</div>
              <div>Share</div>
            </div>
            {[
              ["Tier 1", "First $250,000", "20%"],
              ["Tier 2", "Next $2,500,000", "20%"],
              ["Tier 3", "Next $8,500,000", "20%"],
              ["Tier 4", "Next $17,500,000", "20%"],
              ["Tier 5", "Up to $40M", "20%"],
            ].map(([tier, range, share], i) => (
              <div key={i} className="reward-table-row three-col">
                <div>{tier}</div>
                <div>{range}</div>
                <div>{share}</div>
              </div>
            ))}
          </div>
          <br />
          <div className="reward-table">
            <div className="reward-info">50,000 TMX tokens total allocation. $5,000 USD minimum deposit required.</div>
          </div>
          <div className="reward-program-actions">
            <button className="reward-action-button" onClick={handleBuyTLP}>
              Get More Rewards by Moving First
            </button>
          </div>
        </>
      );
    }
    if (type === "size-bonus") {
      return (
        <>
          <div className="reward-table">
            <div className="reward-info">Linear scale: 0.1 TMX per $1.00 supplied</div>
          </div>
          <br />
          <div className="reward-table">
            <div className="reward-info">Example: $100,000 invested = 10,000 TMX tokens earned</div>
          </div>
          <br />
          <div className="reward-table">
            <div className="reward-info">100,000 TMX total allocation. $50,000 USD minimum deposit required.</div>
          </div>
          <div className="reward-program-actions">
            <button className="reward-action-button" onClick={handleBuyTLP}>
              Become a Liquidity Provider
            </button>
          </div>
        </>
      );
    }
    if (type === "estmx-boost") {
      return (
        <>
          <div className="reward-table">
            <div className="reward-info">Stake esTMX tokens to boost your fee rewards</div>
          </div>
          <br />
          <div className="reward-table">
            <div className="reward-info">Controlled distribution rate for long-term stability</div>
          </div>
        </>
      );
    }
  };

  return (
    <div className="reward-program">
      <h3 className="reward-title">{title}</h3>
      <p className="reward-description">{description}</p>
      {renderTable()}
    </div>
  );
};
