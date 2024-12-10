export const TokenCard = ({ icon, title, description, stats, buttons, comingSoon }) => (
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
