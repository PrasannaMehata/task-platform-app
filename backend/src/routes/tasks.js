const express = require('express');
const Task = require('../models/Task');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createTaskSchema, queryTasksSchema } = require('../schemas/validation');
const { getRedisClient } = require('../config/db');
const logger = require('../config/logger');

const router = express.Router();

// Apply auth middleware to all task routes
router.use(auth);

// POST /api/tasks — Create a task (status=pending, not run yet)
router.post('/', validate(createTaskSchema), async (req, res, next) => {
  try {
    const { title, inputText, operationType } = req.body;
    const userId = req.user.id;

    const newTask = new Task({
      userId,
      title,
      inputText,
      operationType,
      status: 'pending',
      logs: [
        {
          timestamp: new Date(),
          message: 'Task created'
        }
      ]
    });

    await newTask.save();

    logger.info({ taskId: newTask._id, userId }, 'Task created');

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      task: newTask
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/tasks/:id/run — Trigger run: Publish to Redis Stream "tasks"
router.post('/:id/run', async (req, res, next) => {
  try {
    const taskId = req.params.id;
    const userId = req.user.id;

    // Find the task and ensure it belongs to the current user
    const task = await Task.findOne({ _id: taskId, userId });
    if (!task) {
      logger.warn({ taskId, userId }, 'Task run trigger failed: task not found');
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check if task is already in a final state (or in-flight if we want to prevent double-runs)
    if (task.status === 'running') {
      return res.status(400).json({
        success: false,
        message: 'Task is already running'
      });
    }

    // Update status to pending (if it was failed or success and being retried) and append log
    task.status = 'pending';
    task.logs.push({
      timestamp: new Date(),
      message: 'Task queued for execution'
    });
    await task.save();

    // Get Redis client and publish message onto Redis Stream "tasks"
    const redis = getRedisClient();
    
    // XADD stream name, * (auto-generate ID), field-value pairs
    const streamId = await redis.xadd('tasks', '*', 'taskId', task._id.toString());
    
    logger.info({ taskId, streamId }, 'Task queued in Redis Stream "tasks"');

    res.status(200).json({
      success: true,
      message: 'Task run triggered successfully',
      task
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/tasks — List authenticated user's tasks with pagination & status filtering
router.get('/', validate(queryTasksSchema, 'query'), async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page, limit, status } = req.query;

    const query = { userId };
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [tasks, total] = await Promise.all([
      Task.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Task.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: tasks,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/tasks/:id — Detailed task info (including logs and results)
router.get('/:id', async (req, res, next) => {
  try {
    const taskId = req.params.id;
    const userId = req.user.id;

    const task = await Task.findOne({ _id: taskId, userId });
    if (!task) {
      logger.warn({ taskId, userId }, 'Task details fetch failed: task not found');
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.status(200).json({
      success: true,
      task
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
