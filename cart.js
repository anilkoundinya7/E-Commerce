const express = require('express');
const { ObjectId } = require('mongodb');
const { getDb } = require('./db');
const { protectRoute } = require('./middleware');

const router = express.Router();

// ✅ Add product to cart
router.post('/add', async (req, res) => {
  const db = await getDb();
  const { productId, quantity } = req.body;

  if (!productId || !quantity) {
    return res.status(400).json({ message: 'Product ID and quantity are required' });
  }

  try {
    const userId = new ObjectId(req.user.id);

    const existingCartItem = await db.collection('carts').findOne({
      userId
    });

    if (existingCartItem) {
      // Increment quantity
      await db.collection('carts').updateOne(
        { userId, 'items.productId': new ObjectId(productId) },
        { $inc: { 'items.$.quantity': quantity } },
        { productId, 'items.productId' : new ObjectId(productId)}
      );
    } else {
      // Add new product to cart
      await db.collection('carts').updateOne(
        { userId },
        {
          $push: {
            items: {
              productId: new ObjectId(productId),
              quantity

            }
          }
        },
        { upsert: true }
      );
    }

    res.json({ message: 'Product added to cart' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to add to cart', error: err.message });
  }
});

// ✅ Get user's cart
router.get('/userscart',  async (req, res) => {
  const db = await getDb();

  try {
    const userId = new ObjectId(req.user.id);

    const cart = await db.collection('carts').aggregate([
      { $match: { userId } },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      {
        $unwind: '$productDetails'
      },
      {
        $project: {
          _id: 0,
          productId: '$items.productId',
          quantity: '$items.quantity',
          name: '$productDetails.name',
          price: '$productDetails.price',
          total: { $multiply: ['$items.quantity', '$productDetails.price'] }
        }
      }
    ]).toArray();

    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch cart', error: err.message });
  }
});

// ✅ Remove product from cart
router.delete('/remove/:productId', async (req, res) => {
  const db = await getDb();
  const { productId } = req.params;

  try {
    const userId = new ObjectId(req.user.id);

    await db.collection('carts').updateOne(
      { userId },
      {
        $pull: {
          items: { productId: new ObjectId(productId) }
        }
      }
    );

    res.json({ message: 'Product removed from cart' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to remove from cart', error: err.message });
  }
});

module.exports = router;
