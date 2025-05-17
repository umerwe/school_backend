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
        }
}, { timestamps: true });

export const Attendance = model('Attendance', attendanceSchema);