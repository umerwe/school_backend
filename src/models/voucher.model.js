import { model, Schema } from "mongoose";

const voucherSchema = new Schema({
    student: {
        type: Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    month: {
        type: String,
        required: true,
        enum: ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December']
    },
    year: {
        type: Number,
        required: true,
        min: 2000,
        max: 2100
    },
    dueDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['unpaid', 'paid'],
        default: 'unpaid'
    },
    stripeSessionId: {
        type: String
    },
    instituteId: {
        type: Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    },
    voucherId: {
        type: String,
        unique: true, // Automatically creates a unique index
        required: true
    },
}, {
    timestamps: true
});

// Adding individual indexes
voucherSchema.index({ instituteId: 1 }); // Index on instituteId
voucherSchema.index({ student: 1 }); // Index on student
voucherSchema.index({ month: 1 }); // Index on month
voucherSchema.index({ year: 1 }); // Index on year

// Adding a compound index for student, month, year, and instituteId
voucherSchema.index({ student: 1, month: 1, year: 1, instituteId: 1 }, { unique: true }); // Ensures unique voucher per student, month, and institute

// Creating the Voucher model
export const Voucher = model('Voucher', voucherSchema);