// Backend/controller/user/passwordController.js
const userModel = require('../../models/userModel');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const UserOTP = require('../../models/userOTPModel');

// Lazy-load Resend only when needed to avoid startup crashes without API key
function getResend() {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn('RESEND_API_KEY not set. Password reset emails will be disabled.');
      return null;
    }
    const { Resend } = require('resend');
    return new Resend(apiKey);
  } catch (e) {
    console.warn('Resend not available or failed to initialize. Password reset emails will be disabled.');
    return null;
  }
}

// OTP Sender for Password Reset
async function sendPasswordResetOTP(email) {
    try {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

        // Get user name
        const user = await userModel.findOne({ email });
        if (!user) {
            throw new Error("User not found");
        }

        const name = user.name || "User";

        await UserOTP.findOneAndUpdate(
            { email },
            { otp, expiresAt },
            { upsert: true, new: true }
        );

        const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  </head>
  <body style="margin: 0; padding: 0; font-family: 'Inter', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f5f5f5">
      <tr>
        <td align="center" style="padding: 40px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
            <!-- Header -->
            <tr>
              <td bgcolor="#4f46e5" style="padding: 30px; text-align: center;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center">
                      <div style="display: inline-block; background-color: white; border-radius: 12px; padding: 12px; margin-bottom: 16px;">
                        <span style="font-size: 24px; color: #4f46e5;">🔐</span>
                      </div>
                      <h1 style="color: white; font-size: 24px; font-weight: 700; margin: 0 0 8px 0;">Password Reset Request</h1>
                      <p style="color: rgba(255, 255, 255, 0.8); font-size: 16px; margin: 0;">Secure your account</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
            <!-- Content -->
            <tr>
              <td style="padding: 32px;">
                <h2 style="font-size: 18px; font-weight: 600; color: #374151; margin: 0 0 16px 0;">Hello ${name},</h2>
                <p style="font-size: 16px; line-height: 1.5; color: #6b7280; margin: 0 0 24px 0;">
                  We received a request to reset your password. Use the verification code below to complete the process:
                </p>
                
                <!-- OTP Code -->
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" style="padding: 0 0 24px 0;">
                      <div style="background-color: #f9fafb; border-radius: 8px; padding: 24px; border: 1px solid #e5e7eb;">
                        <p style="font-size: 14px; color: #6b7280; font-weight: 500; margin: 0 0 12px 0;">Your verification code:</p>
                        <div style="display: flex; justify-content: center; gap: 8px;">
                          ${otp.split("").map(d => `
                            <div style="width: 48px; height: 56px; background: #ffffff; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 700; color: #4f46e5; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); border: 1px solid #e5e7eb;">${d}</div>
                          `).join("")}
                        </div>
                        <p style="font-size: 14px; color: #ef4444; font-weight: 500; margin: 16px 0 0 0;">
                          ⏱ This code expires in 15 minutes
                        </p>
                      </div>
                    </td>
                  </tr>
                </table>
                
                <p style="font-size: 14px; line-height: 1.5; color: #6b7280; margin: 0 0 24px 0;">
                  If you didn't request this code, please ignore this email and your password will remain unchanged.
                </p>
                
                <!-- Security Tip -->
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 6px;">
                      <p style="font-size: 14px; color: #92400e; margin: 0;">
                        <span style="font-weight: 600;">💡 Security tip:</span> Never share this code with anyone. Our team will never ask for it.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
            <!-- Footer -->
            <tr>
              <td bgcolor="#f9fafb" style="padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="font-size: 12px; color: #6b7280; margin: 0 0 8px 0;">
                  © 2025 Muhammad Numan Akbar. All rights reserved.
                </p>
                <p style="font-size: 12px; color: #6b7280; margin: 0 0 8px 0;">
                  This email was sent to <strong>${email}</strong>
                </p>
                <p style="font-size: 12px; color: #6b7280; margin: 0 0 8px 0;">
                  Block 5, Chichawatni, PB 57200
                </p>
                <p style="font-size: 12px; color: #6b7280; margin: 0;">
                  Need help? <a href="mailto:support@darulumeed.com" style="color: #4f46e5; text-decoration: none; font-weight: 500;">Contact Support</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>`;

        const resend = getResend();
        if (!resend) {
          console.warn('Skipping password reset email: Resend not configured');
          return true;
        }

        const { data, error } = await resend.emails.send({
            from: 'Muhammad Numan <no-reply@darulumeed.com>',
            to: email,
            subject: 'Password Reset Verification Code',
            html,
        });

        if (error) {
            console.error("Resend error:", error);
            throw new Error("Failed to send OTP: " + error.message);
        }

        console.log("Email sent successfully:", data);
        return true;
    } catch (err) {
        console.error("Error in sendPasswordResetOTP:", err);
        throw err;
    }
}

// Verify OTP for password reset
async function verifyPasswordResetOTP(email, otp) {
    try {
        const otpRecord = await UserOTP.findOne({ email });

        if (!otpRecord) throw new Error("No OTP requested for this email");
        if (otpRecord.expiresAt < new Date()) throw new Error("OTP has expired");
        if (otpRecord.otp !== otp) throw new Error("Invalid OTP");

        await UserOTP.deleteOne({ email });
        return true;
    } catch (error) {
        console.error("Error in verifyPasswordResetOTP:", error);
        throw error;
    }
}

// Reset Password Controller
async function resetPasswordController(req, res) {
    try {
        const { email, newPassword } = req.body;

        if (!email || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Email and new password are required"
            });
        }

        // Find user by email
        const user = await userModel.findOne({ email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password
        user.password = hashedPassword;
        await user.save();

        res.status(200).json({
            success: true,
            message: "Password reset successfully"
        });

    } catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to reset password"
        });
    }
}

// Send OTP for password reset
async function sendPasswordResetOTPController(req, res) {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        // Check if user exists
        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        await sendPasswordResetOTP(email);

        res.json({
            success: true,
            message: "OTP sent successfully"
        });
    } catch (error) {
        console.error("Send OTP error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to send OTP"
        });
    }
}

// Verify OTP for password reset
async function verifyPasswordResetOTPController(req, res) {
    try {
        const { email, otp } = req.body;
        await verifyPasswordResetOTP(email, otp);

        res.json({
            success: true,
            message: "OTP verified successfully"
        });
    } catch (error) {
        console.error("Verify OTP error:", error);
        res.status(400).json({
            success: false,
            message: error.message || "Failed to verify OTP"
        });
    }
}

module.exports = {
    resetPasswordController,
    sendPasswordResetOTPController,
    verifyPasswordResetOTPController
};