const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const { getDb } = require('./db');

const router = express.Router();
// ✅ Register a new user
router.post('/register', async (req, res) => {
  const db = await getDb();
  const { name, email, password } = req.body;

  try {
    // Check if email already exists
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email already registered' });
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    // Create user object
    const new_user={name,email,password:hashedPassword};

    
    const result = await db.collection('users').insertOne(new_user);
    res.status(201).json({ message: 'User registered successfully', userId: result.insertedId });
  } catch (err) {

    console.log(err);
    res.status(500).json({ message: 'Registration failed', error: err.message });
  }
});

// ✅ Login user and return JWT
router.post('/login', async (req, res) => {
  const db = await getDb();
  const { email, password } = req.body;

  try {
    const user = await db.collection('users').findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user._id, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
});

// // ✅ Get all users (protected)
// router.get('/:id', async (req, res) => {
//   const db = await getDb();
//   try {
//     const users = await db.collection('users')
//       .find()
//       .project({ password: 0 }) // exclude password
//       .toArray();

//     res.json(users);
//   } catch (err) {
//     console.log(err)
//     res.status(500).json({ message: 'Failed to fetch users', error: err.message });
//   }
// });
// ✅ Get user by ID
router.get('/:id', async (req, res) => {
  const db = await getDb();

  try {
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(req.params.id) },
      { projection: { password: 0 } }
    );

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch user', error: err.message });
  }
});

// ✅ Update user by ID
router.put('/:id', async (req, res) => {
  const db = await getDb();
  const updates = req.body;

  try {
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }
    await db.collection('users').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updates }
    );
    res.json({ message: 'User updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Update failed', error: err.message });
  }
});
// ✅ Delete user by ID
router.delete('/:id', async (req, res) => {
  const db = await getDb();
  try {
    await db.collection('users').deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Deletion failed', error: err.message });
  }
});

const { protectRoute, isAdmin } = require('./middleware');

router.get('/me', protectRoute, async (req, res) => {
  const db = await getDb();
  const user = await db.collection('users').findOne(
    { _id: new ObjectId(req.user.id) },
    { projection: { password: 0 } }
  );
  res.json(user);
});

module.exports = router;

