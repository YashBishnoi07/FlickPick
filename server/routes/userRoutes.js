import express from 'express';
import Match from '../models/Match.js';
import Like from '../models/Like.js';
import Swipe from '../models/Swipe.js';
import User from '../models/User.js';
import Rating from '../models/Rating.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get matches for the logged-in user
router.get('/matches', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    // Find matches where user is either userId1 or userId2
    const matches = await Match.find({
      $or: [{ userId1: userId }, { userId2: userId }]
    })
      .sort({ createdAt: -1 })
      .populate('userId1', 'username avatar topPicks')
      .populate('userId2', 'username avatar topPicks');

    res.json(matches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all right-swipes (likes) for the logged-in user
router.get('/likes', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const likes = await Like.find({ userId }).sort({ createdAt: -1 });
    res.json(likes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add to watchlist
router.post('/watchlist', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const { movieData } = req.body;
    
    // Check if already in watchlist
    const user = await User.findById(userId);
    const exists = user.watchlist.some(m => m.id === movieData.id);
    
    if (!exists) {
      user.watchlist.push(movieData);
      user.markModified('watchlist');
      await user.save();
    }
    res.json(user.watchlist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get watchlist
router.get('/watchlist', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json(user.watchlist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update avatar
router.put('/avatar', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.avatar = req.body.avatar;
    await user.save();
    res.json({ avatar: user.avatar });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update top picks
router.put('/top-picks', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.topPicks = req.body.topPicks || [];
    await user.save();
    res.json(user.topPicks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get public profile
router.get('/:id/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('username avatar topPicks createdAt');
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Calculate simple stats (likes count, match count)
    const likesCount = await Like.countDocuments({ userId: user._id });
    const matchesCount = await Match.countDocuments({
      $or: [{ userId1: user._id }, { userId2: user._id }]
    });

    res.json({
      ...user.toObject(),
      likesCount,
      matchesCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get Wrapped Data
router.get('/wrapped', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const swipes = await Swipe.find({ userId });
    
    if (swipes.length === 0) {
      return res.json({ error: 'Not enough data' });
    }

    let rightSwipes = 0;
    let leftSwipes = 0;
    const genreCounts = {};

    swipes.forEach(swipe => {
      if (swipe.direction === 'right') rightSwipes++;
      if (swipe.direction === 'left') leftSwipes++;

      if (swipe.direction === 'right' && swipe.movieData?.genre_ids) {
        swipe.movieData.genre_ids.forEach(g => {
          genreCounts[g] = (genreCounts[g] || 0) + 1;
        });
      }
    });

    const GENRE_MAP = {
      28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
      99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
      27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
      10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western'
    };

    let topGenreId = null;
    let topGenreName = 'Movies';
    if (Object.keys(genreCounts).length > 0) {
      topGenreId = Object.keys(genreCounts).reduce((a, b) => genreCounts[a] > genreCounts[b] ? a : b);
      topGenreName = GENRE_MAP[topGenreId] || 'Movies';
    }

    res.json({
      totalSwipes: swipes.length,
      rightSwipes,
      leftSwipes,
      topGenreName,
      genreCounts
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get User Ratings
router.get('/ratings', protect, async (req, res) => {
  try {
    const ratings = await Rating.find({ userId: req.user._id });
    res.json(ratings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create or update a Rating
router.post('/ratings', protect, async (req, res) => {
  try {
    const { movieId, movieData, rating } = req.body;
    
    if (!movieId || !movieData || !rating) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const newRating = await Rating.findOneAndUpdate(
      { userId: req.user._id, movieId },
      { movieId, movieData, rating },
      { upsert: true, new: true }
    );
    
    res.json(newRating);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
