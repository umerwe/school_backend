import { Schema, model } from 'mongoose';

const marksSchema = new Schema({
    student: {
        type: Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    subject: {
        type: String,
        required: true,
        enum: ['Maths', 'English', 'Urdu', 'Science', 'Socialstudies', 'Arts', 'Physics', 'Chemistry', 'Computer', 'Pakstudies', 'Islamiat'],
    },
    subjectTeacher: {
        type: Schema.Types.ObjectId,
        ref: 'Teacher',
        required: true
    },
    classTeacher: {
        type: Schema.Types.ObjectId,
        ref: 'Teacher',
        required: true
    },
    classTitle: {
        type: Number,
        required: true,
        enum: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] // Align with classSchema
    },
    section: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        enum: ['A', 'B', 'C', 'D', 'E'] // Align with classSchema
    },
    totalMarks: {
        type: Number,
        required: true
    },
    obtainedMarks: {
        type: Number,
        required: true
    },
    grade: {
        type: String,
        required: true
    },
    assessmentType: {
        type: String,
        enum: [
            'Class Test',
            'Monthly Test',
            'Assignment',
            'Mid Term Exam',
            'Pre-Board Exam',
            'Final Term Exam',
            'Annual Exam'
        ],
        required: true
    },
    instituteId: {
        type: Schema.Types.ObjectId,
        ref: 'Admin',
        required: true // Assuming instituteId is mandatory
    }
}, {
    timestamps: true
});

// Adding individual indexes
marksSchema.index({ classTitle: 1 }); // Index on classTitle
marksSchema.index({ section: 1 }); // Index on section
marksSchema.index({ instituteId: 1 }); // Index on instituteId

// Adding a compound index for classTitle, section, instituteId, student, subject, and assessmentType
marksSchema.index(
    { classTitle: 1, section: 1, instituteId: 1, student: 1, subject: 1, assessmentType: 1 },
    { unique: true }
); // Ensures unique marks entry per student, subject, and assessment type in a class

// Creating the Marks model
export const Marks = model('Marks', marksSchema);