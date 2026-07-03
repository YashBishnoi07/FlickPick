import express from 'express';
import Message from '../models/Message.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const { room } = req.query;
    if (!room) return res.json([]);

    const messages = await Message.find({ chatRoomId: room })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('user', 'username avatar');
    
    res.json(messages.reverse());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/last', protect, async (req, res) => {
  try {
    const { rooms } = req.body;
    if (!rooms || !Array.isArray(rooms)) return res.json({});

    const lastMessages = {};
    await Promise.all(rooms.map(async (room) => {
      const msg = await Message.findOne({ chatRoomId: room }).sort({ createdAt: -1 }).select('text createdAt');
      if (msg) lastMessages[room] = msg;
    }));

    res.json(lastMessages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
