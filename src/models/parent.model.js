import { Schema, model } from 'mongoose';
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const parentSchema = new Schema({
  name: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    unique: true // Automatically creates a unique index
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
  },
  refreshToken: {
    type: String
  },
  childrens: [{
    type: Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  }],
  number: {
    type: Number,
    default: 0
  },
  reportCommentsNumber: {
    type: Number,
    default: 0
  },
  instituteId: {
    type: Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  }
}, { timestamps: true });

parentSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10)
    return next()
  }
  return next()
})

parentSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password)
}

parentSchema.methods.generateAccessToken = function () {
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

parentSchema.methods.generateRefreshToken = function () {
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
parentSchema.index({ instituteId: 1 }); // Index on instituteId
parentSchema.index({ childrens: 1 }); // Index on childrens

// Adding a compound index for instituteId and childrens
parentSchema.index({ instituteId: 1, childrens: 1 }); // Optimizes queries for parents by child and institute

export const Parent = model('Parent', parentSchema);
