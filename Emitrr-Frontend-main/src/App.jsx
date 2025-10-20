import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import config from './config';
import GameBoard from './Components/GameBoard';
import Leaderboard from './Components/Leaderboard';
import PlayerStats from './Components/PlayerStats';
import './styles/App.css';

function App() {
  const [socket, setSocket] = useState(null);
  const [username, setUsername] = useState('');
  const [gameState, setGameState] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardPagination, setLeaderboardPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [playerStats, setPlayerStats] = useState(null);
  const [currentView, setCurrentView] = useState('login'); // login, game, leaderboard, stats
  const [error, setError] = useState('');
  const usernameRef = useRef('');

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(config.SOCKET_URL);
    setSocket(newSocket);

    // Socket event listeners
    newSocket.on('gameStarted', (data) => {
      console.log('gameStarted event received:', data);
      console.log('Current username:', usernameRef.current);
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
      console.log('moveMade event received:', data);
      setGameState(prev => {
        const newState = {
          ...prev,
          board: data.board,
          currentPlayer: data.currentPlayer,
          gameOver: data.gameOver,
          winner: data.winner,
          isDraw: data.isDraw
        };
        console.log('Updated game state:', newState);
        return newState;
      });
    });

    newSocket.on('playerDisconnected', (data) => {
      setGameState(prev => ({
        ...prev,
        gameOver: true,
        winner: data.winner, // numeric 1 or 2
        isDraw: false,
        opponent: prev?.opponent // Keep the existing opponent name
      }));
    });

    newSocket.on('gameReconnected', (data) => {
      console.log('gameReconnected event received:', data);
      console.log('Current username:', usernameRef.current);
      const calculatedOpponent = data.player1 === usernameRef.current ? data.player2 : data.player1;
      console.log('Calculated opponent:', calculatedOpponent);
      
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

    // Attempt automatic reconnect to game whenever socket connects and username is known
    newSocket.on('connect', () => {
      if (usernameRef.current) {
        newSocket.emit('reconnect', { username: usernameRef.current });
      }
    });

    return () => {
      newSocket.close();
    };
  }, []); // Remove username dependency

  // Keep usernameRef in sync with username state
  useEffect(() => {
    usernameRef.current = username;
  }, [username]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (username.trim()) {
      // Try reconnect first; if no active game is found, fall back to joining
      const cleanUsername = username.trim();
      let fallbackTimer;
      const tryJoin = () => {
        socket.emit('joinGame', { username: cleanUsername });
        setError('');
        socket.off('gameReconnected');
      };

      // Temporarily listen for a quick reconnect success to cancel fallback
      const onReconnected = () => {
        clearTimeout(fallbackTimer);
        socket.off('gameReconnected', onReconnected);
      };

      socket.on('gameReconnected', onReconnected);
      socket.emit('reconnect', { username: cleanUsername });

      // If no reconnection response soon, proceed to join a fresh game
      fallbackTimer = setTimeout(tryJoin, 800);
    } else {
      setError('Please enter a username');
    }
  };

  const handleMakeMove = (column) => {
    console.log('handleMakeMove called with column:', column);
    console.log('gameState:', gameState);
    console.log('socket:', socket);
    
    if (gameState && !gameState.gameOver && socket) {
      console.log('Emitting makeMove event');
      socket.emit('makeMove', {
        gameId: gameState.gameId,
        column: column
      });
    } else {
      console.log('Cannot make move - conditions not met');
    }
  };

  const loadLeaderboard = async (page = 1) => {
    try {
      console.log('Loading leaderboard for page:', page);
      const response = await fetch(`${config.API_BASE_URL}/api/leaderboard?page=${page}&limit=10`);
      const data = await response.json();
      console.log('Leaderboard API response:', data);
      if (data.success) {
        setLeaderboard(data.leaderboard);
        setLeaderboardPagination(data.pagination);
        setCurrentPage(page);
        setCurrentView('leaderboard');
        console.log('Leaderboard state updated:', {
          leaderboard: data.leaderboard,
          pagination: data.pagination,
          currentPage: page
        });
      } else {
        console.error('Leaderboard API returned error:', data.error);
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    }
  };

  const handlePageChange = (newPage) => {
    console.log('handlePageChange called with:', newPage);
    console.log('Current pagination:', leaderboardPagination);
    if (leaderboardPagination && newPage >= 1 && newPage <= leaderboardPagination.totalPages) {
      console.log('Loading leaderboard for page:', newPage);
      loadLeaderboard(newPage);
    } else {
      console.log('Page change rejected - invalid page or no pagination data');
    }
  };

  const loadPlayerStats = async () => {
    if (!username) return;
    
    try {
      const response = await fetch(`${config.API_BASE_URL}/api/leaderboard/player/${username}`);
      const data = await response.json();
      if (data.success) {
        setPlayerStats(data.player);
        setCurrentView('stats');
      }
    } catch (error) {
      console.error('Error loading player stats:', error);
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
              <button onClick={loadLeaderboard}>View Leaderboard</button>
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

      case 'stats':
        return (
          <div className="stats-container">
            <PlayerStats stats={playerStats} username={username} />
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
