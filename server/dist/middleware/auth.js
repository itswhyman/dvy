import jwt from 'jsonwebtoken';
export function signToken(payload) {
    const secret = process.env.JWT_SECRET || 'dev-secret-change-me';
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    return jwt.sign(payload, secret, { expiresIn });
}
export function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        res.status(401).json({ success: false, error: 'Authentication required.' });
        return;
    }
    try {
        const token = header.slice(7);
        const secret = process.env.JWT_SECRET || 'dev-secret-change-me';
        const decoded = jwt.verify(token, secret);
        req.user = decoded;
        next();
    }
    catch {
        res.status(401).json({ success: false, error: 'Invalid or expired token.' });
    }
}
export function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Authentication required.' });
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json({ success: false, error: 'Insufficient permissions.' });
            return;
        }
        next();
    };
}
export function optionalAuth(req, _res, next) {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
        try {
            const secret = process.env.JWT_SECRET || 'dev-secret-change-me';
            req.user = jwt.verify(header.slice(7), secret);
        }
        catch {
            /* ignore */
        }
    }
    next();
}
