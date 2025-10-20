import React from 'react';

const GameBoard = ({ gameState, username, onMakeMove, onReset }) => {
  if (!gameState) return null;

  const { board, currentPlayer, gameOver, winner, isDraw, opponent, isPlayer1 } = gameState;
  const isMyTurn = (isPlayer1 && currentPlayer === 1) || (!isPlayer1 && currentPlayer === 2);

  console.log('GameBoard debug:', {
    username,
    opponent,
    isPlayer1,
    currentPlayer,
    isMyTurn,
    gameState
  });

  const handleColumnClick = (column) => {
    console.log('Column clicked:', column);
    console.log('gameOver:', gameOver);
    console.log('isMyTurn:', isMyTurn);
    console.log('currentPlayer:', currentPlayer);
    console.log('isPlayer1:', isPlayer1);
    
    if (!gameOver && isMyTurn) {
      console.log('Calling onMakeMove');
      onMakeMove(column);
    } else {
      console.log('Cannot make move - gameOver or not my turn');
    }
  };

  const displayOpponent = opponent && opponent !== username ? opponent : 'Opponent';

  const getGameStatus = () => {
    console.log('getGameStatus called:', {
      gameOver,
      isDraw,
      winner,
      isPlayer1,
      isMyTurn,
      opponent,
      displayOpponent
    });
    
    if (gameOver) {
      if (isDraw) return "It's a draw!";
      if (winner === (isPlayer1 ? 1 : 2)) return "You won!";
      return "You lost!";
    }
    if (isMyTurn) return "Your turn";
    const status = `${displayOpponent}'s turn`;
    console.log('Returning status:', status);
    return status;
  };

  const getDiscColor = (player) => {
    if (player === 1) return 'red';
    if (player === 2) return 'yellow';
    return 'empty';
  };

  return (
    <div className="game-board-container">
      <div className="game-info">
        <h2>Playing against: {displayOpponent}</h2>
        <div className="game-status">{getGameStatus()}</div>
        {gameOver && (
          <button onClick={onReset} className="reset-button">
            Play Again
          </button>
        )}
      </div>

      <div className="game-board">
        <div className="board-grid">
          {board.map((row, rowIndex) => (
            <div key={rowIndex} className="board-row">
              {row.map((cell, colIndex) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={`board-cell ${getDiscColor(cell)}`}
                >
                  {cell && <div className={`disc disc-${getDiscColor(cell)}`}></div>}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="column-buttons">
          {Array(7).fill(null).map((_, colIndex) => (
            <button
              key={colIndex}
              className={`column-button ${!gameOver && isMyTurn ? 'clickable' : 'disabled'}`}
              onClick={() => handleColumnClick(colIndex)}
              disabled={gameOver || !isMyTurn}
            >
              {colIndex + 1}
            </button>
          ))}
        </div>
      </div>

      <div className="game-rules">
        <h3>How to Play:</h3>
        <ul>
          <li>Drop your disc by clicking a column number</li>
          <li>Connect 4 discs in a row to win</li>
          <li>Can be horizontal, vertical, or diagonal</li>
        </ul>
      </div>
    </div>
  );
};

export default GameBoard;
