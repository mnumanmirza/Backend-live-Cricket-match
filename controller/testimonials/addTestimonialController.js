const Testimonial = require('../../models/testimonialsModel');
const { uploadImageToCloudinary } = require('../user/uploadController');

const addTestimonialController = async (req, res) => {
  try {
    const { message, rating, name: bodyName, avatar: bodyAvatar } = req.body;

    // Validate input
    if (!message || !rating) {
      return res.status(400).json({
        message: "Message and rating are required.",
        success: false,
        error: true
      });
    }

    // Use user info from token middleware as default
    let name = req.user?.name || "Anonymous";
    const email = req.user?.email || "";
    let avatar = req.user?.avatar || "";

    // If the requester is an admin, allow overriding name/avatar from request body
    const isAdmin = req.user?.role === 'admin' || req.user?.email === 'numanmirza19@gmail.com';
    if (isAdmin) {
      if (bodyName) name = bodyName;
      if (bodyAvatar) avatar = bodyAvatar;
    }

    // If an avatar file is provided, upload to Cloudinary and use its URL
    if (req.file && req.file.buffer) {
      try {
        const uploadRes = await uploadImageToCloudinary(req.file.buffer);
        if (uploadRes?.secure_url) {
          avatar = uploadRes.secure_url;
        }
      } catch (cloudErr) {
        console.error('Cloudinary upload error (testimonial avatar):', cloudErr);
        // Continue without blocking; avatar remains as previously resolved
      }
    }

    // Create testimonial with resolved data
    const newTestimonial = new Testimonial({
      name,
      email,
      avatar,
      message,
      rating,
    });

    await newTestimonial.save();

    return res.status(201).json({
      message: "Testimonial submitted successfully!",
      success: true,
      error: false,
      testimonial: newTestimonial
    });

  } catch (err) {
    console.error("Submit Testimonial Error:", err);

    // Handle validation errors
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        message: `Validation Error: ${err.message}`,
        success: false,
        error: true
      });
    }

    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
      error: true,
    });
  }
};

module.exports = addTestimonialController;