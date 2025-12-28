const Testimonial = require("../../models/testimonialsModel");

const deleteTestimonial = async (req, res) => {
  try {
    const testimonialId = req.params.id;
    const userRole = req.user?.role;
    const userEmail = req.user?.email;

    // Find the testimonial first
    const testimonial = await Testimonial.findById(testimonialId);

    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: "Testimonial not found"
      });
    }

    // Check if user is admin (case-insensitive) or the testimonial owner
    const isAdmin = String(userRole || '').toLowerCase() === 'admin';
    const adminEmail = 'numanmirza19@gmail.com';
    const isAdminByEmail = String(userEmail || '').toLowerCase() === adminEmail.toLowerCase();
    if (!isAdmin && String(testimonial.email || '').toLowerCase() !== String(userEmail || '').toLowerCase() && !isAdminByEmail) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own testimonials"
      });
    }

    await Testimonial.findByIdAndDelete(testimonialId);
    res.status(200).json({
      success: true,
      message: "Testimonial deleted successfully"
    });
  } catch (error) {
    console.error("Delete testimonial error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete testimonial",
      error: error.message
    });
  }
};

module.exports = deleteTestimonial;