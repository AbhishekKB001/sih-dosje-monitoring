const jwt = require("jsonwebtoken");

function generateToken(user) {
    return jwt.sign(
        {
            userId: user.id,
            role: user.role,
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "24h",
        }
    );
}

function verifyToken(token) {
    return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = {
    generateToken,
    verifyToken,
};