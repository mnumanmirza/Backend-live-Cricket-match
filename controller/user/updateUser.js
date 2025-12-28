const userModel = require("../../models/userModel");
const { uploadImageToCloudinary } = require("./uploadController");
const bcrypt = require("bcryptjs");

async function updateUser(req, res) {
    try {
        const sessionUser = req.userId;

        const { userId, email, name, role, currentPassword, newPassword } = req.body;

        const payload = {
            ...(email && { email: email }),
            ...(name && { name: name }),
            ...(role && { role: role }),
        };

        // handle profile picture upload if present
        if (req.file && req.file.buffer) {
            try {
                const uploadRes = await uploadImageToCloudinary(req.file.buffer);
                if (uploadRes && uploadRes.secure_url) {
                    payload.profilePic = uploadRes.secure_url;
                }
            } catch (uploadErr) {
                console.error("Profile pic upload failed:", uploadErr);
                return res.status(500).json({ success: false, message: "Profile picture upload failed" });
            }
        }

        // handle password change
        if (currentPassword && newPassword) {
            const user = await userModel.findById(sessionUser).select("password");
            if (!user) return res.status(404).json({ success: false, message: "User not found" });

            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) return res.status(400).json({ success: false, message: "Current password is incorrect" });

            const salt = await bcrypt.genSalt(10);
            const hashed = await bcrypt.hash(newPassword, salt);
            payload.password = hashed;
        }

        const targetUserId = userId || sessionUser;

        const updatedUser = await userModel.findByIdAndUpdate(targetUserId, payload, { new: true, runValidators: true });

        res.json({
            data: updatedUser,
            message: "User Updated",
            success: true,
            error: false,
        });
    } catch (err) {
        console.error("Update user error:", err);
        res.status(400).json({
            message: err.message || err,
            error: true,
            success: false,
        });
    }
}

module.exports = updateUser;