// controller/projectController.js
const Project = require('../../models/ProjectModel');
const jwt = require('jsonwebtoken');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

// Configure Cloudinary (make sure to set environment variables)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Get all projects - ordered by `position` ascending
exports.getProjects = async (req, res) => {
    try {
        // By default return only active projects to public users
        let showAll = false;

        // Prefer `req.user` if auth middleware ran; otherwise fall back to verifying token from cookie.
        if (req.user && req.user.email === 'numanmirza19@gmail.com') {
            showAll = true;
        } else {
            try {
                const token = req.cookies?.token;
                if (token) {
                    const decoded = jwt.verify(token, process.env.TOKEN_SECRET_KEY);
                    if (decoded && decoded.email === 'numanmirza19@gmail.com') {
                        showAll = true;
                    }
                }
            } catch (e) {
                // ignore token errors and treat as guest
                showAll = false;
            }
        }

        // Public/non-admin: show projects explicitly active or missing the `active` field (backward compatibility)
        const filter = showAll ? {} : { $or: [ { active: true }, { active: { $exists: false } } ] };
        const projects = await Project.find(filter).sort({ position: 1, createdAt: -1 });
        res.json(projects);
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching projects'
        });
    }
};

// Add new project with image upload
exports.addProject = async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.email !== 'numanmirza19@gmail.com') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin only.'
            });
        }

        const { name, month, year, link, description, active, align: requestedAlign } = req.body;

        // Check if files were uploaded
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one project image is required'
            });
        }

        // helper: upload buffer to cloudinary using upload_stream
        const uploadBufferToCloudinary = (buffer, resourceType = 'image') => {
            return new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream({ folder: 'projects', resource_type: resourceType }, (error, result) => {
                    if (error) return reject(error);
                    resolve(result);
                });
                streamifier.createReadStream(buffer).pipe(uploadStream);
            });
        };

        // Collect image and video files from multer
        let imageFiles = [];
        let videoFiles = [];
        if (Array.isArray(req.files)) {
            // legacy: all files in single array -> treat all as images by default
            imageFiles = req.files;
        } else if (req.files && typeof req.files === 'object') {
            imageFiles = req.files.images || [];
            videoFiles = req.files.videos || [];
        }

        // Upload images and videos in parallel
        const uploadedImages = await Promise.all((imageFiles || []).map(file => uploadBufferToCloudinary(file.buffer, 'image')));
        const imageUrls = (uploadedImages || []).map(r => r.secure_url);
        const uploadedVideos = await Promise.all((videoFiles || []).map(file => uploadBufferToCloudinary(file.buffer, 'video')));
        const videoUrls = (uploadedVideos || []).map(r => r.secure_url);

        // Determine alignment: use provided align if given, otherwise alternate
        const projectsCount = await Project.countDocuments();
        let align = requestedAlign;
        if (!align) {
            align = projectsCount % 2 === 0 ? 'left' : 'right';
        }

        // Compose year string from month+year if provided
        const yearString = month ? `${month} ${year}` : year;

        // Position handling: if position provided, insert at that position and shift others
        let position = parseInt(req.body.position, 10);
        if (!position || position <= 0) {
            position = projectsCount + 1; // append to end
        } else {
            // shift existing projects at or after this position
            await Project.updateMany({ position: { $gte: position } }, { $inc: { position: 1 } });
        }

        // Create new project (store first image in `image` for compatibility)
        const project = new Project({
            name,
            year: yearString,
            description: description || '',
            active: typeof active !== 'undefined' ? (active === 'true' || active === true) : true,
            align,
            image: imageUrls[0] || '',
            images: imageUrls,
            video: videoUrls[0] || '',
            videos: videoUrls,
            link,
            position
        });

        const savedProject = await project.save();
        res.status(201).json({
            success: true,
            project: savedProject
        });
    } catch (error) {
        console.error('Error adding project:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Delete project
exports.deleteProject = async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.email !== 'numanmirza19@gmail.com') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin only.'
            });
        }

        const project = await Project.findByIdAndDelete(req.params.id);
        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        res.json({
            success: true,
            message: 'Project deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update project
exports.updateProject = async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.email !== 'numanmirza19@gmail.com') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin only.'
            });
        }

        const projectId = req.params.id;
        const { name, month, year, link, align, position, description, active } = req.body;

        const updateData = {};
        if (name) updateData.name = name;
        if (link) updateData.link = link;
        // allow explicit align override
        if (align) updateData.align = align;

        // Compose year string if month provided
        if (year || month) {
            updateData.year = month ? `${month} ${year}` : year;
        }

        // Description update (allow empty string if provided)
        if (typeof description !== 'undefined') {
            updateData.description = description;
        }

        // Active flag update (allow false)
        if (typeof active !== 'undefined') {
            updateData.active = (active === 'true' || active === true);
        }

        // If new files were uploaded, upload them and replace images/videos
        if (req.files && (Array.isArray(req.files) ? req.files.length > 0 : Object.keys(req.files).length > 0)) {
            const uploadBufferToCloudinary = (buffer, resourceType = 'image') => {
                return new Promise((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream({ folder: 'projects', resource_type: resourceType }, (error, result) => {
                        if (error) return reject(error);
                        resolve(result);
                    });
                    streamifier.createReadStream(buffer).pipe(uploadStream);
                });
            };

            let imageFiles = [];
            let videoFiles = [];
            if (Array.isArray(req.files)) {
                imageFiles = req.files;
            } else {
                imageFiles = req.files.images || [];
                videoFiles = req.files.videos || [];
            }

            if ((imageFiles || []).length > 0) {
                const uploadResults = await Promise.all(imageFiles.map(file => uploadBufferToCloudinary(file.buffer, 'image')));
                const imageUrls = uploadResults.map(r => r.secure_url);
                updateData.images = imageUrls;
                updateData.image = imageUrls[0] || '';
            }

            if ((videoFiles || []).length > 0) {
                const uploadResults = await Promise.all(videoFiles.map(file => uploadBufferToCloudinary(file.buffer, 'video')));
                const videoUrls = uploadResults.map(r => r.secure_url);
                updateData.videos = videoUrls;
                updateData.video = videoUrls[0] || '';
            }
        }

        // Handle position change if provided
        if (typeof position !== 'undefined') {
            const newPos = parseInt(position, 10);
            if (!isNaN(newPos)) {
                // get current project to determine old position
                const current = await Project.findById(projectId);
                const oldPos = current?.position || (await Project.countDocuments());

                if (newPos !== oldPos) {
                    if (newPos < oldPos) {
                        // move up: increment positions in [newPos, oldPos-1]
                        await Project.updateMany({ position: { $gte: newPos, $lt: oldPos } }, { $inc: { position: 1 } });
                    } else {
                        // move down: decrement positions in (oldPos, newPos]
                        await Project.updateMany({ position: { $gt: oldPos, $lte: newPos } }, { $inc: { position: -1 } });
                    }
                    updateData.position = newPos;
                }
            }
        }

        const updated = await Project.findByIdAndUpdate(projectId, updateData, { new: true });
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        res.json({ success: true, project: updated });
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};