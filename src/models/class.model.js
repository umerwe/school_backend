import { Schema, model } from "mongoose";

const classSchema = new Schema({
    classTitle: {
        type: Number,
        required: true,  // The name of the class (e.g., "10th-A")
        trim: true, // Trim any unnecessary spaces
        enum: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]  // Allowed class names
    },
    section: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        enum: ['A', 'B', 'C', 'D', 'E']
    },
    classTeacher: {
        type: Schema.Types.ObjectId,
        ref: 'Teacher',  // Reference to the Teacher model
        required: true,  // Class must have a classTeacher assigned
    },
    subjects: [{
        type: Schema.Types.ObjectId,
        ref: 'Subject',
        enum: ['Maths', 'English', 'Urdu', 'Science', 'Socialstudies', 'Arts', 'Physics', 'Chemistry', 'Computer', 'Pakstudies', 'Islamiat'],
    }],
    students: [{  // Array of student IDs
        type: Schema.Types.ObjectId,
        ref: 'Student',  // Reference to the Student model
    }],
    instituteId: {
        type: Schema.Types.ObjectId,
        ref: 'Admin',
    }
}, { timestamps: true });


// Creating the Class model
export const Class = model('Class', classSchema);
