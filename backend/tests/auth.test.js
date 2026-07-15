const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const { getRedisClient, closeConnections } = require('../src/config/db');

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/task_platform_test';

beforeAll(async () => {
  // Connect to mongoose test db if not connected
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri);
  }
  // Initialize Redis
  getRedisClient();
});

afterAll(async () => {
  // Clean up database and close connections
  if (mongoose.connection.readyState !== 0) {
    await User.deleteMany({});
  }
  await closeConnections();
});

beforeEach(async () => {
  await User.deleteMany({});
});

describe('Authentication Endpoints', () => {
  const testUser = {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'password123'
  };

  test('POST /api/auth/register - Should register a new user successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.statusCode).toBe(210);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user.email).toBe(testUser.email);
    expect(res.body.user.name).toBe(testUser.name);

    // Verify user is in database
    const userInDb = await User.findOne({ email: testUser.email });
    expect(userInDb).toBeDefined();
    expect(userInDb.name).toBe(testUser.name);
  });

  test('POST /api/auth/register - Should fail if email already exists', async () => {
    // Register once
    await request(app).post('/api/auth/register').send(testUser);

    // Register again
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/auth/login - Should login successfully and return a JWT', async () => {
    // Register user
    await request(app).post('/api/auth/register').send(testUser);

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe(testUser.email);
  });

  test('POST /api/auth/login - Should fail with wrong password', async () => {
    // Register user
    await request(app).post('/api/auth/register').send(testUser);

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'wrongpassword'
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
