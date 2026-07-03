import mongoose from 'mongoose';

const roomSessionSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
  },
  prefs: {
    type: Object,
    default: { services: '', genres: '' }
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: '24h' // Automatically delete inactive rooms after 24 hours
  }
});

const RoomSession = mongoose.model('RoomSession', roomSessionSchema);
export default RoomSession;
