const jwt = require('jsonwebtoken');

// Auth middleware to protect routes (verify JWT from cookie)
function protectRoute(req, res, next) {
  const token = req.cookies.token;  // ✅ Read token from cookie

  // if (!token) {
  //   return res.status(401).json({ message: 'No token provided' });
  // }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // decoded = { id, isAdmin, iat, exp }
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
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: err.message || 'Internal Server Error',
  });
};

module.exports = {
  errorHandler,
  protectRoute,
  isAdmin
};




