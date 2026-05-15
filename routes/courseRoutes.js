const express = require('express');
const path = require('path');
const Course = require('../models/Course');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/courses-page', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'courses.html'));
});

router.get('/courses', requireAuth, async (req, res) => {
  try {
    const courses = await Course.find({ userId: req.session.userId }).sort({ createdAt: -1 });
    res.json(courses);
  } catch (error) {
    console.error('GET COURSES ERROR:', error);
    res.status(500).json({ message: 'Failed to load courses.' });
  }
});

router.post('/courses/create', requireAuth, async (req, res) => {
  try {
    const { title, code, color, semester } = req.body;

    if (!title || !code) {
      return res.status(400).json({ message: 'Title and code are required.' });
    }

    const course = await Course.create({
      userId: req.session.userId,
      title,
      code,
      color: color || '#0d6efd',
      semester: semester || '2nd Semester, 2026'
    });

    res.status(201).json({ message: 'Course created successfully.', course });
  } catch (error) {
    console.error('CREATE COURSE ERROR:', error);
    res.status(500).json({ message: 'Failed to create course.' });
  }
});

router.post('/courses/update', requireAuth, async (req, res) => {
  try {
    const { courseId, title, code, color, semester } = req.body;

    if (!courseId || !title || !code) {
      return res.status(400).json({ message: 'Course ID, title, and code are required.' });
    }

    const course = await Course.findOneAndUpdate(
      { _id: courseId, userId: req.session.userId },
      { title, code, color, semester },
      { new: true }
    );

    if (!course) {
      return res.status(404).json({ message: 'Course not found.' });
    }

    res.json({ message: 'Course updated successfully.', course });
  } catch (error) {
    console.error('UPDATE COURSE ERROR:', error);
    res.status(500).json({ message: 'Failed to update course.' });
  }
});

router.post('/courses/delete', requireAuth, async (req, res) => {
  try {
    const { courseId } = req.body;

    if (!courseId) {
      return res.status(400).json({ message: 'Course ID is required.' });
    }

    const deletedCourse = await Course.findOneAndDelete({
      _id: courseId,
      userId: req.session.userId
    });

    if (!deletedCourse) {
      return res.status(404).json({ message: 'Course not found.' });
    }

    res.json({ message: 'Course deleted successfully.' });
  } catch (error) {
    console.error('DELETE COURSE ERROR:', error);
    res.status(500).json({ message: 'Failed to delete course.' });
  }
});

module.exports = router;