import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import mongoose from 'mongoose';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Movie from '../models/Movie.js';
import { connectDB } from '../config/db.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function embedText(text) {
  const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

async function ingest() {
  await connectDB();
  console.log('Fetching popular movies from TMDB...');

  let tmdbKey = process.env.TMDB_API_KEY;
  let allMovies = [];
  // Fetch top 10 pages (10 pages * 20 movies/page = 200 movies)
  for(let page = 1; page <= 10; page++) {
    const res = await axios.get(`https://api.tmdb.org/3/movie/popular`, {
      params: { api_key: tmdbKey, language: 'en-US', page }
    });
    allMovies = allMovies.concat(res.data.results);
  }

  console.log(`Fetched ${allMovies.length} movies. Starting embedding process...`);

  let count = 0;
  for (const tmdbMovie of allMovies) {
    try {
      const existing = await Movie.findOne({ tmdbId: tmdbMovie.id });
      if (existing) {
        console.log(`Skipping ${tmdbMovie.title}, already exists.`);
        continue;
      }

      if (!tmdbMovie.overview || tmdbMovie.overview.trim() === '') {
        continue; // Skip if no plot
      }

      const textToEmbed = `Title: ${tmdbMovie.title}\nOverview: ${tmdbMovie.overview}`;
      const embedding = await embedText(textToEmbed);

      await Movie.create({
        tmdbId: tmdbMovie.id,
        title: tmdbMovie.title,
        overview: tmdbMovie.overview,
        poster_path: tmdbMovie.poster_path,
        release_date: tmdbMovie.release_date,
        vote_average: tmdbMovie.vote_average,
        media_type: 'movie',
        embedding
      });

      count++;
      console.log(`Ingested: ${tmdbMovie.title} (${count})`);
      
      // Prevent rate limits
      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      console.error(`Error processing ${tmdbMovie.title}:`, err.message);
    }
  }

  console.log(`Successfully ingested ${count} new movies!`);
  mongoose.connection.close();
}

ingest();
