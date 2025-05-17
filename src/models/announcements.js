import { Schema, model } from 'mongoose';

const announcementSchema = new Schema({
    title: {
        type: String,
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    audience: {
        type: String,
        enum: ['students', 'teachers', 'parents', 'teachers_parents', 'students_parents', 'all'],
        required: true,
    },
    instituteId: {
        type: Schema.Types.ObjectId,
        ref: 'Admin',
    }
}, { timestamps: true });

export const Announcement = model('Announcement', announcementSchema);
