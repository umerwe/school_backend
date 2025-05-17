import { Schema, model } from "mongoose";
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const teacherSchema = new Schema({
    name: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    teacherId: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
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
    classTeacherOf: {
        type: Schema.Types.ObjectId,
        ref: 'Class',
        trim: true
    },
    logo: {
        type: String,
        unique: true,
        trim: true
    },
    refreshToken: {
        type: String,
    },
    // Additional Teacher Information
    department: {
        type: String,
        required: true,
        trim: true
    },
    qualifications: [{
        type: String,
        required: true,
        trim: true
    }],
    phoneNumber: {
        type: String,
        required: true,
        trim: true
    },
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
    }
}, { timestamps: true });


teacherSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10)
        return next()
    }
    return next()
})

teacherSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password)
}

teacherSchema.methods.generateAccessToken = function () {
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

teacherSchema.methods.generateRefreshToken = function () {
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

export const Teacher = model('Teacher', teacherSchema)