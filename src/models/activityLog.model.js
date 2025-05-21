import { Schema, model } from 'mongoose';

const activityLogSchema = new Schema({
    instituteId: {
        type: Schema.Types.ObjectId,
        ref: 'Admin', // Aligned with other schemas
        required: true
    },
    action: {
        type: String,
        required: true,
        trim: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    details: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Adding individual indexes
activityLogSchema.index({ instituteId: 1 }); // Index on instituteId
activityLogSchema.index({ date: -1 }); // Index on date for sorting by recency

// Adding a compound index for instituteId and date
activityLogSchema.index({ instituteId: 1, date: -1 }); // Optimizes queries for logs by institute, sorted by recency

// Creating the ActivityLog model
export const ActivityLog = model('ActivityLog', activityLogSchema);