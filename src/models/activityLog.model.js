import {Schema,model} from 'mongoose';

const activityLogSchema = new Schema({
  instituteId: {
    type: Schema.Types.ObjectId,
    ref: 'Institute',
    required: true
  },
  action: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  details: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

export const ActivityLog =  model('ActivityLog', activityLogSchema);