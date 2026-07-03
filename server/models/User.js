import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  securityQuestion: {
    type: String,
    required: false, // Make it optional so existing users don't break on login
  },
  securityAnswer: {
    type: String,
    required: false,
  },
  watchlist: {
    type: Array,
    default: []
  },
  avatar: {
    type: String,
    default: '👤'
  },
  topPicks: {
    type: Array,
    default: []
  }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
