const jwt = require('jsonwebtoken');



 // Error handling middleware (for centralized error responses)
// function errorHandler(err, req, res, next) {
//   console.error(err.stack);
//   res.status(err.statusCode || 500).json({
//     success: false,
//     message: err.message || 'Internal Server Error',
//   });
// }

// Auth middleware to protect routes (verify JWT)
function protectRoute(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // now you can access req.user in your routes
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// Optional: check if user is admin
function isAdmin(req, res, next) {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ message: 'Access denied: Admins only' });
  }
  next();
}

module.exports = {
  //errorHandler,
  protectRoute,
  isAdmin,
};
