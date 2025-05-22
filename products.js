const express = require('express');
const multer = require('multer');
const path = require('path');
const { ObjectId } = require('mongodb');
const { getDb } = require('./db');
const { protectRoute, isAdmin } = require('./middleware');

const router = express.Router();

// ✅ Multer Storage Setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Save to uploads folder
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

// // ✅ File Type Check (Optional)
// const fileFilter = (req, file, cb) => {
//   const allowedTypes = /jpeg|jpg|png|webp/;
//   const ext = path.extname(file.originalname).toLowerCase();
//   const isValid = allowedTypes.test(ext);
//   isValid ? cb(null, true) : cb(new Error('Only image files are allowed!'));
// };

// ✅ Multer Middleware
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});


// ✅ API: Add New Product with Image
router.post('/newProducts', protectRoute, isAdmin, upload.single('image'),  async (req, res) => {
    try {
      const db = await getDb();
      const { name, price, description, category, stock } = req.body;

      if (!name || !price) {
        return res.status(400).json({ message: 'Name and price are required.' });
      }

      const imageUrl = req.file ? `/uploads/${req.file.filename}` : '';

      const newProduct = {
        name,
        price: parseFloat(price),
        description: description || '',
        category: category || 'General',
        stock: parseInt(stock) || 0,
        imageUrl,
        createdAt: new Date(),
      };

      const result = await db.collection('products').insertOne(newProduct);
      res.status(201).json({ message: 'Product created', productId: result.insertedId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Product creation failed', error: err.message });
    }
  }
);



// ✅ Get all products
router.get('/readProducts',  async (req, res) => {
  const db = await getDb();

  try {
    const products = await db.collection('products').find().toArray();
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch products', error: err.message });
  }
});

// // ✅ Get a product by ID
// router.get('/:id', protectRoute, async (req, res) => {
//   const db = await getDb();
//   const id = req.params.id;

//   try {
//     const product = await db.collection('products').findOne({ _id: new ObjectId(id) });

//     if (!product) return res.status(404).json({ message: 'Product not found' });

//     res.json(product);
//   } catch (err) {
//     res.status(500).json({ message: 'Failed to fetch product', error: err.message });
//   }
// });


// ✅ Update a product by ID
// ✅ PUT /:id — update product with optional image
router.put('/:id', protectRoute, isAdmin, upload.single('image'), async (req, res) => {
  const db = await getDb();
  const productId = req.params.id;
  const updates = req.body;

  try {
    // Parse numbers
    if (updates.price) updates.price = parseFloat(updates.price);
    if (updates.stock) updates.stock = parseInt(updates.stock);

    // Add image if uploaded
    if (req.file) {
      updates.imageUrl = `/uploads/${req.file.filename}`;
    }

    await db.collection('products').updateOne(
      { _id: new ObjectId(productId) },
      { $set: updates }
    );

    res.json({ message: 'Product updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Update failed', error: err.message });
  }
});

// ✅ Delete a product by ID
// Admin-only route to delete product
router.delete('/:id', protectRoute, isAdmin, async (req, res) => {
  const db = await getDb();

  try {
    const result = await db.collection('products').deleteOne({ _id: new ObjectId(req.params.id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Product not found or already deleted' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Deletion failed', error: err.message });
  }
});

router.get('/view', async (req, res) => {
  try {
    const db = getDb();
    const products = await db.collection('products').find({}).toArray();
    res.render('products', { products });
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;