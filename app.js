
const express = require('express');
const dotenv = require('dotenv');
const {connectDB, getDb} = require('./db');
const userRoutes= require("./users");
dotenv.config(); // Load .env variables
const orderRoutes = require('./order');
const productRoutes = require('./products');


const {
  //errorHandler,
  protectRoute,
  isAdmin,
}=require('./middleware')
//const { errorHandler } = require('./middleware'); // Import it

// Use after all route definitions
const cartRoutes = require('./cart');
const app = express();
const PORT = process.env.PORT || 5000;
//app.use(errorHandler);
app.use(express.json()); // For parsing JSON requests

// Connect to DB and start server
connectDB().then(async() => {
   // Make db available in routes via req.app.locals.db

  // Routes
  app.use('/api/users', userRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/cart',protectRoute, cartRoutes); 
  app.use('/api/orders', protectRoute, orderRoutes);
  // Start server

  //app.use(errorHandler); 
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
});
