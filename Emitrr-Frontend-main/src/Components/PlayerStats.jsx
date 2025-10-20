import React from 'react';

const PlayerStats = ({ stats, username }) => {
  if (!stats) {
    return (
      <div className="player-stats">
        <h2>Player Stats</h2>
        <p>No stats available for {username}</p>
      </div>
    );
  }

  return (
    <div className="player-stats">
      <h2>📊 {username}'s Stats</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.wins}</div>
          <div className="stat-label">Wins</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.losses}</div>
          <div className="stat-label">Losses</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.draws}</div>
          <div className="stat-label">Draws</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalGames}</div>
          <div className="stat-label">Total Games</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.winPercentage}%</div>
          <div className="stat-label">Win Rate</div>
        </div>
      </div>
      
      <div className="stats-summary">
        <h3>Summary</h3>
        <p>You've played <strong>{stats.totalGames}</strong> games total.</p>
        <p>Your win rate is <strong>{stats.winPercentage}%</strong>.</p>
        {stats.wins > 0 && (
          <p>🎉 Great job on your {stats.wins} win{stats.wins !== 1 ? 's' : ''}!</p>
        )}
      </div>
    </div>
  );
};

export default PlayerStats;
