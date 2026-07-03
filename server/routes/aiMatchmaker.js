import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { protect } from '../middleware/authMiddleware.js';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';

import Rating from '../models/Rating.js';

const router = express.Router();

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per `window` (here, per 15 minutes)
  message: { error: 'Too many AI requests from this IP, please try again after 15 minutes' },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

const PromptSchema = z.object({
  prompt: z.string().min(3).max(500),
  useSmartAi: z.boolean().optional()
});

router.post('/', protect, aiLimiter, async (req, res) => {
  try {
    const parsed = PromptSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }
    const { prompt, useSmartAi } = parsed.data;
    if (!prompt) return res.status(400).json({ message: 'Prompt is required' });

    let personalizationContext = '';
    if (useSmartAi) {
      const userRatings = await Rating.find({ userId: req.user._id });
      if (userRatings.length > 0) {
        const highlyRated = userRatings.filter(r => r.rating >= 4).map(r => r.movieData.title || r.movieData.name).slice(0, 10);
        const poorlyRated = userRatings.filter(r => r.rating <= 2).map(r => r.movieData.title || r.movieData.name).slice(0, 5);
        
        personalizationContext = `\nPersonalization Context (Do NOT ignore this): The user loves these movies: ${highlyRated.join(', ')}. The user dislikes these movies: ${poorlyRated.join(', ')}. Bias your recommendations towards their tastes.`;
      }
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const systemInstruction = `You are a movie recommendation engine API. You take a user's natural language vibe or prompt and convert it strictly into JSON format that matches our TMDB filtering schema.
    Output ONLY raw JSON with these exact keys. No markdown blocks, no intro, no outro:
    {
      "services": "comma separated string of: netflix, prime video, disney+ hotstar, sonyliv, jiocinema, zee5, hulu, max, crunchyroll. Try to guess based on prompt. Leave empty if none.",
      "genres": "comma separated string of: action, comedy, horror, romance, sci-fi, drama. Try to map prompt to these. Leave empty if none.",
      "decade": "one of: 2020, 2010, 2000, 1990, 1980. Or 'all'.",
      "runtime": "one of: 90, 120, 150. Or 'all'.",
      "actor": "if the user mentions a specific actor, actress, or director (e.g. 'Tom Cruise'), put their exact name here. Otherwise leave empty.",
      "searchQuery": "if the user mentions a specific movie franchise or exact title (e.g. 'Harry Potter', 'Avengers'), put it here. Otherwise leave empty.",
      "vibe": "if the user mentions an abstract concept, feeling, or specific plot point (e.g. 'a cozy movie about time travel', 'mind-bending thriller', 'movies where someone is trapped in a dream'), put that EXACT text here so we can do an AI semantic vector search. Otherwise leave empty."
    }${personalizationContext}
    
    User prompt: ${prompt}`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: systemInstruction }] }],
      generationConfig: {
        responseMimeType: 'application/json'
      }
    });
    let text = result.response.text();
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    const filters = JSON.parse(text);
    res.json(filters);
  } catch (error) {
    console.error('AI Matchmaker Error:', error);
    res.status(500).json({ message: 'Failed to generate recommendations from AI' });
  }
});

export default router;
