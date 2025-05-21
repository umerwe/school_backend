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

// Adding individual indexes
reportSchema.index({ instituteId: 1 }); // Index on instituteId
reportSchema.index({ student: 1 }); // Index on student

// Retained compound index for parent, instituteId, and createdAt
reportSchema.index({ parent: 1, instituteId: 1, createdAt: -1 }); // Optimizes queries for parent reports by institute, sorted by recency

// Adding a compound index for student, instituteId, and reportType
reportSchema.index({ student: 1, instituteId: 1, reportType: 1 }); // Optimizes queries for student reports by institute and type

// Creating the Report model
export const Report = model('Report', reportSchema);