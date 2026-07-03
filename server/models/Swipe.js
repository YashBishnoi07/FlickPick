import mongoose from 'mongoose';

const swipeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  movieId: {
    type: Number,
    required: true
  },
  movieData: {
    type: Object,
    required: true
  },
  direction: {
    type: String,
    enum: ['left', 'right'],
    required: true
  }
}, { timestamps: true });

// Prevent duplicate swipes for the same user and movie
swipeSchema.index({ userId: 1, movieId: 1 }, { unique: true });

export default mongoose.model('Swipe', swipeSchema);
