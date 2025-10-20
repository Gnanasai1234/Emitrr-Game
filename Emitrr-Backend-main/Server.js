const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initDB } = require('./db/db');
const GameServer = require('./utils/GameServer');
const leaderboardRoutes = require('./routes/leaderboard');
const Player = require('./models/Player');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;
const gameServer = new GameServer();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/leaderboard', leaderboardRoutes);

// Serve static files from frontend build
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('joinGame', async (data) => {
    try {
      const { username } = data;
      
      if (!username || username.trim() === '') {
        socket.emit('error', { message: 'Username is required' });
        return;
      }

      // Create player in database if doesn't exist
      try {
        await Player.findOneAndUpdate(
          { username: username.trim() },
          { username: username.trim() },
          { upsert: true, new: true }
        );
      } catch (error) {
        console.error('Error creating/finding player:', error);
      }
      
      gameServer.addPlayer(socket, username.trim());
    } catch (error) {
      console.error('Error joining game:', error);
      socket.emit('error', { message: 'Failed to join game' });
    }
  });

  socket.on('makeMove', async (data) => {
    try {
      const { gameId, column } = data;
      
      if (typeof column !== 'number' || column < 0 || column > 6) {
        socket.emit('error', { message: 'Invalid column' });
        return;
      }

      await gameServer.makeMove(socket, gameId, column);
    } catch (error) {
      console.error('Error making move:', error);
      socket.emit('error', { message: 'Failed to make move' });
    }
  });

  socket.on('reconnect', (data) => {
    try {
      const { username } = data;
      gameServer.handleReconnect(socket, username);
    } catch (error) {
      console.error('Error reconnecting:', error);
      socket.emit('error', { message: 'Failed to reconnect' });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    gameServer.handleDisconnect(socket);
  });
});

// Catch all handler for React Router
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// Initialize database and start server
const startServer = async () => {
  try {
    await initDB();
    console.log('Database initialized');
    
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:3000"}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
