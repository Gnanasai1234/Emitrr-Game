const { v4: uuidv4 } = require('uuid');
const GameEngine = require('../engine/GameEngine');
const Bot = require('./Bot');
const Game = require('../models/Game');
const Player = require('../models/Player');

class GameServer {
  constructor() {
    this.gameEngine = new GameEngine();
    this.bot = new Bot('hard');
    this.activeGames = new Map(); // gameId -> game data
    this.waitingPlayers = new Map(); // username -> socket
    this.playerSockets = new Map(); // username -> socket
    this.gameTimeouts = new Map(); // gameId -> timeout
    this.botMatchTimeoutMs = parseInt(process.env.BOT_MATCH_TIMEOUT_MS || '10000', 10);
  }

  addPlayer(socket, username) {
    this.playerSockets.set(username, socket);
    
    // Check if there's a waiting player
    if (this.waitingPlayers.size > 0) {
      const [waitingUsername, waitingSocket] = this.waitingPlayers.entries().next().value;
      this.waitingPlayers.delete(waitingUsername);
      
      // Create a new game with two players
      this.createPlayerVsPlayerGame(waitingUsername, waitingSocket, username, socket);
    } else {
      // Add to waiting queue
      this.waitingPlayers.set(username, socket);

      // Set timeout for bot matchmaking (configurable, default immediate)
      const delay = Math.max(0, this.botMatchTimeoutMs);
      const timeout = setTimeout(() => {
        if (this.waitingPlayers.has(username)) {
          this.waitingPlayers.delete(username);
          this.createPlayerVsBotGame(username, socket);
        }
      }, delay);

      socket.timeout = timeout;
    }
  }

  async createPlayerVsPlayerGame(player1Username, player1Socket, player2Username, player2Socket) {
    const gameId = uuidv4();
    const gameState = {
      gameId,
      player1: player1Username,
      player2: player2Username,
      currentPlayer: 1,
      board: this.gameEngine.createEmptyBoard(),
      winner: null,
      gameOver: false,
      isDraw: false,
      moves: []
    };

    this.activeGames.set(gameId, gameState);
    
    // Store game reference in sockets
    player1Socket.gameId = gameId;
    player2Socket.gameId = gameId;

    // Notify both players
    player1Socket.emit('gameStarted', {
      gameId,
      opponent: player2Username,
      isPlayer1: true,
      currentPlayer: 1
    });

    player2Socket.emit('gameStarted', {
      gameId,
      opponent: player1Username,
      isPlayer1: false,
      currentPlayer: 1
    });

    // Save to database
    const newGame = new Game({
      gameId,
      player1Username,
      player2Username,
      gameState: this.gameEngine.getInitialGameState(),
      moves: []
    });
    await newGame.save();
  }

  async createPlayerVsBotGame(playerUsername, playerSocket) {
    const gameId = uuidv4();
    const gameState = {
      gameId,
      player1: playerUsername,
      player2: 'Bot',
      currentPlayer: 1,
      board: this.gameEngine.createEmptyBoard(),
      winner: null,
      gameOver: false,
      isDraw: false,
      moves: []
    };

    this.activeGames.set(gameId, gameState);
    playerSocket.gameId = gameId;

    playerSocket.emit('gameStarted', {
      gameId,
      opponent: 'Bot',
      isPlayer1: true,
      currentPlayer: 1
    });

    // Save to database
    const newGame = new Game({
      gameId,
      player1Username: playerUsername,
      player2Username: 'Bot',
      gameState: this.gameEngine.getInitialGameState(),
      moves: []
    });
    newGame.save();
  }

