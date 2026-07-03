import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupRoomHandlers } from './socket/roomHandler.js';
import { setupChatHandlers } from './socket/chatHandler.js';
import { getMovies, getMovieDetails } from './services/tmdb.js';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/userRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import aiMatchmakerRoutes from './routes/aiMatchmaker.js';

import helmet from 'helmet';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';

connectDB();

const app = express();
app.set('trust proxy', 1); // Trust first proxy for secure cookies
const server = http.createServer(app);

app.use(helmet({ 
  contentSecurityPolicy: { 
    directives: { 
      frameAncestors: ["'self'"], 
      frameSrc: ["'self'", "https://www.youtube.com"] 
    } 
  } 
}));

const corsOriginFn = (origin, callback) => {
  if (!origin) return callback(null, true);
  
  const allowedOrigins = [
    process.env.CLIENT_URL,
    process.env.LOCAL_CLIENT_URL,
    'http://localhost:5173'
  ].filter(Boolean).map(url => url.replace(/\/$/, '')); // Strip trailing slashes

  if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
    callback(null, true);
  } else {
    callback(new Error('Not allowed by CORS'));
  }
};

const corsOptions = {
  origin: corsOriginFn,
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

const io = new Server(server, {
  cors: {
    origin: corsOriginFn,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Use cookie parser for sockets
io.engine.use(cookieParser());

// Socket JWT authentication
io.use((socket, next) => {
  const cookies = socket.request.cookies;
  const token = cookies ? cookies.token : null;
  
  if (!token) return next(new Error('Authentication error'));

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error('Authentication error'));
    socket.user = decoded;
    next();
  });
});

const rooms = new Map();

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  setupRoomHandlers(io, socket, rooms);
  setupChatHandlers(io, socket);

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});


// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/ai-matchmaker', aiMatchmakerRoutes);

app.get('/api/movies', async (req, res) => {
  try {
    const { services, genres, decade, runtime, page, actor, searchQuery, vibe } = req.query;
    const movies = await getMovies({ services, genres, decade, runtime, page, actor, searchQuery, vibe });
    res.json(movies);
  } catch (error) {
    console.error('Error fetching movies:', error.message);
    res.status(500).json({ error: 'Failed to fetch movies' });
  }
});

app.get('/api/movies/:id/details', async (req, res) => {
  try {
    const { type } = req.query; // 'movie' or 'tv'
    const details = await getMovieDetails(req.params.id, type || 'movie');
    if (!details) {
      return res.status(404).json({ error: 'Details not found' });
    }
    res.json(details);
  } catch (error) {
    console.error('Error fetching movie details:', error.message);
    res.status(500).json({ error: 'Failed to fetch movie details' });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
