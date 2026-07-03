import mongoose from 'mongoose';

const likeSchema = new mongoose.Schema({
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
  }
}, { timestamps: true });

// Prevent duplicate likes for the same user and movie
likeSchema.index({ userId: 1, movieId: 1 }, { unique: true });

export default mongoose.model('Like', likeSchema);
