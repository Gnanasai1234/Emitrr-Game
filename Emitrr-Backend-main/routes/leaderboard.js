const express = require('express');
const router = express.Router();
const Player = require('../models/Player');

// Get leaderboard with pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const totalPlayers = await Player.countDocuments({
      $expr: { $gt: [{ $add: ['$wins', '$losses', '$draws'] }, 0] }
    });

    const players = await Player.find({
      $expr: { $gt: [{ $add: ['$wins', '$losses', '$draws'] }, 0] }
    })
    .select('username wins losses draws')
    .lean();

    const leaderboard = players.map(player => {
      const totalGames = player.wins + player.losses + player.draws;
      const winPercentage = totalGames > 0 ? 
        Math.round((player.wins / totalGames) * 100 * 100) / 100 : 0;
      
      return {
        username: player.username,
        wins: player.wins,
        losses: player.losses,
        draws: player.draws,
        total_games: totalGames,
        win_percentage: winPercentage
      };
    })
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.win_percentage - a.win_percentage;
    });

    // Apply pagination
    const paginatedLeaderboard = leaderboard.slice(skip, skip + limit);
    const totalPages = Math.ceil(leaderboard.length / limit);

    console.log('Leaderboard pagination debug:', {
      page,
      limit,
      skip,
      totalPlayers,
      leaderboardLength: leaderboard.length,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      paginatedLength: paginatedLeaderboard.length
    });

    res.json({ 
      success: true, 
      leaderboard: paginatedLeaderboard,
      pagination: {
        currentPage: page,
        totalPages,
        totalPlayers,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({ success: false, error: 'Failed to get leaderboard' });
  }
});

module.exports = router;