const express = require('express');
const router = express.Router();

// ✅ Multer for profilePic upload
const multer = require('multer');
const upload = multer(); // buffer-based memory storage

// ✅ Middleware
const authToken = require("../middleWare/authtoken");

// ✅ User Controllers
const {
  userSignUpController,
  sendOTPController,
  verifyOTPController
} = require("../controller/user/userSignUpController");

const userSignInController = require("../controller/user/userSignin");
const userDetailsController = require("../controller/user/userDetails");
const userLogout = require("../controller/user/userLogout");

// ✅ Password Controller
const {
  resetPasswordController,
  sendPasswordResetOTPController,
  verifyPasswordResetOTPController
} = require("../controller/user/PasswordController");

// ✅ Testimonial Controllers
const addTestimonialController = require("../controller/testimonials/addTestimonialController");
const getAllTestimonialsController = require("../controller/testimonials/getAllTestimonialsController");
const updateTestimonialController = require("../controller/testimonials/updateTestimonialController");
const deleteTestimonialController = require("../controller/testimonials/deleteTestimonialController");

// ✅ Project Controllers
const {
  getProjects,
  addProject,
  deleteProject,
  updateProject
} = require("../controller/projects/projectController");

// ✅ User Update Controller (profile update)
const updateUser = require("../controller/user/updateUser");
// ✅ Admin Users Controller
const allUsersController = require("../controller/user/allUser");
const changeUserRole = require("../controller/user/changeUserRole");
const refreshTokenController = require("../controller/user/refreshTokenController");

// ✅ User Routes
router.post("/signup", upload.single("profilePic"), userSignUpController);
router.post("/signin", userSignInController);
router.get("/user-details", authToken, userDetailsController);
router.get("/userLogout", userLogout);
// profile update (allows profilePic upload and password change)
router.post("/update-user", authToken, upload.single("profilePic"), updateUser);
// ✅ Admin: list all users
router.get("/all-users", allUsersController);
// Refresh token (re-issue based on DB user)
router.post('/refresh-token', refreshTokenController);
// ✅ Admin: change user role
router.put('/user/:id/role', authToken, changeUserRole);

// ✅ OTP Routes (for signup)
router.post("/send-otp", sendOTPController);
router.post("/verify-otp", verifyOTPController);

// ✅ Password Reset Routes
router.post("/send-password-reset-otp", sendPasswordResetOTPController);
router.post("/verify-password-reset-otp", verifyPasswordResetOTPController);
router.post("/reset-password", resetPasswordController);

// ✅ Testimonial Routes
// Accept optional avatar image for admin reviews
router.post("/addtestimonial", authToken, upload.single("avatar"), addTestimonialController);
router.get("/testimonials", getAllTestimonialsController);
router.put("/update-testimonial/:id", authToken, updateTestimonialController);
router.delete("/delete-testimonial/:id", authToken, deleteTestimonialController);

// ✅ Project Routes
router.get("/projects", getProjects);
// accept multiple images field named 'images' and videos field named 'videos'
router.post("/projects", authToken, upload.fields([{ name: 'images' }, { name: 'videos' }]), addProject);
router.put("/projects/:id", authToken, upload.fields([{ name: 'images' }, { name: 'videos' }]), updateProject);
router.delete("/projects/:id", authToken, deleteProject);

module.exports = router;
