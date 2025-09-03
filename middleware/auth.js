const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
    let token = req.header('x-auth-token');

    // Check for Authorization header as well
    if (!token && req.headers.authorization) {
        token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (e) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

module.exports = auth;
