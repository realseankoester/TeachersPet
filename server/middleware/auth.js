const jwt = require('jsonwebtoken');

const jwtSecret = process.env.JWT_SECRET;

const auth = (req, res, next) => {
    const token = req.header('x-auth-token');

    if (!token) {
        console.log('AUTH MIDDLEWARE DEBUG: No token found! Request to: ', req.originalUrl);
        return res.status(401).json({msg: 'Invalid token, authorization denied'})
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;
        console.log('AUTH MIDDLEWARE DEBUG: Token verified for user ID:', req.user.id, 'Request to:', req.originalUrl);
        next();
    } catch (err) {
        console.log('AUTH MIDDLEWARE DEBUG: Token verification failed:', err.message, 'Request to:', req.originalUrl);
        res.status(401).json({ msg: 'Token is invalid'})
    }
};

module.exports = auth;