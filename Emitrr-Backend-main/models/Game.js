const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  gameId: {
    type: String,
    required: true,
    unique: true
  },
  player1Username: {
    type: String,
    required: true
  },
  player2Username: {
    type: String,
    default: null
  },
  winner: {
    type: String,
    default: null
  },
  gameState: {
    board: [[{ type: Number, default: null }]],
    currentPlayer: Number,
    winner: String,
    gameOver: Boolean,
    isDraw: Boolean
  },
  moves: [{
    player: Number,
    column: Number,
    row: Number
  }],
  status: {
    type: String,
    enum: ['active', 'completed'],
    default: 'active'
  }
}, {
  timestamps: true
});

const Game = mongoose.model('Game', gameSchema);

module.exports = Game;
