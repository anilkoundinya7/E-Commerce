// Required modules
const express = require('express');
const dotenv = require('dotenv');
const { connectDB } = require('./db');
const userRoutes = require('./users');
const orderRoutes = require('./order');
const productRoutes = require('./products');
const cartRoutes = require('./cart');
const cookieParser = require('cookie-parser');
const exphbs = require('express-handlebars');
const path = require('path');
const { errorHandler, protectRoute, isAdmin } = require('./middleware');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// ✅ Static folder for serving uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Handlebars setup
app.engine('hbs', exphbs.engine({
  extname: 'hbs',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views/layouts'),
  partialsDir: path.join(__dirname, 'views/partials'),
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Routes to render pages
app.get('/register', (req, res) => {
  res.render('register', { layout: 'main', hideHeader: true, title: 'SignUp' });
});

app.get('/login', (req, res) => {
  res.render('login', { layout: 'main', hideHeader: true, title: 'Login' });
});

// ✅ Now connect DB and mount API routes
connectDB().then(() => {
  app.use('/api/users', userRoutes);
  app.use('/api/products', productRoutes); // includes your /view route
  app.use('/api/cart', cartRoutes);
  app.use('/api/orders', orderRoutes);

  // Error handler
  app.use(errorHandler);

  // Start server
  app.listen(PORT, () =>
    console.log(`🚀 Server running on http://localhost:${PORT}`)
  );
});
