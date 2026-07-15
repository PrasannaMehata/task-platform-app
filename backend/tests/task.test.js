const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Task = require('../src/models/Task');
const { getRedisClient, closeConnections } = require('../src/config/db');

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/task_platform_test';

let authToken;
let testUserId;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri);
  }
  getRedisClient();

  // Clear DB
  await User.deleteMany({});
  await Task.deleteMany({});

  // Register and login a user to get auth token
  const userPayload = {
    name: 'Task Tester',
    email: 'tasktester@example.com',
    password: 'password123'
  };

  await request(app).post('/api/auth/register').send(userPayload);
  const loginRes = await request(app).post('/api/auth/login').send({
    email: userPayload.email,
    password: userPayload.password
  });
  
  authToken = `Bearer ${loginRes.body.token}`;
  testUserId = loginRes.body.user.id;
});

afterAll(async () => {
  await User.deleteMany({});
  await Task.deleteMany({});
  await closeConnections();
});

describe('Task Management Endpoints', () => {
  let createdTaskId;

  test('POST /api/tasks - Should create a new pending task', async () => {
    const taskPayload = {
      title: 'Test Task 1',
      inputText: 'hello world',
      operationType: 'uppercase'
    };

    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', authToken)
      .send(taskPayload);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.task).toHaveProperty('_id');
    expect(res.body.task.status).toBe('pending');
    expect(res.body.task.operationType).toBe('uppercase');
    expect(res.body.task.logs.length).toBe(1);
    expect(res.body.task.logs[0].message).toBe('Task created');

    createdTaskId = res.body.task._id;
  });

  test('POST /api/tasks - Should fail if auth token is missing', async () => {
    const taskPayload = {
      title: 'Test Task 1',
      inputText: 'hello world',
      operationType: 'uppercase'
    };

    const res = await request(app)
      .post('/api/tasks')
      .send(taskPayload);

    expect(res.statusCode).toBe(401);
  });

  test('POST /api/tasks/:id/run - Should trigger task run and queue in Redis Stream', async () => {
    const res = await request(app)
      .post(`/api/tasks/${createdTaskId}/run`)
      .set('Authorization', authToken);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.task.status).toBe('pending');
    
    // Check if task logs list queuing message
    const updatedTask = await Task.findById(createdTaskId);
    expect(updatedTask.logs.some(log => log.message.includes('queued'))).toBe(true);

    // Verify it was pushed to Redis Stream "tasks"
    const redis = getRedisClient();
    const streamItems = await redis.xrange('tasks', '-', '+');
    expect(streamItems.length).toBeGreaterThan(0);
    // Find the item with our taskId
    const hasTaskId = streamItems.some(item => {
      const fields = item[1];
      return fields.includes(createdTaskId);
    });
    expect(hasTaskId).toBe(true);
  });

  test('GET /api/tasks - Should list user tasks with pagination', async () => {
    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', authToken)
      .query({ page: 1, limit: 5 });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.pagination.total).toBe(1);
  });

  test('GET /api/tasks/:id - Should return task details', async () => {
    const res = await request(app)
      .get(`/api/tasks/${createdTaskId}`)
      .set('Authorization', authToken);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.task._id).toBe(createdTaskId);
  });

  test('GET /api/tasks/:id - Should fail if user does not own task', async () => {
    // Create another user
    const otherUser = {
      name: 'Other User',
      email: 'other@example.com',
      password: 'password123'
    };
    await request(app).post('/api/auth/register').send(otherUser);
    const otherLogin = await request(app).post('/api/auth/login').send({
      email: otherUser.email,
      password: otherUser.password
    });
    const otherToken = `Bearer ${otherLogin.body.token}`;

    const res = await request(app)
      .get(`/api/tasks/${createdTaskId}`)
      .set('Authorization', otherToken);

    expect(res.statusCode).toBe(404); // returns 404 to hide existence
  });
});
