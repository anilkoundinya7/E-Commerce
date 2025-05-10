const express = require('express');
const { ObjectId } = require('mongodb');
const { getDb } = require('./db');

const router = express.Router();

// ✅ Create a new product
router.post('/newProducts', async (req, res) => {
  

  // if (!name || !price) {
  //   return res.status(400).json({ message: 'Name and price are required' });
  // }
    
//   const newProduct = {
//     name,
//     price,
//     description: description || '',
//     category: category || 'General',
//     imageUrl: imageUrl || '',
//     stock: stock || 0,
//     createdAt: new Date(),
//   };

  try {
    const db = await getDb();
  const { name, price, description, category,stock } = req.body;
    const result = await db.collection('products').insertOne({ name, price, description, category, stock });
    res.status(201).json({ message: 'Product created', productId: result.insertedId });
  } catch (err) {
    res.status(500).json({ message: 'Product creation failed', error: err.message });
  }
});

// ✅ Get all products
router.get('/readProducts', async (req, res) => {
  const db = await getDb();

  try {
    const products = await db.collection('products').find().toArray();
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch products', error: err.message });
  }
});

// ✅ Get a product by ID
router.get('/:id', async (req, res) => {
  const db = await getDb();
  const id=req.params.id;

  try {
    const product = await db.collection('products').findOne({ _id: new ObjectId(id) });

    if (!product) return res.status(404).json({ message: 'Product not found' });

    res.json(product);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch product', error: err.message });
  }
});

// ✅ Update a product by ID
router.put('/:id', async (req, res) => {
  const db = await getDb();
  const updates = req.body;

  try {
    await db.collection('products').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updates }
    );
    res.json({ message: 'Product updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Update failed', error: err.message });
  }
});

// ✅ Delete a product by ID
router.delete('/:id', async (req, res) => {
  const db = await getDb();

  try {
    await db.collection('products').deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Deletion failed', error: err.message });
  }
});

module.exports = router;
