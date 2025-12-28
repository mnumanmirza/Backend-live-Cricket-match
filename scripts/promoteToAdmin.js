const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const connectDB = require('../config/db');
const userModel = require('../models/userModel');

async function promote(userIdentifier) {
  await connectDB();
  // allow passing either id or email
  const query = userIdentifier.includes('@') ? { email: userIdentifier } : { _id: userIdentifier };
  const user = await userModel.findOne(query);
  if (!user) {
    console.error('User not found for', userIdentifier);
    process.exit(1);
  }
  // update without triggering validators (in case some required fields are missing)
  const updated = await userModel.findByIdAndUpdate(user._id, { role: 'ADMIN' }, { new: true, runValidators: false });
  console.log('Promoted user to ADMIN:', updated._id.toString(), updated.email);
  process.exit(0);
}

const arg = process.argv[2];
if (!arg) {
  console.error('Usage: node promoteToAdmin.js <userId|email>');
  process.exit(1);
}

promote(arg).catch(err => {
  console.error('Error promoting user:', err);
  process.exit(1);
});
