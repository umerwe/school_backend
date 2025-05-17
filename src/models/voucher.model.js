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
        unique: true,
        required: true
    },
}, {
    timestamps: true
});


export const Voucher = model('Voucher', voucherSchema);