import { Schema, model } from "mongoose";
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const studentSchema = new Schema({
    name: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    rollNumber: {
        type: String,
        required: true,
        unique: true, // Automatically creates a unique index
        lowercase: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true, // Automatically creates a unique index
        trim: true
    },
    password: {
        type: String,
        required: true,
        trim: true
    },
    role: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    logo: {
        type: String,
        trim: true
    },
    refreshToken: {
        type: String,
    },
    // Class Information
    studentClass: {
        type: Number,
        required: true,
        enum: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] // Align with classSchema
    },
    section: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        enum: ['A', 'B', 'C', 'D', 'E']
    },
    admissionYear: {
        type: Number,
        required: true
    },
    // Guardian Information
    guardian: {
        type: Schema.Types.ObjectId,
        ref: 'Parent',
        required: true
    },
    // Additional Information
    dateOfBirth: {
        type: Date,
        required: true
    },
    address: {
        type: String,
        required: true,
        trim: true
    },
    emergencyContact: {
        type: String,
        required: true,
        trim: true
    },
    bloodGroup: {
        type: String,
        trim: true
    },
    nationality: {
        type: String,
        required: true,
        trim: true
    },
    number: {
        type: Number,
        default: 0
    },
    instituteId: {
        type: Schema.Types.ObjectId,
        ref: 'Admin',
        required: true // Align with previous schemas
    }
}, { timestamps: true });


studentSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10)
        return next()
    }
    return next()
})

studentSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password)
}

studentSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            userName: this.userName,
            email: this.email,
            role: this.role
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        })
}

studentSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            role: this.role
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        })
}

// Adding individual indexes
studentSchema.index({ instituteId: 1 }); // Index on instituteId
studentSchema.index({ studentClass: 1 }); // Index on studentClass
studentSchema.index({ section: 1 }); // Index on section
studentSchema.index({ name: 1 }); // Index on name
// rollNumber and email already have unique indexes due to unique: true

// Adding a compound index for studentClass, section, and instituteId
studentSchema.index({ studentClass: 1, section: 1, instituteId: 1 }, { unique: true }); // Ensures unique class-section-institute combination

// Adding a compound index for name and instituteId
studentSchema.index({ name: 1, instituteId: 1 }); // Optimizes searches by name within an institute


export const Student = model('Student', studentSchema)