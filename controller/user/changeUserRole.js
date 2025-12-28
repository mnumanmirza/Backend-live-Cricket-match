const userModel = require('../../models/userModel');

async function changeUserRole(req, res) {
  try {
    // authToken sets req.user with role
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: true, message: 'Admin only' });
    }

    const userId = req.params.id;
    const { role } = req.body;

    if (!userId || !role) {
      return res.status(400).json({ success: false, error: true, message: 'User id and role are required' });
    }

    const allowed = ['ADMIN', 'GENERAL'];
    if (!allowed.includes(role)) {
      return res.status(400).json({ success: false, error: true, message: 'Invalid role' });
    }

    const updated = await userModel.findByIdAndUpdate(userId, { role }, { new: true });
    if (!updated) return res.status(404).json({ success: false, error: true, message: 'User not found' });

    res.json({ success: true, error: false, message: 'Role updated', data: updated });
  } catch (err) {
    console.error('changeUserRole error:', err);
    res.status(500).json({ success: false, error: true, message: err.message || 'Failed to change role' });
  }
}

module.exports = changeUserRole;
