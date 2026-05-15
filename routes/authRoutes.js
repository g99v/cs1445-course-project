const express = require('express');
const bcrypt = require('bcrypt');
const path = require('path');
const User = require('../models/User');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'register.html'));
});

router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'login.html'));
});

router.post('/auth/register', async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).send('All fields are required.');
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).send('Email already exists.');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName,
      email: email.toLowerCase(),
      passwordHash
    });

    req.session.userId = user._id;
    req.session.userName = user.fullName;

    res.redirect('/dashboard');
  } catch (error) {
  console.error('REGISTER ERROR:', error);
  res.status(500).send(`Server error while registering: ${error.message}`);
    }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).send('Email and password are required.');
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).send('Invalid email or password.');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).send('Invalid email or password.');
    }

    req.session.userId = user._id;
    req.session.userName = user.fullName;

    res.redirect('/dashboard');
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error while logging in.');
  }
});

router.post('/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

router.get('/dashboard', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'dashboard.html'));
});

router.get('/auth/session', (req, res) => {
  if (!req.session.userId) {
    return res.json({ loggedIn: false });
  }

  res.json({
    loggedIn: true,
    user: {
      id: req.session.userId,
      name: req.session.userName
    }
  });
});

module.exports = router;