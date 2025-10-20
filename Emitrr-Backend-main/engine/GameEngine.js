class GameEngine {
  constructor() {
    this.ROWS = 6;
    this.COLS = 7;
    this.WIN_LENGTH = 4;
  }

  createEmptyBoard() {
    return Array(this.ROWS).fill(null).map(() => Array(this.COLS).fill(null));
  }

  isValidMove(board, col) {
    return col >= 0 && col < this.COLS && board[0][col] === null;
  }

  makeMove(board, col, player) {
    if (!this.isValidMove(board, col)) {
      return { success: false, error: 'Invalid move' };
    }

    const newBoard = board.map(row => [...row]);
    
    // Find the lowest available row in the column
    for (let row = this.ROWS - 1; row >= 0; row--) {
      if (newBoard[row][col] === null) {
        newBoard[row][col] = player;
        return { success: true, board: newBoard, row, col };
      }
    }

    return { success: false, error: 'Column is full' };
  }

  checkWinner(board, row, col, player) {
    const directions = [
      [0, 1],   // horizontal
      [1, 0],   // vertical
      [1, 1],   // diagonal \
      [1, -1]   // diagonal /
    ];

    for (const [dr, dc] of directions) {
      let count = 1; // Count the current piece

      // Check in positive direction
      let r = row + dr;
      let c = col + dc;
      while (r >= 0 && r < this.ROWS && c >= 0 && c < this.COLS && board[r][c] === player) {
        count++;
        r += dr;
        c += dc;
      }

      // Check in negative direction
      r = row - dr;
      c = col - dc;
      while (r >= 0 && r < this.ROWS && c >= 0 && c < this.COLS && board[r][c] === player) {
        count++;
        r -= dr;
        c -= dc;
      }

      if (count >= this.WIN_LENGTH) {
        console.log(`WIN DETECTED! Player ${player} has ${count} in a row`);
        return true;
      }
    }

    return false;
  }

  isBoardFull(board) {
    return board[0].every(cell => cell !== null);
  }

  evaluateBoard(board, player) {
    let score = 0;
    
    // Check all possible 4-piece sequences
    for (let row = 0; row < this.ROWS; row++) {
      for (let col = 0; col < this.COLS; col++) {
        // Horizontal
        if (col <= this.COLS - this.WIN_LENGTH) {
          score += this.evaluateSequence(board, row, col, 0, 1, player);
        }
        
        // Vertical
        if (row <= this.ROWS - this.WIN_LENGTH) {
          score += this.evaluateSequence(board, row, col, 1, 0, player);
        }
        
        // Diagonal \
        if (row <= this.ROWS - this.WIN_LENGTH && col <= this.COLS - this.WIN_LENGTH) {
          score += this.evaluateSequence(board, row, col, 1, 1, player);
        }
        
        // Diagonal /
        if (row <= this.ROWS - this.WIN_LENGTH && col >= this.WIN_LENGTH - 1) {
          score += this.evaluateSequence(board, row, col, 1, -1, player);
        }
      }
    }
    
    return score;
  }

  evaluateSequence(board, row, col, dr, dc, player) {
    let playerCount = 0;
    let opponentCount = 0;
    let emptyCount = 0;
    
    for (let i = 0; i < this.WIN_LENGTH; i++) {
      const r = row + i * dr;
      const c = col + i * dc;
      const cell = board[r][c];
      
      if (cell === player) {
        playerCount++;
      } else if (cell === (player === 1 ? 2 : 1)) {
        opponentCount++;
      } else {
        emptyCount++;
      }
    }
    
    // If opponent has pieces in this sequence, it's not useful
    if (opponentCount > 0) return 0;
    
    // Score based on how many of our pieces are in the sequence
    switch (playerCount) {
      case 4: return 100000; // Win
      case 3: return 1000;   // Very good
      case 2: return 100;    // Good
      case 1: return 10;     // Okay
      default: return 0;     // Empty sequence
    }
  }

  getGameStatus(board, lastRow, lastCol, player) {
    if (this.checkWinner(board, lastRow, lastCol, player)) {
      console.log(`Game over! Player ${player} wins!`);
      return { gameOver: true, winner: player, isDraw: false };
    }
    
    if (this.isBoardFull(board)) {
      console.log('Game over! It\'s a draw!');
      return { gameOver: true, winner: null, isDraw: true };
    }
    
    return { gameOver: false, winner: null, isDraw: false };
  }

  getAvailableMoves(board) {
    const moves = [];
    for (let col = 0; col < this.COLS; col++) {
      if (this.isValidMove(board, col)) {
        moves.push(col);
      }
    }
    return moves;
  }

  getInitialGameState() {
    return {
      board: Array(6).fill(null).map(() => Array(7).fill(null)),
      currentPlayer: 1,
      winner: null,
      gameOver: false,
      isDraw: false
    };
  }
}

module.exports = GameEngine;
