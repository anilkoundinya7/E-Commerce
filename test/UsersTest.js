const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { protectRoute } = require('../middleware');

// Mocks
jest.mock('./db', () => ({ getDb : jest.fn()}));
jest.mock('./middleware', () => ({protectRoute: (req, res, next) => next()}));

const {getDb} = require('./db');

// Import router after mocking
const router = require('./users');
const { Collection } = require('mongodb');

//Helper to create app with router
function createApp() {
    const app = express();
    app.use(express.json());
    app.use('/users', router);
    return app;
}
describe('Users API', () => {
    let app;
    let mockCollection;

    beforeEach(() => {
        app = createApp();
        mockCollection = {
            findOne: jest.fn(),
            insertOne: jest.fn(),
            updateOne: jest.fn(),
            deleteOne: jest.fn(),
        };
        getDb.mockResolvedValue({ collection: () => mockCollection});
    });
    afterEach(() => {
        jest.clearAllMocks();
    });

describe('POST /users/register', () => {
    it('should register a new user', async () => {
      mockCollection.findOne.mockResolvedValue(null);
      mockCollection.insertOne.mockResolvedValue({ insertedId: '12345' });

      const res = await request(app)
        .post('/users/register')
        .send({ name: 'Alice', email: 'alice@example.com', password: 'password' });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ message: 'User registered successfully', userId: '12345' });
      expect(mockCollection.findOne).toHaveBeenCalledWith({ email: 'alice@example.com' });
      expect(mockCollection.insertOne).toHaveBeenCalled();
    });

    it('should not allow duplicate email', async () => {
      mockCollection.findOne.mockResolvedValue({ email: 'exists@example.com' });

      const res = await request(app)
        .post('/users/register')
        .send({ name: 'Bob', email: 'exists@example.com', password: 'pass' });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: 'Email already registered' });
      expect(mockCollection.insertOne).not.toHaveBeenCalled();
    });
  });

  describe('POST /users/login', () => {
    beforeEach(() => {
      // Stub bcrypt.compare
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
      // Stub jwt.sign
      jest.spyOn(jwt, 'sign').mockReturnValue('fake-token');
    });

    it('should return 400 if missing credentials', async () => {
      const res = await request(app).post('/users/login').send({ email: '' });
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: 'Email and password are required' });
    });

    it('should return 401 for invalid email', async () => {
      mockCollection.findOne.mockResolvedValue(null);
      const res = await request(app)
        .post('/users/login')
        .send({ email: 'nope@example.com', password: 'pass' });
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ message: 'Invalid email or password' });
    });

    it('should return token and user for valid login', async () => {
      const userRecord = { _id: 'abc', name: 'Charlie', email: 'charlie@example.com', password: 'hashed', isAdmin: false };
      mockCollection.findOne.mockResolvedValue(userRecord);

      const res = await request(app)
        .post('/users/login')
        .send({ email: 'charlie@example.com', password: 'pass' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token', 'fake-token');
      expect(res.body.user).toEqual({ id: 'abc', name: 'Charlie', email: 'charlie@example.com', isAdmin: false });
    });

    it('should promote specific email to admin', async () => {
      const specialEmail = 'Chandhu@gmail.com';
      const userRecord = { _id: 'xyz', name: 'AdminUser', email: specialEmail, password: 'hashed', isAdmin: false };
      mockCollection.findOne.mockResolvedValue(userRecord);
      mockCollection.updateOne.mockResolvedValue({});

      const res = await request(app)
        .post('/users/login')
        .send({ email: specialEmail, password: 'pass' });

      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { email: specialEmail },
        { $set: { isAdmin: true } }
      );
      expect(res.body.user.isAdmin).toBe(true);
    });
  });

  describe('Protected routes (GET, PUT, DELETE /users/:id)', () => {
    const fakeId = '507f1f77bcf86cd799439011';
    const route = `/users/${fakeId}`;
    const sampleUser = { _id: fakeId, name: 'Dave', email: 'dave@example.com' };

    it('GET should return user data', async () => {
      mockCollection.findOne.mockResolvedValue(sampleUser);
      const res = await request(app).get(route);
      expect(res.status).toBe(200);
      expect(res.body).toEqual(sampleUser);
    });

    it('GET non-existing returns 404', async () => {
      mockCollection.findOne.mockResolvedValue(null);
      const res = await request(app).get(route);
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: 'User not found' });
    });

    it('PUT should update user data', async () => {
      mockCollection.updateOne.mockResolvedValue({});
      const res = await request(app)
        .put(route)
        .send({ name: 'Updated' });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: 'User updated successfully' });
    });

    it('DELETE should remove user', async () => {
      mockCollection.deleteOne.mockResolvedValue({});
      const res = await request(app).delete(route);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: 'User deleted successfully' });
    });
  });
});

