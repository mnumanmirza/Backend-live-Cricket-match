const mongoose = require('mongoose');
require('dotenv').config();
const userModel = require('../models/userModel');

async function run() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI missing in .env');
    await mongoose.connect(uri);
    console.log('Connected to DB');

    const userId = process.argv[2] || '695100b459bfcc4afd1fa8a5';
    const user = await userModel.findByIdAndUpdate(userId, { role: 'ADMIN' }, { new: true });
    if (!user) {
      console.error('User not found:', userId);
      process.exit(1);
    }
    console.log('Updated user:', user.email, '-> role:', user.role);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
