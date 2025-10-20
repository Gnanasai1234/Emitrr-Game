const GameEngine = require('../engine/GameEngine');

class Bot {
  constructor(difficulty = 'hard') {
    this.gameEngine = new GameEngine();
    this.difficulty = difficulty;
    this.maxDepth = difficulty === 'hard' ? 6 : 4;
  }

  getMove(board, player) {
    const availableMoves = this.gameEngine.getAvailableMoves(board);
    
    if (availableMoves.length === 0) {
      return null;
    }

    for (const col of availableMoves) {
      const move = this.gameEngine.makeMove(board, col, player);
      if (move.success) {
        const status = this.gameEngine.getGameStatus(move.board, move.row, move.col, player);
        if (status.gameOver && status.winner === player) {
          return col;
        }
      }
    }

    const opponent = player === 1 ? 2 : 1;
    for (const col of availableMoves) {
      const move = this.gameEngine.makeMove(board, col, opponent);
      if (move.success) {
        const status = this.gameEngine.getGameStatus(move.board, move.row, move.col, opponent);
        if (status.gameOver && status.winner === opponent) {
          return col;
        }
      }
    }

    return this.minimax(board, player, 0, -Infinity, Infinity).move;
  }

  minimax(board, player, depth, alpha, beta) {
    const isMaximizing = player === 2; // Bot is player 2
    const opponent = player === 1 ? 2 : 1;

    if (depth >= this.maxDepth) {
      return {
        score: this.gameEngine.evaluateBoard(board, 2) - this.gameEngine.evaluateBoard(board, 1),
        move: null
      };
    }

    const availableMoves = this.gameEngine.getAvailableMoves(board);
    
    if (availableMoves.length === 0) {
      return {
        score: this.gameEngine.evaluateBoard(board, 2) - this.gameEngine.evaluateBoard(board, 1),
        move: null
      };
    }

    let bestMove = availableMoves[0];
    let bestScore = isMaximizing ? -Infinity : Infinity;

    for (const col of availableMoves) {
      const move = this.gameEngine.makeMove(board, col, player);
      
      if (!move.success) continue;

      const status = this.gameEngine.getGameStatus(move.board, move.row, move.col, player);
      
      let score;
      if (status.gameOver) {
        if (status.winner === 2) {
          score = 100000 - depth; 
        } else if (status.winner === 1) {
          score = -100000 + depth; 
        } else {
          score = 0;
        }
      } else {
        const result = this.minimax(move.board, opponent, depth + 1, alpha, beta);
        score = result.score;
      }

      if (isMaximizing) {
        if (score > bestScore) {
          bestScore = score;
          bestMove = col;
        }
        alpha = Math.max(alpha, score);
        if (beta <= alpha) break; 
      } else {
        if (score < bestScore) {
          bestScore = score;
          bestMove = col;
        }
        beta = Math.min(beta, score);
        if (beta <= alpha) break; 
      }
    }

    return { score: bestScore, move: bestMove };
  }

  getEasyMove(board, player) {
    const availableMoves = this.gameEngine.getAvailableMoves(board);
    
    if (availableMoves.length === 0) return null;

    for (const col of availableMoves) {
      const move = this.gameEngine.makeMove(board, col, player);
      if (move.success) {
        const status = this.gameEngine.getGameStatus(move.board, move.row, move.col, player);
        if (status.gameOver && status.winner === player) {
          return col;
        }
      }
    }

    const opponent = player === 1 ? 2 : 1;
    for (const col of availableMoves) {
      const move = this.gameEngine.makeMove(board, col, opponent);
      if (move.success) {
        const status = this.gameEngine.getGameStatus(move.board, move.row, move.col, opponent);
        if (status.gameOver && status.winner === opponent) {
          return col;
        }
      }
    }

    const centerColumns = [3, 2, 4, 1, 5, 0, 6];
    for (const col of centerColumns) {
      if (availableMoves.includes(col)) {
        return col;
      }
    }

    return availableMoves[Math.floor(Math.random() * availableMoves.length)];
  }
}

module.exports = Bot;
