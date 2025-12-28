const jwt = require('jsonwebtoken');
const userModel = require('../../models/userModel');

async function refreshTokenController(req, res) {
  try {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ success: false, error: true, message: 'No token' });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.TOKEN_SECRET_KEY);
    } catch (err) {
      return res.status(401).json({ success: false, error: true, message: 'Invalid token' });
    }

    const user = await userModel.findById(decoded._id).lean();
    if (!user) return res.status(404).json({ success: false, error: true, message: 'User not found' });

    const tokenData = {
      _id: user._id,
      email: user.email,
      name: user.name,
      avatar: user.profilePic,
      role: user.role,
    };

    const newToken = jwt.sign(tokenData, process.env.TOKEN_SECRET_KEY, { expiresIn: 60 * 60 * 24 });

    const tokenOption = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
      domain: process.env.COOKIE_DOMAIN || undefined,
      maxAge: 24 * 60 * 60 * 1000,
    };

    res.cookie('token', newToken, tokenOption).status(200).json({ success: true, error: false, data: { user } });
  } catch (err) {
    console.error('refreshToken error:', err);
    res.status(500).json({ success: false, error: true, message: err.message || 'Failed to refresh token' });
  }
}

module.exports = refreshTokenController;
