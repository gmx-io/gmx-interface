export const RewardProgram = ({ title, description, data, type }) => {
  const renderTable = () => {
    if (type === "first-mover") {
      return (
        <>
          <div className="reward-table">
            <div className="reward-table-header">
              <div>TLP Value in USD</div>
              <div>Bonus</div>
            </div>
            {[
              ["First 100k", "30%"],
              ["100k-300k", "25%"],
              ["300k-600k", "20%"],
              ["600k-1M", "15%"],
              ["1M-2M", "10%"],
              ["4M-8M", "5%"],
              ["8M-16M", "3%"],
              ["16M-32M", "1%"],
            ].map(([range, bonus], i) => (
              <div key={i} className="reward-table-row">
                <div>{range}</div>
                <div>{bonus}</div>
              </div>
            ))}
          </div>
          <br />
          <div className="reward-table">
            <div className="reward-info">Leaders will be listed here.</div>
          </div>
        </>
      );
    }
    if (type === "size-bonus") {
      return (
        <>
          <div className="reward-table">
            <div className="reward-table-header">
              <div>Position</div>
              <div>Bonus</div>
            </div>
            {Array.from({ length: 20 }, (_, i) => (
              <div key={i} className="reward-table-row">
                <div>#{i + 1} Staker</div>
                <div>{20 - i}%</div>
              </div>
            ))}
          </div>
          <br />
          <div className="reward-table">
            <div className="reward-info">Leaders will be listed here.</div>
          </div>
        </>
      );
    }
    if (type === "referral") {
      return (
        <>
          <div className="reward-table">
            <div className="reward-info">
              20% of fees split proportionally among referrers based on referred TLP amount
            </div>
          </div>
          <br />
          <div className="reward-table">
            <div className="reward-info">Leaders will be listed here.</div>
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

const TokenCard = ({ icon, title, description, stats, buttons, comingSoon }) => (
  <div className={`token-card ${comingSoon ? "coming-soon" : ""}`}>
    <div>
      <div className="token-header">
        <img src={icon} alt={title} className="token-icon" />
        <span className="token-title">{title}</span>
      </div>
      <p className="token-description">{description}</p>
    </div>
    <div>
      {stats && (
        <div className="token-stats">
          {stats.map((stat, index) => (
            <div key={index} className="stat-item">
              {stat}
            </div>
          ))}
        </div>
      )}
      <div className="token-buttons">
        {buttons.map((button, index) => (
          <button
            key={index}
            className={`token-button ${button.disabled ? "disabled" : ""} ${index === 1 ? "secondary" : ""}`}
            disabled={button.disabled}
            onClick={button.onClick}
          >
            {button.label}
          </button>
        ))}
      </div>
    </div>
  </div>
);
