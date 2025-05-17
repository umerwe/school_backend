import mongoose from 'mongoose';

export const connectDB = async () => {
    try {
        const mongoUrl = process.env.NODE_ENV === 'production'
            ? process.env.MONGODB_URL_PROD
            : process.env.MONGODB_URL_LOCAL;

        const conn = await mongoose.connect(`${mongoUrl}/${process.env.DB_NAME}`);
        
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ MongoDB Connection Error: ${error.message}`);
        process.exit(1);
    }
};