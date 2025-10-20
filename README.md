Connect Four

Backend (Node.js, Express, Socket.IO, MongoDB)

Prerequisites
- Node.js v16 or higher
- npm v8 or higher
- MongoDB (local or Atlas)

Environment Variables (.env)
MONGODB_URI=mongodb://localhost:27017/connect_four
PORT=3001
FRONTEND_URL=http://localhost:3000
BOT_MATCH_TIMEOUT_MS=10000

Installation
npm install

Running the Server
- Development (auto-restart on changes):
nodemon server.js

- Production:
npm start

The server will run at http://localhost:${PORT}.

API Endpoints
- GET /api/leaderboard — Returns top players with wins, losses, draws, and win percentage.

Socket.IO Events

From Client to Server
- joinGame — Join matchmaking: { username }
- makeMove — Make a move in an active game: { gameId, column }
- reconnect — Reconnect to a game: { username }

From Server to Client
- gameStarted — Game begins: { gameId, opponent, isPlayer1, currentPlayer }
- moveMade — Update board: { board, column, row, player, currentPlayer, gameOver, winner, isDraw }
- playerDisconnected — Player disconnected: { disconnectedPlayer, winner, winnerName }
- gameReconnected — Reconnected successfully: { gameId, board, currentPlayer, player1, player2 }

Features
- Automatic reconnection within 30 seconds
- Bot opponent if no human player is found
- Leaderboard stored in MongoDB

Frontend (React)

Prerequisites
- Node.js v16 or higher
- npm v8 or higher

Environment Variables (.env)
REACT_APP_API_URL=http://localhost:3001
REACT_APP_SOCKET_URL=http://localhost:3001

Install & Run
npm install
npm start

Runs at http://localhost:3000.

Features
- Username login with automatic matchmaking
- Real-time board updates with current turn indicator
- Bot fallback for unmatched players
- Leaderboard view
- Reconnect to an active game after refresh/disconnect

Build for Production
npm run build
Serve the build/ folder on your preferred static host.
