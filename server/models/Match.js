import mongoose from 'mongoose';

const matchSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true
  },
  movieId: {
    type: Number,
    required: true
  },
  movieData: {
    type: Object,
    required: true
  },
  userId1: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Optional for anonymous matches if any
  },
  userId2: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  }
}, { timestamps: true });

const Match = mongoose.model('Match', matchSchema);
export default Match;
