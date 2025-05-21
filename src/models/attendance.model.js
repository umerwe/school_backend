import { Schema, model } from "mongoose";

const attendanceSchema = new Schema({
    classId: {
        type: Schema.Types.ObjectId,
        ref: 'Class',
        required: [true, 'Class ID is required']
    },
    teacherId: {
        type: Schema.Types.ObjectId,
        ref: 'Teacher',
        required: [true, 'Teacher ID is required']
    },
    date: {
        type: Date,
        required: [true, 'Date is required']
    },
    students: [{
        studentId: {
            type: Schema.Types.ObjectId,
            ref: 'Student',
            required: true
        },
        status: {
            type: String,
            enum: ['present', 'absent'],
            required: true
        }
    }],
    instituteId: {
        type: Schema.Types.ObjectId,
        ref: 'Admin',
        required: true // Aligned with other schemas
    }
}, { timestamps: true });

// Adding individual indexes
attendanceSchema.index({ instituteId: 1 }); // Index on instituteId
attendanceSchema.index({ classId: 1 }); // Index on classId
attendanceSchema.index({ teacherId: 1 }); // Index on teacherId
attendanceSchema.index({ date: -1 }); // Index on date for sorting by recency
attendanceSchema.index({ "students.studentId": 1 }); // Index on students.studentId for student-specific queries

// Adding a compound index for classId, date, and instituteId
attendanceSchema.index({ classId: 1, date: 1, instituteId: 1 }, { unique: true }); // Ensures unique attendance record per class, date, and institute

// Creating the Attendance model
export const Attendance = model('Attendance', attendanceSchema);