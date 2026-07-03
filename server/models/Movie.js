import mongoose from 'mongoose';

const movieSchema = new mongoose.Schema({
  tmdbId: { type: Number, required: true, unique: true },
  title: { type: String, required: true },
  overview: { type: String },
  poster_path: { type: String },
  release_date: { type: String },
  vote_average: { type: Number },
  genres: [{ type: String }],
  media_type: { type: String, default: 'movie' },
  embedding: { type: [Number] } // This will hold the 768-dimensional vector from Gemini
}, { timestamps: true });

const Movie = mongoose.model('Movie', movieSchema);

export default Movie;
