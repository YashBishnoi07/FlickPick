import express from 'express';
import { getTrackForMovie } from '../services/spotifyService.js';

const router = express.Router();

router.get('/track', async (req, res) => {
  try {
    const { title, genreIds, year } = req.query;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    let parsedGenreIds = [];
    if (genreIds) {
      if (Array.isArray(genreIds)) {
        parsedGenreIds = genreIds.map(Number);
      } else if (typeof genreIds === 'string') {
        parsedGenreIds = genreIds.split(',').map(Number).filter(n => !isNaN(n));
      }
    }

    const track = await getTrackForMovie({
      title,
      genreIds: parsedGenreIds,
      year
    });

    if (!track) {
      return res.status(404).json({ message: 'No track found or Spotify not configured' });
    }

    res.json(track);
  } catch (error) {
    console.error('Spotify track route error:', error.message);
    res.status(500).json({ error: 'Failed to fetch Spotify track' });
  }
});

export default router;
