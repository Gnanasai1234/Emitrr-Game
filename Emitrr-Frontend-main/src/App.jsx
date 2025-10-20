import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import config from './config';
import GameBoard from './Components/GameBoard';
import Leaderboard from './Components/Leaderboard';
import './styles/App.css';

function App() {
  const [socket, setSocket] = useState(null);
  const [username, setUsername] = useState('');
  const [gameState, setGameState] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardPagination, setLeaderboardPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentView, setCurrentView] = useState('login'); // login, game, leaderboard
  const [error, setError] = useState('');
  const usernameRef = useRef('');

  useEffect(() => {
    const newSocket = io(config.SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('gameStarted', (data) => {
      setGameState({
        gameId: data.gameId,
        opponent: data.opponent,
        isPlayer1: data.isPlayer1,
        currentPlayer: data.currentPlayer,
        board: Array(6).fill(null).map(() => Array(7).fill(null)),
        gameOver: false,
        winner: null,
        isDraw: false
      });
      setCurrentView('game');
    });

    newSocket.on('moveMade', (data) => {
      setGameState(prev => ({
        ...prev,
        board: data.board,
        currentPlayer: data.currentPlayer,
        gameOver: data.gameOver,
        winner: data.winner,
        isDraw: data.isDraw
      }));
    });

    newSocket.on('playerDisconnected', (data) => {
      setGameState(prev => ({
        ...prev,
        gameOver: true,
        winner: data.winner,
        isDraw: false,
        opponent: prev?.opponent
      }));
    });

    newSocket.on('gameReconnected', (data) => {
      const calculatedOpponent = data.player1 === usernameRef.current ? data.player2 : data.player1;
      setGameState({
        gameId: data.gameId,
        opponent: calculatedOpponent,
        isPlayer1: data.player1 === usernameRef.current,
        currentPlayer: data.currentPlayer,
        board: data.board,
        gameOver: false,
        winner: null,
        isDraw: false
      });
      setCurrentView('game');
    });

    newSocket.on('error', (data) => {
      setError(data.message);
    });

    newSocket.on('connect', () => {
      if (usernameRef.current) {
        newSocket.emit('reconnect', { username: usernameRef.current });
      }
    });

    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    usernameRef.current = username;
  }, [username]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }
    const cleanUsername = username.trim();
    let fallbackTimer;
    const tryJoin = () => {
      socket.emit('joinGame', { username: cleanUsername });
      setError('');
      socket.off('gameReconnected');
    };

    const onReconnected = () => {
      clearTimeout(fallbackTimer);
      socket.off('gameReconnected', onReconnected);
    };

    socket.on('gameReconnected', onReconnected);
    socket.emit('reconnect', { username: cleanUsername });
    fallbackTimer = setTimeout(tryJoin, 800);
  };

  const handleMakeMove = (column) => {
    if (gameState && !gameState.gameOver && socket) {
      socket.emit('makeMove', {
        gameId: gameState.gameId,
        column
      });
    }
  };

  const loadLeaderboard = async (page = 1) => {
    try {
      const response = await fetch(`${config.API_BASE_URL}/api/leaderboard?page=${page}&limit=10`);
      const data = await response.json();
      if (data.success) {
        setLeaderboard(data.leaderboard);
        setLeaderboardPagination(data.pagination);
        setCurrentPage(page);
        setCurrentView('leaderboard');
      } else {
        console.error(data.error);
      }
    } catch (err) {
      console.error('Error loading leaderboard:', err);
    }
  };

  const handlePageChange = (newPage) => {
    if (leaderboardPagination && newPage >= 1 && newPage <= leaderboardPagination.totalPages) {
      loadLeaderboard(newPage);
    }
  };

  const resetGame = () => {
    setGameState(null);
    setCurrentView('login');
    setError('');
  };

  const renderContent = () => {
    switch (currentView) {
      case 'login':
        return (
          <div className="login-container">
            <h1>Connect Four</h1>
            <form onSubmit={handleLogin}>
              <input
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={20}
              />
              <button type="submit">Join Game</button>
            </form>
            {error && <div className="error">{error}</div>}
            <div className="menu-buttons">
              <button onClick={() => loadLeaderboard()}>View Leaderboard</button>
            </div>
          </div>
        );

      case 'game':
        return (
          <div className="game-container">
            <GameBoard
              gameState={gameState}
              username={username}
              onMakeMove={handleMakeMove}
              onReset={resetGame}
            />
          </div>
        );

      case 'leaderboard':
        return (
          <div className="leaderboard-container">
            <Leaderboard 
              leaderboard={leaderboard} 
              pagination={leaderboardPagination}
              currentPage={currentPage}
              onPageChange={handlePageChange}
            />
            <button onClick={() => setCurrentView('login')}>Back to Menu</button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="App">
      {renderContent()}
    </div>
  );
}

export default App;
