import { Schema, model } from 'mongoose'

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
        required: true
    },
    section: {
        type: String,
        required: true
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
    }
}, {
    timestamps: true
});

export const Marks = model('Marks', marksSchema);
