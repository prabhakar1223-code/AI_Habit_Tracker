
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const signToken = (id) =>
  jwt.sign(
    { id },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '30d'
    }
  );

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Name, email and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters'
      });
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    const exist = await User.findOne({
      email: normalizedEmail
    });

    if (exist) {
      return res.status(400).json({
        message: 'Email already registered'
      });
    }

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      avatar: name.trim().charAt(0).toUpperCase()
    });

    const token = signToken(user._id);

    return res.status(201).json({
      user,
      token
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        message: 'Email already registered'
      });
    }

    console.error('Registration error:', err.message);

    return res.status(500).json({
      message: 'Server error during registration'
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password required'
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase()
    });

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    const token = signToken(user._id);

    return res.json({ user, token });
  } catch (err) {
    console.error('Login error:', err.message);

    return res.status(500).json({
      message: 'Server error during login'
    });
  }
};

export const me = async (req, res) => {
  return res.json({ user: req.user });
};

export const updateProfile = async (req, res) => {
  try {
    const { name, morningMotivation } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({
          message: 'Name cannot be empty'
        });
      }

      user.name = name.trim();
      user.avatar = name.trim().charAt(0).toUpperCase();
    }

    if (morningMotivation !== undefined) {
      if (typeof morningMotivation !== 'boolean') {
        return res.status(400).json({
          message: 'morningMotivation must be a boolean'
        });
      }

      user.morningMotivation = morningMotivation;
    }

    await user.save();

    return res.json({ user });
  } catch (err) {
    console.error('Profile update error:', err.message);

    return res.status(500).json({
      message: 'Server error while updating profile'
    });
  }
};
