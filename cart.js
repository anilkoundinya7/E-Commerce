  const express = require('express');
  const { ObjectId } = require('mongodb');
  const { connectDB,getDb } = require('./db');
  const { protectRoute } = require('./middleware');

  const router = express.Router();

  // ✅ Add product to cart
router.post('/add', protectRoute, async (req, res) => {
  const db = await getDb();
  const { productId, quantity } = req.body;

  // Input validation
  if (!productId || !quantity || quantity <= 0) {
    return res.status(400).json({ message: 'Valid product ID and quantity are required' });
  }

  try {
    const userId = new ObjectId(req.user.id);
    const prodId = new ObjectId(productId);

    // Check if user already has this product in cart
    const existingItem = await db.collection('carts').findOne({
      userId,
      'items.productId': prodId
    });

    if (existingItem) {
      // Increment quantity of the existing product in the cart
      await db.collection('carts').updateOne(
        { userId, 'items.productId': prodId },
        { $inc: { 'items.$.quantity': quantity } }
      );
    } else {
      // Add product to cart (if cart exists or not)
      await db.collection('carts').updateOne(
        { userId },
        {
          $push: {
            items: {
              productId: prodId,
              quantity
            }
          }
        },
        { upsert: true } // creates cart if it doesn't exist
      );
    }

    res.json({ message: 'Product added to cart successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to add product to cart', error: err.message });
  }
});

  // ✅ Get user's cart
  router.get('/userscart', protectRoute,  async (req, res) => {
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
            quantity: { $toInt: '$items.quantity' },
            name: '$productDetails.name',
            price: { $toDouble: '$productDetails.price' },
            total: {
              $multiply: [
                { $toInt: '$items.quantity' },{ $toDouble: '$productDetails.price' }]
    }
  }
        }
      ]).toArray();

      res.json(cart);
    } catch (err) {
      res.status(500).json({ message: 'Failed to fetch cart', error: err.message });
    }
  });

  // ✅ Remove product from cart
router.delete('/remove/:productId', protectRoute, async (req, res) => {
  const db = await getDb();
  const { productId } = req.params;

  // Validate productId format
  if (!ObjectId.isValid(productId)) {
    return res.status(400).json({ message: 'Invalid product ID.' });
  }

  try {
    const userId = new ObjectId(req.user.id);

    // Pull the item from the user's cart
    const result = await db.collection('carts').updateOne(
      { userId },
      { 
        $pull: { 
          items: { productId: new ObjectId(productId) } 
        } 
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Cart not found for this user.' });
    }
    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: 'Product not found in cart.' });
    }

    // Optionally, fetch the updated cart
    const updatedCart = await db.collection('carts').findOne({ userId });

    return res.json({
      message: 'Product removed from cart.',
      cart: updatedCart
    });
  } catch (err) {
    console.error('Error removing product from cart:', err);
    return res.status(500).json({ 
      message: 'Failed to remove product from cart.', 
      error: err.message 
    });
  }
});

  module.exports = router;
