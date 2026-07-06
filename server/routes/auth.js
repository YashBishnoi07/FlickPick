import express from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth requests per windowMs
  message: { message: 'Too many login attempts, please try again after 15 minutes' }
});

const AuthSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Only alphanumeric and underscores allowed'),
  password: z.string().min(6).max(100),
  securityQuestion: z.string().optional(),
  securityAnswer: z.string().optional()
});

const generateToken = (res, id) => {
  const token = jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });

  res.cookie('token', token, {
    httpOnly: true,
    secure: true, // Must be true for sameSite: 'none'
    sameSite: 'none', // Allow cross-site cookies between Vercel and Render
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
};

// Get Security Question for Forgot Password
router.post('/get-security-question', authLimiter, async (req, res) => {
  try {
    const { username } = req.body;
    
    const user = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.securityQuestion) {
      return res.status(400).json({ message: 'This account does not have a security question set up. Cannot reset password.' });
    }

    res.status(200).json({ question: user.securityQuestion });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Reset Password with Security Answer
router.post('/reset-password-security', authLimiter, async (req, res) => {
  try {
    const { username, securityAnswer, newPassword } = req.body;
    
    if (!securityAnswer || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Invalid payload' });
    }

    const user = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });

    if (!user || !user.securityAnswer) {
      return res.status(400).json({ message: 'User not found or missing security answer' });
    }

    // Verify Security Answer
    const isMatch = await bcrypt.compare(securityAnswer.trim().toLowerCase(), user.securityAnswer);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect security answer' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password reset successfully!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Change password route (Requires old password, authenticated)
router.post('/change-password', protect, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    
    if (!oldPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Invalid payload' });
    }

    const user = await User.findById(req.user._id);
    if (user && (await user.matchPassword(oldPassword))) {
      user.password = newPassword;
      await user.save();
      res.json({ message: 'Password reset successfully!' });
    } else {
      res.status(401).json({ message: 'Incorrect old password' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Register User
router.post('/register', authLimiter, async (req, res) => {
  try {
    const parsed = AuthSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0].message });
    }
    const { username, password, securityQuestion, securityAnswer } = parsed.data;

    const userExists = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    let hashedAnswer = undefined;
    if (securityAnswer) {
      const salt = await bcrypt.genSalt(10);
      hashedAnswer = await bcrypt.hash(securityAnswer.trim().toLowerCase(), salt);
    }

    const user = await User.create({
      username,
      password,
      ...(securityQuestion && { securityQuestion }),
      ...(hashedAnswer && { securityAnswer: hashedAnswer })
    });

    if (user) {
      generateToken(res, user._id);
      res.status(201).json({
        _id: user._id,
        username: user.username,
        avatar: user.avatar,
        topPicks: user.topPicks,
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Login User
router.post('/login', authLimiter, async (req, res) => {
  try {
    const parsed = AuthSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0].message });
    }
    const { username, password } = parsed.data;

    const user = await User.findOne({ username });

    if (user && (await user.matchPassword(password))) {
      generateToken(res, user._id);
      res.json({
        _id: user._id,
        username: user.username,
        avatar: user.avatar,
        topPicks: user.topPicks,
      });
    } else {
      res.status(401).json({ message: 'Invalid username or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get current user
router.get('/me', protect, async (req, res) => {
  res.json({
    _id: req.user._id,
    username: req.user.username,
    avatar: req.user.avatar,
    topPicks: req.user.topPicks,
  });
});

// Google Login
router.post('/google-login', authLimiter, async (req, res) => {
  try {
    const { token } = req.body;
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub, name, picture } = payload; // sub is googleId

    let user = await User.findOne({ googleId: sub });
    if (!user) {
      // Create a new user
      const baseUsername = name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
      let username = baseUsername;
      let counter = 1;
      while (await User.findOne({ username })) {
        username = `${baseUsername}_${counter}`;
        counter++;
      }
      user = await User.create({
        username,
        googleId: sub,
        avatar: picture || '👤',
      });
    }

    generateToken(res, user._id);
    res.status(200).json({
      _id: user._id,
      username: user.username,
      avatar: user.avatar,
      topPicks: user.topPicks,
    });
  } catch (error) {
    console.error("Google login error:", error);
    res.status(401).json({ message: 'Invalid Google token' });
  }
});

// Logout User
router.post('/logout', (req, res) => {
  res.cookie('token', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    expires: new Date(0)
  });
  res.status(200).json({ message: 'Logged out successfully' });
});

export default router;
