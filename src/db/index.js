import mongoose from 'mongoose';

export const connectDB = async () => {
    try {
        if (mongoose.connection.readyState === 0) { // Only connect if not already connected
            await mongoose.connect(`${process.env.MONGODB_URL}/${process.env.DB_NAME}`);
            console.log('✅ MongoDB Connected Successfully');
        }
    } catch (error) {
        console.error(`❌ Database Connection Error: ${error.message}`);
        throw error; // Re-throw to handle in the calling function
    }
};
