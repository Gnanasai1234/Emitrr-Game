Frontend (React):

This is the React client for the Connect Four game, with real-time updates powered by Socket.IO.

Prerequisites

Make sure you have the following installed:

Node.js (v16 or higher)

npm (v8 or higher)

Environment Setup (Optional)

If you want to use custom backend URLs, create a .env file in this directory with the following:

REACT_APP_API_URL=http://localhost:3001
REACT_APP_SOCKET_URL=http://localhost:3001


By default, URLs are configured in src/config.js and the CRA proxy points to http://localhost:3001.

Install and Run

Install dependencies:

npm install


Start the development server:

npm start


The frontend will run at http://localhost:3000
.

Features

Username login and automatic matchmaking

Real-time board updates with turn indication

Bot fallback if no other players are available (server-configured delay)

Leaderboard and player stats views

Reconnect to an active game after refresh or disconnect

Build for Production

To create a production build:

npm run build


Serve the contents of the build/ folder using your preferred static host or behind a reverse proxy.
