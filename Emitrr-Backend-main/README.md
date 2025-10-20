Backend

A real-time Connect Four server built with Express, Socket.IO, and MongoDB. Supports matchmaking, bot opponents, reconnections, and leaderboard tracking.

Prerequisites

Make sure you have:

Node.js v16 or higher

npm v8 or higher

MongoDB (local or Atlas)

Environment Setup

Create a .env file in the project root with the following content:

MONGODB_URI=mongodb://localhost:27017/connect_four
PORT=3001
FRONTEND_URL=http://localhost:3000
BOT_MATCH_TIMEOUT_MS=10000  # Bot delay in ms, set 0 for instant moves

Installation & Running

Install dependencies:

npm install


Run the server:

Development mode (auto-restart on changes):

npm run dev


Production mode:

npm start


The server will run at http://localhost:${PORT}.

API Endpoints

GET /api/leaderboard – Returns top players with wins, losses, draws, and win percentage.

GET /api/leaderboard/player/:username – Returns stats for a specific player (used internally for gameplay).

Socket.IO Events
From Client to Server:

joinGame – Join a new game or enter matchmaking. Send { username }.

makeMove – Make a move in an active game. Send { gameId, column }.

reconnect – Reconnect to a game. Send { username }.

From Server to Client:

gameStarted – Sent when a game begins. Contains { gameId, opponent, isPlayer1, currentPlayer }.

moveMade – Updates the board after a move. Contains { board, column, row, player, currentPlayer, gameOver, winner, isDraw }.

playerDisconnected – Sent when a player disconnects. Contains { disconnectedPlayer, winner, winnerName }.

gameReconnected – Sent when a player successfully reconnects. Contains { gameId, board, currentPlayer, player1, player2 }.

Features

Reconnection: Players have 30 seconds to reconnect before forfeiting.

Bot Opponent: Plays as Player 2 using minimax AI and responds automatically.

Leaderboard: Stores game results in MongoDB to track player stats.

Scripts

npm start – Start the server in production.

npm run dev – Start the server in development with auto-restart.

Troubleshooting

MongoDB connection errors: Check that MONGODB_URI is correct and MongoDB is running.

CORS/socket issues: Make sure FRONTEND_URL matches your frontend URL.

Bot timing issues: Adjust BOT_MATCH_TIMEOUT_MS in .env.