import mongoose from 'mongoose';

export const connectDB = async () => {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/school');
        console.log('✅ MongoDB Connected Successfully');
    } catch (error) {
        console.error(`❌ Database Connection Error: ${error.message}`);
        process.exit(1); // Exit the app if DB connection fails
    }
};
