import { Schema, model } from 'mongoose';

const announcementSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true // Added for consistency
    },
    message: {
        type: String,
        required: true,
        trim: true // Added for consistency
    },
    audience: {
        type: String,
        enum: ['students', 'teachers', 'parents', 'teachers_parents', 'students_parents', 'all'],
        required: true
    },
    instituteId: {
        type: Schema.Types.ObjectId,
        ref: 'Admin',
        required: true // Aligned with other schemas
    }
}, { timestamps: true });

// Adding individual indexes
announcementSchema.index({ instituteId: 1 }); // Index on instituteId
announcementSchema.index({ title: 1 }); // Index on title
announcementSchema.index({ audience: 1 }); // Index on audience

// Adding a compound index for instituteId and audience
announcementSchema.index({ instituteId: 1, audience: 1 }); // Optimizes queries for announcements by audience and institute

// Creating the Announcement model
export const Announcement = model('Announcement', announcementSchema);