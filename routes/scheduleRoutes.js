const express = require('express');
const path = require('path');
const Lecture = require('../models/Lecture');
const Course = require('../models/Course');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

function timeToMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function hasTimeConflict(existingLecture, newLecture) {
  if (existingLecture.dayOfWeek !== newLecture.dayOfWeek) return false;

  const existingStart = timeToMinutes(existingLecture.startTime);
  const existingEnd = timeToMinutes(existingLecture.endTime);
  const newStart = timeToMinutes(newLecture.startTime);
  const newEnd = timeToMinutes(newLecture.endTime);

  return newStart < existingEnd && existingStart < newEnd;
}

router.get('/schedule-page', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'schedule.html'));
});

router.get('/schedule/meta', requireAuth, async (req, res) => {
  try {
    const courses = await Course.find({ userId: req.session.userId }).sort({ title: 1 });
    res.json({ courses });
  } catch (error) {
    console.error('SCHEDULE META ERROR:', error);
    res.status(500).json({ message: 'Failed to load schedule metadata.' });
  }
});

router.get('/schedule/lectures', requireAuth, async (req, res) => {
  try {
    const lectures = await Lecture.find({ userId: req.session.userId })
      .populate('courseId', 'title code color')
      .sort({ dayOfWeek: 1, startTime: 1 });

    res.json(lectures);
  } catch (error) {
    console.error('GET LECTURES ERROR:', error);
    res.status(500).json({ message: 'Failed to load lectures.' });
  }
});

router.post('/schedule/create', requireAuth, async (req, res) => {
  try {
    const { courseId, dayOfWeek, startTime, endTime, room, instructor, type } = req.body;

    if (!courseId || !dayOfWeek || !startTime || !endTime) {
      return res.status(400).json({ message: 'Course, day, start time, and end time are required.' });
    }

    if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
      return res.status(400).json({ message: 'End time must be after start time.' });
    }

    const existingLectures = await Lecture.find({ userId: req.session.userId, dayOfWeek });

    const newLectureData = { dayOfWeek, startTime, endTime };

    const conflict = existingLectures.find((lecture) =>
      hasTimeConflict(lecture, newLectureData)
    );

    if (conflict) {
      return res.status(400).json({
        message: `Time conflict with another lecture on ${dayOfWeek}.`
      });
    }

    const lecture = await Lecture.create({
      userId: req.session.userId,
      courseId,
      dayOfWeek,
      startTime,
      endTime,
      room,
      instructor,
      type
    });

    res.status(201).json({ message: 'Lecture added successfully.', lecture });
  } catch (error) {
    console.error('CREATE LECTURE ERROR:', error);
    res.status(500).json({ message: 'Failed to create lecture.' });
  }
});

router.post('/schedule/update', requireAuth, async (req, res) => {
  try {
    const { lectureId, courseId, dayOfWeek, startTime, endTime, room, instructor, type } = req.body;

    if (!lectureId || !courseId || !dayOfWeek || !startTime || !endTime) {
      return res.status(400).json({ message: 'Lecture ID, course, day, start time, and end time are required.' });
    }

    if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
      return res.status(400).json({ message: 'End time must be after start time.' });
    }

    const existingLectures = await Lecture.find({
      userId: req.session.userId,
      dayOfWeek,
      _id: { $ne: lectureId }
    });

    const updatedLectureData = { dayOfWeek, startTime, endTime };

    const conflict = existingLectures.find((lecture) =>
      hasTimeConflict(lecture, updatedLectureData)
    );

    if (conflict) {
      return res.status(400).json({
        message: `Time conflict with another lecture on ${dayOfWeek}.`
      });
    }

    const lecture = await Lecture.findOneAndUpdate(
      { _id: lectureId, userId: req.session.userId },
      { courseId, dayOfWeek, startTime, endTime, room, instructor, type },
      { new: true }
    );

    if (!lecture) {
      return res.status(404).json({ message: 'Lecture not found.' });
    }

    res.json({ message: 'Lecture updated successfully.', lecture });
  } catch (error) {
    console.error('UPDATE LECTURE ERROR:', error);
    res.status(500).json({ message: 'Failed to update lecture.' });
  }
});

router.post('/schedule/delete', requireAuth, async (req, res) => {
  try {
    const { lectureId } = req.body;

    if (!lectureId) {
      return res.status(400).json({ message: 'Lecture ID is required.' });
    }

    const deletedLecture = await Lecture.findOneAndDelete({
      _id: lectureId,
      userId: req.session.userId
    });

    if (!deletedLecture) {
      return res.status(404).json({ message: 'Lecture not found.' });
    }

    res.json({ message: 'Lecture deleted successfully.' });
  } catch (error) {
    console.error('DELETE LECTURE ERROR:', error);
    res.status(500).json({ message: 'Failed to delete lecture.' });
  }
});

module.exports = router;