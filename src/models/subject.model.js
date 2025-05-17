import { Schema, model } from "mongoose";

const subjectSchema = new Schema({
    subjectName: {
        type: String,
        required: true,
        enum: ['Maths', 'English', 'Urdu', 'Science', 'Socialstudies', 'Arts', 'Physics', 'Chemistry', 'Computer', 'Pakstudies', 'Islamiat'],
        trim: true,
    },
    section: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        enum: ['A', 'B', 'C', 'D', 'E']
    },
    classTitle: {
        type: Number,
        required: true
    },
    subjectTeacher: {
        type: Schema.Types.ObjectId,
        ref: 'Teacher',  // Reference to a Teacher model
        required: true
    },
    instituteId: {
        type: Schema.Types.ObjectId,
        ref: 'Admin',
    }
}, { timestamps: true });

export const Subject = model('Subject', subjectSchema);
