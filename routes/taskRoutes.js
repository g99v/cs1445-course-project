const express = require('express');
const path = require('path');
const Task = require('../models/Task');
const Course = require('../models/Course');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

function getUrgencyBucket(task) {
  if (task.status === 'Completed') return 'Completed';

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const due = new Date(task.dueDate);
  due.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((due - now) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Overdue';
  if (diffDays <= 1) return 'Today';
  return 'Soon';
}

router.get('/tasks-page', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'tasks.html'));
});

router.get('/tasks', requireAuth, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.session.userId })
      .populate('courseId', 'title code color')
      .sort({ dueDate: 1 });

    const tasksWithUrgency = tasks.map((task) => ({
      ...task.toObject(),
      urgencyBucket: getUrgencyBucket(task)
    }));

    res.json(tasksWithUrgency);
  } catch (error) {
    console.error('GET TASKS ERROR:', error);
    res.status(500).json({ message: 'Failed to load tasks.' });
  }
});

router.get('/tasks/meta', requireAuth, async (req, res) => {
  try {
    const courses = await Course.find({ userId: req.session.userId }).sort({ title: 1 });
    res.json({ courses });
  } catch (error) {
    console.error('TASK META ERROR:', error);
    res.status(500).json({ message: 'Failed to load task metadata.' });
  }
});

router.post('/tasks/create', requireAuth, async (req, res) => {
  try {
    const { courseId, title, description, dueDate, priority, status, estimatedHours } = req.body;

    if (!courseId || !title || !dueDate) {
      return res.status(400).json({ message: 'Course, title, and due date are required.' });
    }

    const task = await Task.create({
      userId: req.session.userId,
      courseId,
      title,
      description,
      dueDate,
      priority,
      status,
      estimatedHours
    });

    res.status(201).json({ message: 'Task created successfully.', task });
  } catch (error) {
    console.error('CREATE TASK ERROR:', error);
    res.status(500).json({ message: 'Failed to create task.' });
  }
});

router.post('/tasks/update', requireAuth, async (req, res) => {
  try {
    const { taskId, courseId, title, description, dueDate, priority, status, estimatedHours } = req.body;

    if (!taskId || !courseId || !title || !dueDate) {
      return res.status(400).json({ message: 'Task ID, course, title, and due date are required.' });
    }

    const task = await Task.findOneAndUpdate(
      { _id: taskId, userId: req.session.userId },
      { courseId, title, description, dueDate, priority, status, estimatedHours },
      { new: true }
    );

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    res.json({ message: 'Task updated successfully.', task });
  } catch (error) {
    console.error('UPDATE TASK ERROR:', error);
    res.status(500).json({ message: 'Failed to update task.' });
  }
});

router.post('/tasks/delete', requireAuth, async (req, res) => {
  try {
    const { taskId } = req.body;

    if (!taskId) {
      return res.status(400).json({ message: 'Task ID is required.' });
    }

    const deletedTask = await Task.findOneAndDelete({
      _id: taskId,
      userId: req.session.userId
    });

    if (!deletedTask) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    res.json({ message: 'Task deleted successfully.' });
  } catch (error) {
    console.error('DELETE TASK ERROR:', error);
    res.status(500).json({ message: 'Failed to delete task.' });
  }
});

router.get('/tasks/dashboard-data', requireAuth, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.session.userId })
      .populate('courseId', 'title code color');

    const grouped = {
      Today: [],
      Soon: [],
      Overdue: [],
      Completed: []
    };

    tasks.forEach((task) => {
      const urgency = getUrgencyBucket(task);
      grouped[urgency].push({
        ...task.toObject(),
        urgencyBucket: urgency
      });
    });

    res.json(grouped);
  } catch (error) {
    console.error('DASHBOARD TASK ERROR:', error);
    res.status(500).json({ message: 'Failed to load dashboard data.' });
  }
});

module.exports = router;