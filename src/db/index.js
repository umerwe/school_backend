import mongoose from 'mongoose';

export const connectDB = async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URL}/${process.env.DB_NAME}`);
        console.log('✅ MongoDB Connected Successfully');
    } catch (error) {
        console.error(`❌ Database Connection Error: ${error.message}`);
        process.exit(1); // Exit the app if DB connection fails
    }
};
