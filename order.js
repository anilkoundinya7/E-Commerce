const express = require('express');
const { ObjectId } = require('mongodb');
const { getDb } = require('./db');
const { protectRoute } = require('./middleware');

const router = express.Router();

// ✅ Place a new order (from user's cart)
router.post('/place', protectRoute, async (req, res) => {
  const db = await getDb();

  try {
    const userId = new ObjectId(req.user.id);

    // Fetch the cart
    const cart = await db.collection('carts').findOne({ userId });

    if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    // Fetch product details and calculate total
    const populatedItems = await Promise.all(
      cart.items.map(async (item) => {
        const product = await db.collection('products').findOne({ _id: new ObjectId(item.productId) });

        if (!product) {
          throw new Error(`Product with ID ${item.productId} not found`);
        }

        return {
          productId: product._id,
          name: product.name,
          price: product.price,
          quantity: item.quantity,
          total: product.price * item.quantity,
        };
      })
    );

    const orderTotal = populatedItems.reduce((sum, item) => sum + item.total, 0);

    // Create order
    const order = {
      userId,
      items: populatedItems,
      totalAmount: orderTotal,
      status: 'placed',
      createdAt: new Date(),
    };

    const result = await db.collection('orders').insertOne(order);

    // Clear the user's cart
    await db.collection('carts').deleteOne({ userId });

    res.status(201).json({ message: 'Order placed successfully', orderId: result.insertedId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to place order', error: err.message });
  }
});

// ✅ Get all orders for the logged-in user
router.get('/', protectRoute, async (req, res) => {
  const db = await getDb();

  try {
    const userId = new ObjectId(req.user.id);

    const orders = await db
      .collection('orders')
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch orders', error: err.message });
  }
});

// ✅ Get specific order by ID
router.get('/:id', protectRoute, async (req, res) => {
  const db = await getDb();

  try {
    const userId = new ObjectId(req.user.id);
    const orderId = new ObjectId(req.params.id);

    const order = await db.collection('orders').findOne({ _id: orderId, userId });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch order', error: err.message });
  }
});

// ✅ Cancel an order
router.post('/cancelorder', protectRoute, async (req, res) => {
  const db = await getDb();

  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ message: 'Order ID is required' });
    }

    const userId = new ObjectId(req.user.id);

    const order = await db.collection('orders').findOne({
      _id: new ObjectId(orderId),
      userId,
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Restore product stock
    for (const item of order.items) {
      await db.collection('products').updateOne(
        { _id: new ObjectId(item.productId) },
        { $inc: { stock: item.quantity } }
      );
    }

    // Delete the order
    await db.collection('orders').deleteOne({ _id: new ObjectId(orderId) });

    res.status(200).json({ message: 'Order canceled successfully', orderId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error canceling order', error: err.message });
  }
});

module.exports = router;


