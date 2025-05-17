import { Schema, model } from 'mongoose';

const reportSchema = new Schema(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    parent: {
      type: Schema.Types.ObjectId,
      ref: 'Parent',
      required: true,
    },
    instituteId: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
    reportType: {
      type: String,
      enum: ['academic', 'behavioral', 'other'],
      default: 'academic',
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'resolved'],
      default: 'pending',
    },
    comments: [
      {
        author: {
          type: String,
          enum: ['admin'], // Only allow 'admin'
          required: true,
        },
        message: {
          type: String,
          required: true,
          trim: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index for faster queries
reportSchema.index({ parent: 1, instituteId: 1, createdAt: -1 });

export const Report = model('Report', reportSchema);