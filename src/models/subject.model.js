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
        required: true,
        enum: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] // Align with classSchema
    },
    subjectTeacher: {
        type: Schema.Types.ObjectId,
        ref: 'Teacher',  // Reference to a Teacher model
        required: true
    },
    instituteId: {
        type: Schema.Types.ObjectId,
        ref: 'Admin',
        required: true // Align with previous schemas
    }
}, { timestamps: true });

// Adding individual indexes
subjectSchema.index({ instituteId: 1 }); // Index on instituteId
subjectSchema.index({ classTitle: 1 }); // Index on classTitle
subjectSchema.index({ section: 1 }); // Index on section

// Adding a compound index for classTitle, section, subjectName, and instituteId
subjectSchema.index({ classTitle: 1, section: 1, subjectName: 1, instituteId: 1 }, { unique: true }); // Ensures unique subject per class and institute

// Creating the Subject model
export const Subject = model('Subject', subjectSchema);