  async makeMove(socket, gameId, column) {
    console.log(`makeMove called: gameId=${gameId}, column=${column}`);
    const game = this.activeGames.get(gameId);
    if (!game) {
      console.log('Game not found:', gameId);
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    if (game.gameOver) {
      console.log('Game is already over');
      socket.emit('error', { message: 'Game is already over' });
      return;
    }

    const playerUsername = this.getPlayerUsername(socket);
    console.log('Player username:', playerUsername);
    if (!playerUsername) {
      socket.emit('error', { message: 'Player not found' });
      return;
    }

    // Check if it's the player's turn
    const isPlayer1 = game.player1 === playerUsername;
    const expectedPlayer = isPlayer1 ? 1 : 2;
    
    console.log(`isPlayer1: ${isPlayer1}, expectedPlayer: ${expectedPlayer}, currentPlayer: ${game.currentPlayer}`);
    
    if (game.currentPlayer !== expectedPlayer) {
      socket.emit('error', { message: 'Not your turn' });
      return;
    }

    // Make the move
    const move = this.gameEngine.makeMove(game.board, column, expectedPlayer);
    console.log('Move result:', move);
    
    if (!move.success) {
      socket.emit('error', { message: move.error });
      return;
    }

    // Update game state
    game.board = move.board;
    game.moves.push({ player: expectedPlayer, column, row: move.row });
    
    console.log('Updated board:', game.board);
    console.log('Checking win at position:', move.row, move.col);
    
    const status = this.gameEngine.getGameStatus(move.board, move.row, move.col, expectedPlayer);
    console.log('Game status:', status);
    game.gameOver = status.gameOver;
    game.winner = status.winner;
    game.isDraw = status.isDraw;

    if (game.gameOver) {
      this.endGame(gameId, status);
    } else {
      game.currentPlayer = game.currentPlayer === 1 ? 2 : 1;
    }

    // Update database
    await Game.findOneAndUpdate(
      { gameId },
      {
        gameState: {
          board: game.board,
          currentPlayer: game.currentPlayer,
          winner: game.winner,
          gameOver: game.gameOver,
          isDraw: game.isDraw
        },
        moves: game.moves
      }
    );

    // Emit move to both players
    this.emitToGamePlayers(gameId, 'moveMade', {
      board: game.board,
      column,
      row: move.row,
      player: expectedPlayer,
      currentPlayer: game.currentPlayer,
      gameOver: game.gameOver,
      winner: game.winner,
      isDraw: game.isDraw
    });

    // If playing against bot and game isn't over, make bot move immediately
    if (!game.gameOver && game.player2 === 'Bot' && game.currentPlayer === 2) {
      await this.makeBotMove(gameId);
    }
  }

  async makeBotMove(gameId) {
    const game = this.activeGames.get(gameId);
    if (!game || game.gameOver) return;

    const botMove = this.bot.getMove(game.board, 2);
    if (botMove !== null) {
      const move = this.gameEngine.makeMove(game.board, botMove, 2);
      
      if (move.success) {
        game.board = move.board;
        game.moves.push({ player: 2, column: botMove, row: move.row });
        
        const status = this.gameEngine.getGameStatus(move.board, move.row, botMove, 2);
        game.gameOver = status.gameOver;
        game.winner = status.winner;
        game.isDraw = status.isDraw;

        if (game.gameOver) {
          this.endGame(gameId, status);
        } else {
          game.currentPlayer = 1;
        }

        // Update database
        await Game.findOneAndUpdate(
          { gameId },
          {
            gameState: {
              board: game.board,
              currentPlayer: game.currentPlayer,
              winner: game.winner,
              gameOver: game.gameOver,
              isDraw: game.isDraw
            },
            moves: game.moves
          }
        );

        // Emit bot move
        this.emitToGamePlayers(gameId, 'moveMade', {
          board: game.board,
          column: botMove,
          row: move.row,
          player: 2,
          currentPlayer: game.currentPlayer,
          gameOver: game.gameOver,
          winner: game.winner,
          isDraw: game.isDraw
        });
      }
    }
  }

  async endGame(gameId, status) {
    const game = this.activeGames.get(gameId);
    if (!game) return;

    try {
      // Update player stats
      if (status.winner === 1) {
        await this.updatePlayerStats(game.player1, 'win');
        if (game.player2 !== 'Bot') {
          await this.updatePlayerStats(game.player2, 'loss');
        }
      } else if (status.winner === 2) {
        if (game.player2 !== 'Bot') {
          await this.updatePlayerStats(game.player2, 'win');
        }
        await this.updatePlayerStats(game.player1, 'loss');
      } else if (status.isDraw) {
        await this.updatePlayerStats(game.player1, 'draw');
        if (game.player2 !== 'Bot') {
          await this.updatePlayerStats(game.player2, 'draw');
        }
      }

      // Update database
      const winner = status.winner === 1 ? game.player1 : 
                    status.winner === 2 ? game.player2 : null;
      
      await Game.findOneAndUpdate(
        { gameId },
        { 
          status: 'completed',
          winner: winner
        }
      );

      // Clean up
      this.activeGames.delete(gameId);
      this.clearGameTimeout(gameId);
    } catch (error) {
      console.error('Error ending game:', error);
    }
  }

  async updatePlayerStats(username, result) {
    try {
      console.log(`Updating player stats: ${username} - ${result}`);
      const player = await Player.findOne({ username });
      if (!player) {
        // Create new player with initial stats
        const newPlayer = new Player({ 
          username,
          wins: result === 'win' ? 1 : 0,
          losses: result === 'loss' ? 1 : 0,
          draws: result === 'draw' ? 1 : 0
        });
        await newPlayer.save();
        console.log(`Created new player ${username} with ${result}:`, newPlayer);
      } else {
        // Update existing player stats
        const fieldName = result + 's'; // 'wins', 'losses', or 'draws'
        const oldValue = player[fieldName] || 0;
        player[fieldName] = oldValue + 1;
        await player.save();
        console.log(`Updated player ${username} ${fieldName}: ${oldValue} -> ${player[fieldName]}`);
      }
    } catch (error) {
      console.error('Error updating player stats:', error);
    }
  }

  handleDisconnect(socket) {
    const username = this.getPlayerUsername(socket);
    if (!username) return;

    // Remove from waiting queue if present
    if (this.waitingPlayers.has(username)) {
      clearTimeout(socket.timeout);
      this.waitingPlayers.delete(username);
    }

    // Handle game disconnection
    const gameId = socket.gameId;
    if (gameId && this.activeGames.has(gameId)) {
      const game = this.activeGames.get(gameId);
      
      // Set timeout for reconnection
      const timeout = setTimeout(async () => {
        if (this.activeGames.has(gameId)) {
          // Forfeit the game
          const game = this.activeGames.get(gameId);
          const opponent = game.player1 === username ? game.player2 : game.player1;
          
          if (opponent !== 'Bot') {
            await this.updatePlayerStats(opponent, 'win');
            await this.updatePlayerStats(username, 'loss');
          }
          
          // Determine numeric winner for client-side consistency
          const winnerNumber = opponent === game.player1 ? 1 : 2;
          this.emitToGamePlayers(gameId, 'playerDisconnected', {
            disconnectedPlayer: username,
            winner: winnerNumber,
            winnerName: opponent
          });
          
          this.activeGames.delete(gameId);
        }
      }, 30000); // 30 seconds

      this.gameTimeouts.set(gameId, timeout);
    }

    this.playerSockets.delete(username);
  }

  handleReconnect(socket, username) {
    this.playerSockets.set(username, socket);

    // Try to locate the user's active game by scanning activeGames
    let foundGameId = null;
    for (const [gid, game] of this.activeGames.entries()) {
      if (game.player1 === username || game.player2 === username) {
        foundGameId = gid;
        break;
      }
    }

    if (foundGameId) {
      // Attach gameId to socket
      socket.gameId = foundGameId;

      // Clear disconnection timeout if any
      const timeout = this.gameTimeouts.get(foundGameId);
      if (timeout) {
        clearTimeout(timeout);
        this.gameTimeouts.delete(foundGameId);
      }

      const game = this.activeGames.get(foundGameId);
      socket.emit('gameReconnected', {
        gameId: foundGameId,
        board: game.board,
        currentPlayer: game.currentPlayer,
        player1: game.player1,
        player2: game.player2
      });
    }
  }

  getPlayerUsername(socket) {
    for (const [username, sock] of this.playerSockets.entries()) {
      if (sock === socket) return username;
    }
    return null;
  }

  emitToGamePlayers(gameId, event, data) {
    const game = this.activeGames.get(gameId);
    if (!game) return;

    const player1Socket = this.playerSockets.get(game.player1);
    const player2Socket = this.playerSockets.get(game.player2);

    if (player1Socket) player1Socket.emit(event, data);
    if (player2Socket && game.player2 !== 'Bot') player2Socket.emit(event, data);
  }

  clearGameTimeout(gameId) {
    const timeout = this.gameTimeouts.get(gameId);
    if (timeout) {
      clearTimeout(timeout);
      this.gameTimeouts.delete(gameId);
    }
  }

  async getLeaderboard() {
    try {
      const players = await Player.find({
        $expr: { $gt: [{ $add: ['$wins', '$losses', '$draws'] }, 0] }
      })
      .select('username wins losses draws')
      .lean();

      return players.map(player => {
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
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      return [];
    }
  }
}

module.exports = GameServer;
