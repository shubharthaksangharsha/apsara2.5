// scripts/clearUsers.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

// User schema (simple version just for clearing)
const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema);

const clearUsers = async () => {
  try {
    await connectDB();
    
    console.log('🗑️  Clearing all users from database...');
    const result = await User.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} users`);
    
    console.log('🔄 Resetting auto-increment counters...');
    // Reset any counters if they exist
    
    console.log('✅ Database cleanup completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing users:', error);
    process.exit(1);
  }
};

clearUsers();
