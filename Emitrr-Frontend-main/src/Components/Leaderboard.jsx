import React from 'react';

const Leaderboard = ({ leaderboard, pagination, currentPage, onPageChange }) => {
  console.log('Leaderboard component props:', {
    leaderboard,
    pagination,
    currentPage,
    onPageChange
  });

  if (!leaderboard || leaderboard.length === 0) {
    return (
      <div className="leaderboard">
        <h2>Leaderboard</h2>
        <p>No games played yet!</p>
      </div>
    );
  }

  const renderPaginationButtons = () => {
    if (!pagination || pagination.totalPages <= 1) return null;

    const buttons = [];
    const maxVisiblePages = 5;
    const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(pagination.totalPages, startPage + maxVisiblePages - 1);

    // Previous button
    buttons.push(
      <button
        key="prev"
        className={`pagination-btn ${!pagination.hasPrevPage ? 'disabled' : ''}`}
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!pagination.hasPrevPage}
      >
        ← Previous
      </button>
    );

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          className={`pagination-btn ${i === currentPage ? 'active' : ''}`}
          onClick={() => onPageChange(i)}
        >
          {i}
        </button>
      );
    }

    // Next button
    buttons.push(
      <button
        key="next"
        className={`pagination-btn ${!pagination.hasNextPage ? 'disabled' : ''}`}
        onClick={() => {
          console.log('Next button clicked');
          console.log('Current page:', currentPage);
          console.log('Has next page:', pagination.hasNextPage);
          console.log('Total pages:', pagination.totalPages);
          onPageChange(currentPage + 1);
        }}
        disabled={!pagination.hasNextPage}
      >
        Next →
      </button>
    );

    return buttons;
  };

  const getGlobalRank = (index) => {
    const limit = pagination?.limit || 10;
    const page = currentPage || 1;
    const rank = (page - 1) * limit + index + 1;
    console.log('Rank calculation:', {
      currentPage,
      page,
      limit,
      index,
      rank,
      pagination
    });
    return isNaN(rank) ? index + 1 : rank;
  };

  return (
    <div className="leaderboard">
      <h2>🏆 Leaderboard</h2>
      {pagination && (
        <div className="leaderboard-info">
          <p>Showing {leaderboard.length} of {pagination.totalPlayers} players</p>
        </div>
      )}
      <div className="leaderboard-table">
        <div className="leaderboard-header">
          <div>Rank</div>
          <div>Player</div>
          <div>Wins</div>
        </div>
        {leaderboard.map((player, index) => (
          <div key={player.username} className="leaderboard-row">
            <div className="rank">#{getGlobalRank(index)}</div>
            <div className="username">{player.username}</div>
            <div className="wins">{player.wins}</div>
          </div>
        ))}
      </div>
      {pagination && pagination.totalPages > 1 && (
        <div className="pagination">
          {renderPaginationButtons()}
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
