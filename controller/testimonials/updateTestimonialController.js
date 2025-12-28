const Testimonial = require('../../models/testimonialsModel');

const updateTestimonialController = async (req, res) => {
    try {
        const { id } = req.params;
        const { message, rating } = req.body;
        const userRole = req.user?.role;
        const userEmail = req.user?.email;

        // Find the testimonial
        const testimonial = await Testimonial.findById(id);

        if (!testimonial) {
            return res.status(404).json({
                message: "Testimonial not found",
                success: false,
                error: true
            });
        }

        // Check if user is admin (case-insensitive) or the testimonial owner
        const isAdmin = String(userRole || '').toLowerCase() === 'admin';
        // Allow specific admin email as fallback (in case role normalization differs)
        const adminEmail = 'numanmirza19@gmail.com';
        const isAdminByEmail = String(userEmail || '').toLowerCase() === adminEmail.toLowerCase();
        if (!isAdmin && String(userEmail || '').toLowerCase() !== String(testimonial.email || '').toLowerCase() && !isAdminByEmail) {
            return res.status(403).json({
                message: "You can only edit your own testimonials",
                success: false,
                error: true
            });
        }

        // Update the testimonial
        const updatedTestimonial = await Testimonial.findByIdAndUpdate(
            id,
            { message, rating },
            { new: true, runValidators: true }
        );

        return res.status(200).json({
            message: "Testimonial updated successfully!",
            success: true,
            error: false,
            testimonial: updatedTestimonial
        });

    } catch (err) {
        console.error("Update Testimonial Error:", err);

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

module.exports = updateTestimonialController;